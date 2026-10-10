import React, { useEffect, useState } from 'react';
import { sensorService, type KinematicPacket, type SensorStatus } from '../../services/sensorService';

export function SensorBadge() {
  const [status, setStatus] = useState<SensorStatus>(sensorService.getStatus());
  const [lastPacket, setLastPacket] = useState<KinematicPacket | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [wsUrl, setWsUrl] = useState('ws://localhost:8080');

  useEffect(() => {
    const unsubStatus = sensorService.subscribeStatus(setStatus);
    const unsubPacket = sensorService.subscribe(setLastPacket);
    return () => {
      unsubStatus();
      unsubPacket();
    };
  }, []);

  const handleToggleSimulation = () => {
    sensorService.toggleSimulation();
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    sensorService.connect(wsUrl);
    setShowConfig(false);
  };

  return (
    <div className="relative inline-block text-left text-xs select-none">
      <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-lg">
        {/* Connection status indicator */}
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 hover:opacity-80 transition"
          title="Click to configure IMU connection"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'connected'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'simulated'
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-slate-300">
            {status === 'connected'
              ? 'ESP32 IMU'
              : status === 'simulated'
              ? 'Sim IMU'
              : 'No IMU'}
          </span>
        </button>

        {/* Live motion direction & stability chip when active */}
        {status !== 'disconnected' && lastPacket && (
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-widest uppercase transition-colors ${
                lastPacket.dir === 'left'
                  ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
                  : lastPacket.dir === 'right'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                  : lastPacket.dir === 'hold'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                  : 'text-slate-400'
              }`}
            >
              {lastPacket.dir === 'idle' ? 'Steady' : lastPacket.dir}
            </span>

            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400" title="Motor Hold Stability">
              <span>Stab:</span>
              <span className={`font-bold ${lastPacket.stability >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {lastPacket.stability}%
              </span>
            </div>
          </div>
        )}

        {/* Quick Simulation Toggle */}
        <button
          onClick={handleToggleSimulation}
          className={`ml-1 text-[10px] px-2 py-0.5 rounded-full border transition font-mono ${
            status === 'simulated'
              ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/30'
              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle browser kinematic motion simulator"
        >
          {status === 'simulated' ? 'Stop Sim' : 'Sim IMU'}
        </button>
      </div>

      {/* Popover Configuration Modal */}
      {showConfig && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl p-4 shadow-2xl z-50 animate-fade-up">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-display text-xs font-bold uppercase tracking-wider text-white">
              Kinematic Sensor Setup
            </h4>
            <button
              onClick={() => setShowConfig(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleConnect} className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                WebSocket Bridge / ESP32 IP
              </label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="ws://192.168.4.1:8080"
                className="w-full bg-black/40 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-bold py-1.5 px-3 rounded text-xs transition"
              >
                Connect Hardware
              </button>
              {status === 'connected' && (
                <button
                  type="button"
                  onClick={() => sensorService.disconnect()}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-300 py-1.5 px-2.5 rounded text-xs transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>

          <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 space-y-1.5">
            <p className="text-slate-300 font-medium">Hardware MVP Status:</p>
            <p>• Connect ESP32 + MPU6050 via Wi-Fi WebSocket.</p>
            <p>• Or click &quot;Sim IMU&quot; to test kinematic gestures and stability metrics directly.</p>
          </div>
        </div>
      )}
    </div>
  );
}
