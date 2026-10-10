import { useHistoryStore } from '../../store/useHistoryStore';
import { predictProgress } from '../../ai/progressPredictor';
import { Sparkline } from './shared';
import type { GameMode } from '../../types';

const TREND_META = {
  up:   { icon: '↑', label: 'Improving', color: '#00ff88' },
  down: { icon: '↓', label: 'Declining', color: '#ff2d55' },
  flat: { icon: '→', label: 'Stable',    color: '#94a3b8' },
} as const;

/** Shown on every game's results screen — works identically for core CMCI
 *  modes and mini-games, since it only reads the mode-agnostic unifiedScore. */
export function CognitiveProgress({ mode, color }: { mode: GameMode; color: string }) {
  const sessions = useHistoryStore((s) => s.sessions);
  const series = sessions
    .filter((s) => s.mode === mode && s.unifiedScore !== undefined)
    .slice(0, 20)
    .reverse()
    .map((s) => s.unifiedScore!);

  if (series.length === 0) return null;

  const { trendDirection, changeVsAverage, predictedNext, sampleSize } = predictProgress(series);
  const current = series[series.length - 1];
  const trend = TREND_META[trendDirection];

  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 font-display">
        Cognitive Progress
      </p>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-black" style={{ color }}>{current}</span>
          <span className="text-[11px] uppercase tracking-widest text-slate-500">/ 100</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: trend.color }}>
          <span>{trend.icon}</span>
          <span className="text-[11px] font-display uppercase tracking-widest">{trend.label}</span>
        </div>
      </div>

      {series.length >= 2 && (
        <div className="mb-3">
          <Sparkline values={series} color={color} width={260} height={40} />
        </div>
      )}

      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{changeVsAverage >= 0 ? '+' : ''}{changeVsAverage} vs your average</span>
        <span>Predicted next: {predictedNext}</span>
      </div>
      {sampleSize < 3 && (
        <p className="text-[10px] text-slate-600 mt-2 italic">
          Play a few more sessions of this mode for a more reliable trend.
        </p>
      )}
    </div>
  );
}
