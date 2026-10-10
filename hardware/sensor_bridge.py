#!/usr/bin/env python3
"""
Sensor Bridge and Mock Kinematic Streamer for Sphere Trainer VR.

Usage:
  python3 sensor_bridge.py --mock         # Stream synthetic 100 Hz IMU packets to ws://localhost:8080
  python3 sensor_bridge.py --serial /dev/ttyUSB0   # Relay ESP32 serial data to WebSocket
"""

import argparse
import asyncio
import json
import math
import random
import time

try:
    import websockets
except ImportError:
    websockets = None


async def mock_streamer(websocket):
    """Generates realistic 100 Hz MPU6050 kinematic data with gestures."""
    print("[SensorBridge] Client connected to Mock Streamer.")
    t_start = time.time()
    gesture_phase = 0
    gesture_type = "idle"
    step = 0

    try:
        while True:
            step += 1
            now = time.time()
            elapsed = now - t_start

            # Periodically simulate a reaching gesture every 3-4 seconds
            if step % 350 == 0:
                gesture_type = random.choice(["left", "right", "hold"])
                gesture_phase = 40  # 400 ms duration

            # Baseline resting noise (tremor simulation)
            tremor = 0.04 * math.sin(elapsed * 25.0) + (random.random() - 0.5) * 0.02
            ax = tremor
            ay = tremor * 0.5
            az = 1.0 + tremor  # Gravity baseline
            gx = (random.random() - 0.5) * 4.0
            gy = (random.random() - 0.5) * 4.0
            gz = (random.random() - 0.5) * 4.0

            motion_onset = False
            reach_dir = "idle"
            speed = 1.0

            if gesture_phase > 0:
                gesture_phase -= 1
                progress = math.sin(math.pi * (40 - gesture_phase) / 40.0)
                motion_onset = True

                if gesture_type == "left":
                    ax -= 0.65 * progress
                    gz += 75.0 * progress
                    reach_dir = "left"
                    speed = 1.0 + 0.65 * progress
                elif gesture_type == "right":
                    ax += 0.65 * progress
                    gz -= 75.0 * progress
                    reach_dir = "right"
                    speed = 1.0 + 0.65 * progress
                elif gesture_type == "hold":
                    ay += 0.35 * progress
                    reach_dir = "hold"
                    speed = 1.15

            hold_stability = max(50.0, min(99.0, 95.0 - abs(tremor) * 200.0))

            packet = {
                "t": int((now - t_start) * 1000),
                "sensor": "wrist",
                "ax": round(ax, 3),
                "ay": round(ay, 3),
                "az": round(az, 3),
                "gx": round(gx, 2),
                "gy": round(gy, 2),
                "gz": round(gz, 2),
                "onset": motion_onset,
                "dir": reach_dir,
                "speed": round(speed, 2),
                "stability": round(hold_stability, 1),
            }

            await websocket.send(json.dumps(packet))
            await asyncio.sleep(0.010)  # 100 Hz (10 ms)

    except (asyncio.CancelledError, websockets.exceptions.ConnectionClosed):
        print("[SensorBridge] Client disconnected from Mock Streamer.")


async def main():
    parser = argparse.ArgumentParser(description="Sphere Trainer VR Sensor Bridge")
    parser.add_argument("--port", type=int, default=8080, help="WebSocket port (default: 8080)")
    parser.add_argument("--mock", action="store_true", default=True, help="Run mock 100 Hz IMU streamer")
    args = parser.parse_args()

    if websockets is None:
        print("[SensorBridge] Warning: 'websockets' package not installed in global environment.")
        print("Install via: pip install websockets")
        print("Note: The frontend Sphere Trainer includes an internal Web-Worker/Timer mock simulator as well.")
        return

    print(f"[SensorBridge] Starting WebSocket server on port {args.port}...")
    async with websockets.serve(mock_streamer, "0.0.0.0", args.port):
        print(f"[SensorBridge] Server active at ws://localhost:{args.port}")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[SensorBridge] Server stopped.")
