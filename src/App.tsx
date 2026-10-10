import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import HUD from './components/HUD';
import Scene from './components/Scene';
import { useSettingsStore } from './store/useSettingsStore';
import { useGameStore } from './store/useGameStore';
import { bootstrapFromSimulation } from './ai/simulate';
import { useShellStore } from './store/useShellStore';
import { NeuroPlayApp } from './neuroplay/NeuroPlayApp';
import { useSessionLifecycle } from './store/useSessionLifecycle';
import { SessionRecoveryModal } from './components/SessionRecoveryModal';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const textScale     = useSettingsStore((s) => s.textScale);
  const highContrast  = useSettingsStore((s) => s.highContrast);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const clarityMode   = useSettingsStore((s) => s.clarityMode);
  const activeApp     = useShellStore((s) => s.activeApp);
  const setActiveApp  = useShellStore((s) => s.setActiveApp);
  const gamePhase     = useGameStore((s) => s.phase);

  // Simulation-First Strategy: warm-start RL controller Q-table
  useEffect(() => { bootstrapFromSimulation(); }, []);

  // Check for unfinished session recovery on initial load
  useEffect(() => {
    useSessionLifecycle.getState().checkRecoverableSession();
  }, []);

  // Global Page Visibility API Listener — Auto pause on tab switch / background window
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab went to background
        const phase = useGameStore.getState().phase;
        if (phase === 'playing') {
          useGameStore.getState().pauseSession();
          useSessionLifecycle.getState().pauseSession('background');
        }
      } else {
        // Tab restored to foreground — timestamp reconciliation
        const active = useSessionLifecycle.getState().activeSession;
        if (active && active.state === 'BACKGROUND') {
          // Keep paused state so user can resume safely without timer penalty
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <ErrorBoundary>
      <SessionRecoveryModal />
      {activeApp === 'neuroplay' ? (
        <NeuroPlayApp onExit={() => setActiveApp('neuro-adapt')} />
      ) : (
        <main className="relative w-screen h-screen overflow-hidden bg-dark-bg cursor-crosshair grid-bg select-none">
          <Scene />
          <div
            className="absolute inset-0"
            data-text-scale={textScale}
            data-contrast={highContrast ? 'high' : 'normal'}
            data-motion={reducedMotion ? 'reduced' : 'normal'}
            data-clarity={clarityMode ? 'on' : 'off'}
          >
            <HUD />
          </div>

          {gamePhase === 'menu' && (
            <div className="absolute top-5 left-5 z-30 flex items-center gap-3">
              <button
                className="glass px-4 py-2.5 flex items-center gap-2
                           text-slate-300 hover:text-white hover:border-cyan-500/40 transition-all
                           text-xs font-display tracking-widest uppercase pointer-events-auto rounded-xl shadow-lg"
                onClick={() => setActiveApp('neuroplay')}
              >
                <Sparkles size={14} className="text-cyan-400" /> Open NeuroPlay Hub
              </button>
            </div>
          )}
        </main>
      )}
    </ErrorBoundary>
  );
}
