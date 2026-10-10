/**
 * Sensor Acquisition & Real-Time Kinematic Streaming Service
 * 
 * Manages WebSocket communication with the ESP32 / MPU6050 hardware node
 * or local sensor bridge. Features an internal high-fidelity mock generator
 * for fully offline, hardware-free testing and demonstration.
 */

import { useGameStore } from '../store/useGameStore';
import type { SphereAction } from '../types';

export interface KinematicPacket {
  t: number;
  sensor: string;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  onset: boolean;
  dir: 'idle' | 'left' | 'right' | 'hold';
  speed: number;
  stability: number;
}

export type SensorStatus = 'disconnected' | 'connected' | 'simulated';

type Listener = (packet: KinematicPacket) => void;
type StatusListener = (status: SensorStatus) => void;

class SensorService {
  private socket: WebSocket | null = null;
  private listeners: Set<Listener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private status: SensorStatus = 'disconnected';

  // 100 Hz rolling buffer: 200 samples = 2.0 seconds of kinematics
  private windowBuffer: KinematicPacket[] = [];
  private readonly WINDOW_SIZE = 200;

  // Simulator interval
  private simTimer: ReturnType<typeof setInterval> | null = null;
  private simStep = 0;

  // Gesture dispatch state
  private lastDispatchedDir: string = 'idle';
  private lastDispatchedAt = 0;

  constructor() {
    // Check if simulation was previously activated in localStorage
    const savedSim = localStorage.getItem('sphere_trainer_sim_imu');
    if (savedSim === 'true') {
      this.startSimulation();
    }
  }

  public getStatus(): SensorStatus {
    return this.status;
  }

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public subscribeStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  private setStatus(s: SensorStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  public connect(url: string = 'ws://localhost:8080') {
    if (this.status === 'simulated') {
      this.stopSimulation();
    }

    if (this.socket) {
      this.socket.close();
    }

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.setStatus('connected');
      };

      this.socket.onmessage = (event) => {
        try {
          const packet: KinematicPacket = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch {
          // Ignore malformed packets
        }
      };

      this.socket.onerror = () => {
        if (this.status !== 'simulated') {
          this.setStatus('disconnected');
        }
      };

      this.socket.onclose = () => {
        if (this.status !== 'simulated') {
          this.setStatus('disconnected');
        }
        this.socket = null;
      };
    } catch {
      this.setStatus('disconnected');
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.stopSimulation();
    this.setStatus('disconnected');
  }

  public toggleSimulation(): boolean {
    if (this.status === 'simulated') {
      this.stopSimulation();
      this.setStatus('disconnected');
      localStorage.setItem('sphere_trainer_sim_imu', 'false');
      return false;
    } else {
      this.startSimulation();
      localStorage.setItem('sphere_trainer_sim_imu', 'true');
      return true;
    }
  }

  public startSimulation() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.simTimer) clearInterval(this.simTimer);
    this.setStatus('simulated');

    let gesturePhase = 0;
    let gestureType: 'left' | 'right' | 'hold' = 'left';

    this.simTimer = setInterval(() => {
      this.simStep++;
      const now = Date.now();
      const elapsed = this.simStep * 0.01;

      // Periodically trigger a reach gesture every 3.5 seconds
      if (this.simStep % 350 === 0) {
        const choices: ('left' | 'right' | 'hold')[] = ['left', 'right', 'hold'];
        gestureType = choices[Math.floor(Math.random() * choices.length)];
        gesturePhase = 35; // 350 ms duration
      }

      const tremor = 0.03 * Math.sin(elapsed * 24.0) + (Math.random() - 0.5) * 0.015;
      let ax = tremor;
      let ay = tremor * 0.5;
      const az = 1.0 + tremor;
      const gx = (Math.random() - 0.5) * 3;
      const gy = (Math.random() - 0.5) * 3;
      let gz = (Math.random() - 0.5) * 3;

      let motionOnset = false;
      let reachDir: 'idle' | 'left' | 'right' | 'hold' = 'idle';
      let speed = 1.0;

      if (gesturePhase > 0) {
        gesturePhase--;
        const progress = Math.sin((Math.PI * (35 - gesturePhase)) / 35);
        motionOnset = true;

        if (gestureType === 'left') {
          ax -= 0.65 * progress;
          gz += 65.0 * progress;
          reachDir = 'left';
          speed = 1.0 + 0.65 * progress;
        } else if (gestureType === 'right') {
          ax += 0.65 * progress;
          gz -= 65.0 * progress;
          reachDir = 'right';
          speed = 1.0 + 0.65 * progress;
        } else if (gestureType === 'hold') {
          ay += 0.35 * progress;
          reachDir = 'hold';
          speed = 1.15;
        }
      }

      const stability = Math.max(50, Math.min(99, 94 - Math.abs(tremor) * 220));

      const packet: KinematicPacket = {
        t: now,
        sensor: 'wrist',
        ax: Math.round(ax * 1000) / 1000,
        ay: Math.round(ay * 1000) / 1000,
        az: Math.round(az * 1000) / 1000,
        gx: Math.round(gx * 10) / 10,
        gy: Math.round(gy * 10) / 10,
        gz: Math.round(gz * 10) / 10,
        onset: motionOnset,
        dir: reachDir,
        speed: Math.round(speed * 100) / 100,
        stability: Math.round(stability * 10) / 10,
      };

      this.handlePacket(packet);
    }, 10); // 100 Hz
  }

  public stopSimulation() {
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  private handlePacket(packet: KinematicPacket) {
    // Update temporal sliding window
    this.windowBuffer.push(packet);
    if (this.windowBuffer.length > this.WINDOW_SIZE) {
      this.windowBuffer.shift();
    }

    // Broadcast to UI subscribers
    this.listeners.forEach((fn) => fn(packet));

    // Handle gesture-to-game input trigger with 650 ms debounce
    const now = Date.now();
    if (
      packet.dir !== 'idle' &&
      (packet.dir !== this.lastDispatchedDir || now - this.lastDispatchedAt > 650)
    ) {
      this.lastDispatchedDir = packet.dir;
      this.lastDispatchedAt = now;
      this.dispatchGameInput(packet.dir);
    } else if (packet.dir === 'idle' && now - this.lastDispatchedAt > 500) {
      this.lastDispatchedDir = 'idle';
    }
  }

  private dispatchGameInput(dir: 'left' | 'right' | 'hold') {
    const store = useGameStore.getState();
    if (store.phase !== 'playing' || store.paused || store.activeSpheres.length === 0) {
      return;
    }

    // Find the oldest active sphere that matches or needs action
    const target = store.activeSpheres[0];
    if (!target) return;

    const action: SphereAction = dir;
    const reactionTime = Math.max(120, Date.now() - target.spawnTime);

    store.registerInput({
      sphereId: target.id,
      action,
      driftMagnitude: Math.abs(100 - (this.windowBuffer[this.windowBuffer.length - 1]?.stability ?? 90)) / 40,
      reactionTime,
    });
  }

  /**
   * Retrieves the current 2-second temporal kinematic tensor (200 x 6)
   * formatted for CNN-GRU inference.
   */
  public getLatestWindowTensor(): number[][] {
    return this.windowBuffer.map((p) => [
      p.ax, p.ay, p.az,
      p.gx, p.gy, p.gz,
    ]);
  }
}

export const sensorService = new SensorService();
