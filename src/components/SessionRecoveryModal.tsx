import React from 'react';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';
import { useSessionLifecycle } from '../store/useSessionLifecycle';
import { useGameStore } from '../store/useGameStore';
import { useNeuroPlayStore } from '../neuroplay/store/useNeuroPlayStore';
import { useShellStore } from '../store/useShellStore';
import type { GameMode } from '../types';
import type { GameId } from '../neuroplay/types';

export const SessionRecoveryModal: React.FC = () => {
  const recoverableSession = useSessionLifecycle((s) => s.recoverableSession);
  const restoreSession = useSessionLifecycle((s) => s.restoreSession);
  const dismissRecovery = useSessionLifecycle((s) => s.dismissRecovery);
  const setActiveApp = useShellStore((s) => s.setActiveApp);

  if (!recoverableSession) return null;

  const handleResume = () => {
    const restored = restoreSession();
    if (!restored) return;

    if (restored.suite === 'neuro-adapt') {
      setActiveApp('neuro-adapt');
      useGameStore.getState().setMode(restored.gameId as GameMode);
      useGameStore.getState().resumeSession();
    } else {
      setActiveApp('neuroplay');
      useNeuroPlayStore.getState().openGame(restored.gameId as GameId);
    }
  };

  const handleDismiss = () => {
    dismissRecovery();
  };

  const gameTitle = recoverableSession.gameId
    .split('-')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel max-w-md w-full p-6 text-center space-y-6 shadow-2xl border border-slate-700/60 rounded-2xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <AlertCircle size={28} />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold font-display text-white tracking-wide">
            Unfinished Session Detected
          </h3>
          <p className="text-sm text-slate-300">
            We found an active training session in progress for{' '}
            <span className="font-semibold text-cyan-400">{gameTitle}</span> from before the reload.
          </p>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-left text-xs text-slate-400 space-y-1 font-mono">
          <div className="flex justify-between">
            <span>Suite:</span>
            <span className="text-slate-200 capitalize">{recoverableSession.suite.replace('-', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span>Score Saved:</span>
            <span className="text-slate-200">{recoverableSession.rawScore} pts</span>
          </div>
          <div className="flex justify-between">
            <span>Trials Completed:</span>
            <span className="text-slate-200">{recoverableSession.completedTrialsCount}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleResume}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm font-display tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Play size={16} /> Resume Session
          </button>
          <button
            onClick={handleDismiss}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all border border-slate-700"
          >
            <RotateCcw size={16} /> Start New
          </button>
        </div>
      </div>
    </div>
  );
};
