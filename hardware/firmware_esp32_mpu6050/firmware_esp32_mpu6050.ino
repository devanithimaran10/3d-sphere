/**
 * Adaptive Cognitive Therapy Using VR - Kinematic Acquisition Node
 * 
 * Hardware:
 *   - ESP32 Microcontroller (NodeMCU-32S / ESP32 DevKit v1)
 *   - InvenSense MPU6050 6-DOF IMU (Wrist mounted)
 *   - Optional second MPU6050 on upper arm (AD0 pin pulled HIGH to 3.3V -> address 0x69)
 * 
 * Sampling rate: 100 Hz (10 ms period)
 * Communication: Local WebSocket (ws://<ESP32_IP>:8080) broadcasting JSON telemetry
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include <ArduinoJson.h>

// ─── Wi-Fi & WebSocket Configuration ─────────────────────────
const char* WIFI_SSID     = "SphereTrainer_AP";
const char* WIFI_PASSWORD = "neuroplasticity";
const int   WS_PORT       = 8080;

WebSocketsServer webSocket = WebSocketsServer(WS_PORT);

// ─── MPU6050 I2C Configuration ────────────────────────────────
#define MPU_WRIST_ADDR  0x68
#define MPU_ARM_ADDR    0x69 // Optional secondary sensor (AD0 tied to 3.3V)
#define SDA_PIN         21
#define SCL_PIN         22

// MPU6050 Registers
#define REG_PWR_MGMT_1   0x6B
#define REG_CONFIG       0x1A
#define REG_GYRO_CONFIG  0x1B
#define REG_ACCEL_CONFIG 0x1C
#define REG_ACCEL_XOUT_H 0x3B

// Sensitivity scale factors for +/- 4g and +/- 1000 deg/s
const float ACCEL_SCALE = 8192.0f; // LSB / g
const float GYRO_SCALE  = 32.8f;   // LSB / (deg/s)

// ─── Kinematic State Variables ────────────────────────────────
unsigned long lastSampleTimeMs = 0;
const unsigned long SAMPLE_INTERVAL_MS = 10; // 100 Hz

// Baseline offsets
float ax_offset = 0, ay_offset = 0, az_offset = 0;
float gx_offset = 0, gy_offset = 0, gz_offset = 0;

// Movement detection buffers
float accelHistory[10] = {0};
int historyIndex = 0;
bool motionOnset = false;
String reachDirection = "idle";
float reachSpeed = 0.0f;
float holdStability = 100.0f;

// Secondary sensor presence
bool secondarySensorPresent = false;

// ─── Helper Functions ─────────────────────────────────────────

void writeMPURegister(uint8_t addr, uint8_t reg, uint8_t data) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(data);
  Wire.endTransmission(true);
}

void initMPU6050(uint8_t addr) {
  // Wake up device
  writeMPURegister(addr, REG_PWR_MGMT_1, 0x00);
  delay(10);

  // Set DLPF (Digital Low-Pass Filter) to 42 Hz bandwidth (mode 3)
  writeMPURegister(addr, REG_CONFIG, 0x03);

  // Set Gyro full scale: +/- 1000 deg/s (FS_SEL = 2 -> 0x10)
  writeMPURegister(addr, REG_GYRO_CONFIG, 0x10);

  // Set Accel full scale: +/- 4g (AFS_SEL = 1 -> 0x08)
  writeMPURegister(addr, REG_ACCEL_CONFIG, 0x08);
}

bool readRawKinematics(uint8_t addr, int16_t &ax, int16_t &ay, int16_t &az,
                       int16_t &gx, int16_t &gy, int16_t &gz) {
  Wire.beginTransmission(addr);
  Wire.write(REG_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;

  Wire.requestFrom(addr, (uint8_t)14, (uint8_t)true);
  if (Wire.available() < 14) return false;

  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read(); // Skip internal temperature
  gx = (Wire.read() << 8) | Wire.read();
  gy = (Wire.read() << 8) | Wire.read();
  gz = (Wire.read() << 8) | Wire.read();
  return true;
}

void calibrateSensors() {
  const int CALIB_SAMPLES = 200;
  long sax = 0, say = 0, saz = 0;
  long sgx = 0, sgy = 0, sgz = 0;

  for (int i = 0; i < CALIB_SAMPLES; i++) {
    int16_t raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz;
    if (readRawKinematics(MPU_WRIST_ADDR, raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz)) {
      sax += raw_ax;
      say += raw_ay;
      saz += raw_az;
      sgx += raw_gx;
      sgy += raw_gy;
      sgz += raw_gz;
    }
    delay(5);
  }

  ax_offset = (sax / (float)CALIB_SAMPLES) / ACCEL_SCALE;
  ay_offset = (say / (float)CALIB_SAMPLES) / ACCEL_SCALE;
  az_offset = ((saz / (float)CALIB_SAMPLES) / ACCEL_SCALE) - 1.0f; // Subtract 1g static gravity
  gx_offset = (sgx / (float)CALIB_SAMPLES) / GYRO_SCALE;
  gy_offset = (sgy / (float)CALIB_SAMPLES) / GYRO_SCALE;
  gz_offset = (sgz / (float)CALIB_SAMPLES) / GYRO_SCALE;
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_CONNECTED) {
    Serial.printf("[%u] Web client connected\n", num);
  } else if (type == WStype_DISCONNECTED) {
    Serial.printf("[%u] Web client disconnected\n", num);
  }
}

// ─── Setup & Main Loop ────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[ESP32] Initializing Adaptive VR Kinematic Acquisition...");

  // I2C Fast Mode (400 kHz)
  Wire.begin(SDA_PIN, SCL_PIN, 400000);

  // Initialize Primary (Wrist) IMU
  initMPU6050(MPU_WRIST_ADDR);
  Serial.println("[ESP32] Primary MPU6050 (Wrist) initialized.");

  // Probe Secondary (Upper Arm) IMU
  Wire.beginTransmission(MPU_ARM_ADDR);
  if (Wire.endTransmission() == 0) {
    initMPU6050(MPU_ARM_ADDR);
    secondarySensorPresent = true;
    Serial.println("[ESP32] Secondary MPU6050 (Upper Arm) detected.");
  } else {
    Serial.println("[ESP32] Single sensor mode (Wrist only).");
  }

  // Sensor calibration
  Serial.println("[ESP32] Calibrating resting offsets (hold steady)...");
  calibrateSensors();
  Serial.println("[ESP32] Calibration complete.");

  // Wi-Fi Setup: Configure as Access Point or Client Station
  WiFi.softAP(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("[ESP32] Wi-Fi AP '%s' ready. IP: %s\n", WIFI_SSID, WiFi.softAPIP().toString().c_str());

  // WebSocket Server setup
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.printf("[ESP32] WebSocket server active on port %d\n", WS_PORT);
}

void loop() {
  webSocket.loop();

  unsigned long currentMs = millis();
  if (currentMs - lastSampleTimeMs >= SAMPLE_INTERVAL_MS) {
    lastSampleTimeMs = currentMs;

    int16_t raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz;
    if (!readRawKinematics(MPU_WRIST_ADDR, raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz)) {
      return;
    }

    // Convert to engineering units (g, deg/s)
    float ax = (raw_ax / ACCEL_SCALE) - ax_offset;
    float ay = (raw_ay / ACCEL_SCALE) - ay_offset;
    float az = (raw_az / ACCEL_SCALE) - az_offset;
    float gx = (raw_gx / GYRO_SCALE)  - gx_offset;
    float gy = (raw_gy / GYRO_SCALE)  - gy_offset;
    float gz = (raw_gz / GYRO_SCALE)  - gz_offset;

    // Compute resultant acceleration magnitude
    float aMag = sqrt(ax * ax + ay * ay + az * az);

    // Update circular acceleration history
    accelHistory[historyIndex] = aMag;
    historyIndex = (historyIndex + 1) % 10;

    // Compute short-window variance for hold stability
    float meanMag = 0;
    for (int i = 0; i < 10; i++) meanMag += accelHistory[i];
    meanMag /= 10.0f;
    float varMag = 0;
    for (int i = 0; i < 10; i++) varMag += (accelHistory[i] - meanMag) * (accelHistory[i] - meanMag);
    varMag /= 10.0f;
    holdStability = max(0.0f, min(100.0f, (1.0f - (varMag * 8.0f)) * 100.0f));

    // Detect Motion Onset (Dynamic jerk/threshold)
    motionOnset = (aMag > 1.25f);

    // Classify Reach Direction from lateral acceleration + yaw angular rate
    if (ax < -0.35f || gz > 45.0f) {
      reachDirection = "left";
    } else if (ax > 0.35f || gz < -45.0f) {
      reachDirection = "right";
    } else if (aMag > 1.15f && abs(ax) <= 0.35f) {
      reachDirection = "hold";
    } else {
      reachDirection = "idle";
    }

    reachSpeed = aMag;

    // Broadcast JSON payload if clients are connected
    if (webSocket.connectedClients() > 0) {
      StaticJsonDocument<256> doc;
      doc["t"]         = currentMs;
      doc["sensor"]    = "wrist";
      doc["ax"]        = serialized(String(ax, 3));
      doc["ay"]        = serialized(String(ay, 3));
      doc["az"]        = serialized(String(az, 3));
      doc["gx"]        = serialized(String(gx, 2));
      doc["gy"]        = serialized(String(gy, 2));
      doc["gz"]        = serialized(String(gz, 2));
      doc["onset"]     = motionOnset;
      doc["dir"]       = reachDirection;
      doc["speed"]     = serialized(String(reachSpeed, 2));
      doc["stability"] = serialized(String(holdStability, 1));

      String jsonOut;
      serializeJson(doc, jsonOut);
      webSocket.broadcastTXT(jsonOut);
    }
  }
}
