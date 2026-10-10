import { useGameStore } from '../../store/useGameStore';
import { useMiniGameStore } from '../../store/useMiniGameStore';
import ReflexGate     from '../games/ReflexGate';
import GeometricDraw  from '../games/GeometricDraw';
import { MODES } from './modes';

export function MiniGameRouter() {
  const mode          = useGameStore((s) => s.mode);
  const endSession    = useGameStore((s) => s.endSession);
  const paused        = useGameStore((s) => s.paused);
  const pauseSession   = useGameStore((s) => s.pauseSession);
  const resumeSession  = useGameStore((s) => s.resumeSession);
  const miniScore  = useMiniGameStore((s) => s.score);

  return (
    <>
      {/* Top bar shared across mini-games */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3 pointer-events-none">
        <div className="glass px-4 py-2.5">
          <span className="font-display text-xs tracking-widest text-slate-300">
            {MODES.find(m => m.id === mode)?.icon} {MODES.find(m => m.id === mode)?.label}
          </span>
        </div>
        <div className="glass px-4 py-2.5">
          <span className="font-mono font-bold text-sm text-slate-200">{miniScore} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="pointer-events-auto glass px-4 py-2.5 text-slate-400 hover:text-white transition-all text-xs font-display tracking-widest uppercase"
            onClick={() => (paused ? resumeSession() : pauseSession())}
            aria-label={paused ? 'Resume session' : 'Pause session'}
          >
            {paused ? '▶ Resume' : '❚❚ Pause'}
          </button>
          <button
            className="pointer-events-auto glass px-4 py-2.5 text-slate-400 hover:text-white transition-all text-xs font-display tracking-widest uppercase"
            onClick={endSession}
          >
            ■ Stop
          </button>
        </div>
      </div>

      {mode === 'reflex-gate'      && <ReflexGate />}
      {mode === 'geometric-draw'   && <GeometricDraw />}

      {/* Shared paused overlay */}
      {paused && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
          style={{ background: 'rgba(3,4,10,0.82)' }}
        >
          <div className="glass-panel p-8 text-center animate-fade-up">
            <p className="font-display text-xl font-bold uppercase tracking-widest text-white mb-2">Paused</p>
            <p className="text-[12px] text-slate-400 mb-6">Take your time. Nothing is running.</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-primary" onClick={resumeSession}>Resume</button>
              <button
                className="btn-primary"
                style={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.05)' }}
                onClick={endSession}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
