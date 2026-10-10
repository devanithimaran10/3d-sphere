import React from 'react';
import { Pause, Play, Square, Clock, Target, Award, Activity } from 'lucide-react';
import { COGNITIVE_DOMAINS, type CognitiveDomainKey } from '../ai/cognitiveScoringEngine';

export interface EssentialMetrics {
  timeRemainingSeconds?: number | null;
  score?: number | null;
  accuracyPercent?: number | null;
  completedTrials?: number | null;
  totalTrials?: number | null;
}

interface StandardGameFrameProps {
  title: string;
  domainKey: CognitiveDomainKey;
  instruction: string;
  metrics: EssentialMetrics;
  isPaused: boolean;
  onPauseToggle?: () => void;
  onEndSession?: () => void;
  children: React.ReactNode;
}

export const StandardGameFrame: React.FC<StandardGameFrameProps> = ({
  title,
  domainKey,
  instruction,
  metrics,
  isPaused,
  onPauseToggle,
  onEndSession,
  children,
}) => {
  const domain = COGNITIVE_DOMAINS[domainKey];

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-4 md:p-6 overflow-hidden pointer-events-none select-none">
      {/* Top Header Bar */}
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-4 glass-panel px-5 py-3 pointer-events-auto border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner"
            style={{ backgroundColor: `${domain.color}15`, borderColor: `${domain.color}40`, borderStyle: 'solid', borderWidth: '1px' }}
          >
            <span>{domain.icon}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm md:text-base font-bold text-white tracking-wide">
                {title}
              </h2>
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${domain.color}20`, color: domain.color }}
              >
                {domain.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans font-medium line-clamp-1">
              {instruction}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onPauseToggle && (
            <button
              onClick={onPauseToggle}
              className="px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-all shadow-sm"
              aria-label={isPaused ? 'Resume Session' : 'Pause Session'}
            >
              {isPaused ? <Play size={14} className="text-cyan-400 fill-cyan-400" /> : <Pause size={14} className="text-amber-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}
          {onEndSession && (
            <button
              onClick={onEndSession}
              className="px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-medium flex items-center gap-1.5 border border-red-800/40 transition-all shadow-sm"
              aria-label="End Session"
            >
              <Square size={14} className="fill-red-400 text-red-400" />
              <span>End</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Existing Gameplay Area */}
      <main className="relative z-10 flex-1 my-3 flex items-center justify-center w-full h-full pointer-events-auto">
        {children}
      </main>

      {/* Bottom Live Essential Metrics Bar */}
      <footer className="relative z-30 flex flex-wrap items-center justify-center sm:justify-between gap-4 glass-panel px-5 py-3 pointer-events-auto border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-6">
          {metrics.timeRemainingSeconds !== undefined && metrics.timeRemainingSeconds !== null && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-cyan-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Time</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {Math.floor(metrics.timeRemainingSeconds / 60)}:
                  {Math.floor(metrics.timeRemainingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}

          {metrics.score !== undefined && metrics.score !== null && (
            <div className="flex items-center gap-2">
              <Award size={16} className="text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Score</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {metrics.score}
                </span>
              </div>
            </div>
          )}

          {metrics.accuracyPercent !== undefined && metrics.accuracyPercent !== null && (
            <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Accuracy</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {Math.round(metrics.accuracyPercent)}%
                </span>
              </div>
            </div>
          )}

          {metrics.completedTrials !== undefined && metrics.completedTrials !== null && (
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-purple-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Progress</span>
                <span className="text-sm font-bold font-mono text-slate-100">
                  {metrics.completedTrials} {metrics.totalTrials ? `/ ${metrics.totalTrials}` : 'trials'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] font-sans text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Session Monitored</span>
        </div>
      </footer>
    </div>
  );
};
