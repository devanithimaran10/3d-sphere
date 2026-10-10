import React from 'react';
import { RotateCcw, LayoutDashboard, TrendingUp, Award, Target, Clock, Zap, CheckCircle2 } from 'lucide-react';
import { COGNITIVE_DOMAINS, type CognitiveDomainKey } from '../ai/cognitiveScoringEngine';

export interface ResultsData {
  gameTitle: string;
  domainKey: CognitiveDomainKey;
  rawScore?: number | null;
  standardizedScore: number; // 0-100
  accuracyPercent?: number | null;
  avgReactionTimeMs?: number | null;
  durationSeconds?: number | null;
  totalTrials?: number | null;
  correctTrials?: number | null;
  previousBestStandardizedScore?: number | null;
}

interface StandardResultsScreenProps {
  data: ResultsData;
  onReplay: () => void;
  onReturnToDashboard: () => void;
}

export const StandardResultsScreen: React.FC<StandardResultsScreenProps> = ({
  data,
  onReplay,
  onReturnToDashboard,
}) => {
  const domain = COGNITIVE_DOMAINS[data.domainKey];

  // Determine trend vs previous best
  let improvementText = 'First session in this mode recorded';
  let isImprovement = false;

  if (data.previousBestStandardizedScore !== undefined && data.previousBestStandardizedScore !== null) {
    const diff = data.standardizedScore - data.previousBestStandardizedScore;
    if (diff > 0) {
      improvementText = `+${diff} pts improvement over personal average`;
      isImprovement = true;
    } else if (diff === 0) {
      improvementText = 'Matched personal average score';
    } else {
      improvementText = `${diff} pts relative to personal average`;
    }
  }

  // Reaction performance rating
  let reactionRating = 'N/A';
  if (data.avgReactionTimeMs) {
    if (data.avgReactionTimeMs < 350) reactionRating = 'Exceptional (<350ms)';
    else if (data.avgReactionTimeMs < 500) reactionRating = 'Strong (<500ms)';
    else if (data.avgReactionTimeMs < 750) reactionRating = 'Optimal (<750ms)';
    else reactionRating = 'Steady (>750ms)';
  }

  return (
    <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 md:p-8 bg-slate-950 overflow-y-auto z-40">
      <div className="glass-panel max-w-2xl w-full p-6 md:p-10 space-y-8 animate-fade-up border-slate-800 shadow-2xl rounded-3xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <CheckCircle2 size={14} /> Session Completed Successfully
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-white tracking-wide">
            {data.gameTitle}
          </h1>
          <p className="text-xs md:text-sm text-slate-400 flex items-center justify-center gap-2">
            <span>Domain:</span>
            <span className="font-semibold text-slate-200" style={{ color: domain.color }}>
              {domain.icon} {domain.label}
            </span>
          </p>
        </div>

        {/* Primary Standardized Score Card */}
        <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
              Standardized Cognitive Score
            </span>
            <div className="flex items-baseline gap-2 justify-center md:justify-start">
              <span className="text-5xl font-black font-display text-white text-glow-sm">
                {data.standardizedScore}
              </span>
              <span className="text-xl font-bold text-slate-500 font-mono">/ 100</span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-1">
              <TrendingUp size={14} className={isImprovement ? 'text-emerald-400' : 'text-slate-400'} />
              <span>{improvementText}</span>
            </p>
          </div>

          {data.rawScore !== undefined && data.rawScore !== null && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[140px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Raw Game Points</span>
              <p className="text-2xl font-bold font-mono text-amber-400">{data.rawScore}</p>
            </div>
          )}
        </div>

        {/* Detailed Essential Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {data.accuracyPercent !== undefined && data.accuracyPercent !== null && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase">
                <Target size={14} /> Accuracy
              </div>
              <p className="text-xl font-bold font-mono text-slate-100">{Math.round(data.accuracyPercent)}%</p>
            </div>
          )}

          {data.avgReactionTimeMs !== undefined && data.avgReactionTimeMs !== null && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono uppercase">
                <Zap size={14} /> Reaction Time
              </div>
              <p className="text-xl font-bold font-mono text-slate-100">{Math.round(data.avgReactionTimeMs)} ms</p>
              <p className="text-[10px] text-slate-400 font-sans">{reactionRating}</p>
            </div>
          )}

          {data.durationSeconds !== undefined && data.durationSeconds !== null && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase">
                <Clock size={14} /> Duration
              </div>
              <p className="text-xl font-bold font-mono text-slate-100">
                {Math.floor(data.durationSeconds / 60)}m {Math.round(data.durationSeconds % 60)}s
              </p>
            </div>
          )}

          {data.totalTrials !== undefined && data.totalTrials !== null && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-mono uppercase">
                <Award size={14} /> Trials
              </div>
              <p className="text-xl font-bold font-mono text-slate-100">
                {data.correctTrials !== undefined && data.correctTrials !== null ? `${data.correctTrials} / ${data.totalTrials}` : data.totalTrials}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            onClick={onReplay}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm font-display tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <RotateCcw size={16} /> Play Again
          </button>
          <button
            onClick={onReturnToDashboard}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm font-sans flex items-center justify-center gap-2 transition-all border border-slate-700"
          >
            <LayoutDashboard size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
