import { useGameStore } from '../../store/useGameStore';
import { useMiniGameStore } from '../../store/useMiniGameStore';
import { MINI_GAME_MODES } from '../../types';
import { MODES } from './modes';
import { CMCIGauge, MetricBar } from './shared';
import { beginSession } from './actions';
import { CognitiveProgress } from './CognitiveProgress';

export function ResultsScreen() {
  const { score, metrics, mode, setMode, startSession, trials, getSessionTrialLog } = useGameStore();
  const miniScore  = useMiniGameStore((s) => s.score);
  const isMiniGame = MINI_GAME_MODES.has(mode);

  const downloadTrialLog = () => {
    const sessionLog = getSessionTrialLog();
    const file = new Blob([JSON.stringify(sessionLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sphere-trainer-${sessionLog.sessionId ?? 'session'}-trials.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadTrialLogCSV = () => {
    const sessionLog = getSessionTrialLog();
    if (!sessionLog.trials.length) return;
    const headers = [
      'sessionId', 'trialNumber', 'timestamp', 'mode', 'sphereId',
      'sphereColor', 'expectedAction', 'actualAction', 'outcome',
      'correct', 'reactionTimeMs', 'driftMagnitude', 'isDistractor',
      'objectSpeed', 'targetSize', 'cognitiveLoad', 'spawnDelay',
      'targetDistance', 'responseTimeLimit',
    ];
    const rows = sessionLog.trials.map((t) => [
      t.sessionId,
      t.trialNumber,
      `"${t.timestamp}"`,
      t.mode,
      t.sphereId,
      t.sphereColor,
      t.expectedAction,
      t.actualAction ?? '',
      t.outcome,
      t.correct ? 1 : 0,
      t.reactionTimeMs ?? '',
      t.driftMagnitude ?? '',
      t.isDistractor ? 1 : 0,
      t.difficulty.objectSpeed,
      t.difficulty.targetSize,
      t.difficulty.cognitiveLoad,
      t.difficulty.spawnDelay,
      t.difficulty.targetDistance ?? 0.65,
      t.difficulty.responseTimeLimit ?? 2200,
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const file = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sphere-trainer-${sessionLog.sessionId ?? 'session'}-trials.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isMiniGame) {
    const modeMeta = MODES.find(m => m.id === mode)!;
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
        <div className="glass-panel p-8 w-full max-w-md max-h-[90vh] overflow-y-auto animate-fade-up text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-1 font-display">Session Complete</p>
          <h2 className="font-display text-xl font-bold text-white uppercase tracking-widest mb-8">{modeMeta.label}</h2>
          <div className="mb-8">
            <span className="font-display text-6xl font-black" style={{ color: modeMeta.color, textShadow: `0 0 30px ${modeMeta.color}` }}>
              {miniScore}
            </span>
            <p className="text-[12px] uppercase tracking-widest text-slate-500 mt-2">Final Score</p>
          </div>

          <CognitiveProgress mode={mode} color={modeMeta.color} />

          {trials.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
              <button
                className="btn-primary text-xs"
                style={{ color: '#67e8f9', borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.06)' }}
                onClick={downloadTrialLog}
              >
                Export JSON Log
              </button>
              <button
                className="btn-primary text-xs"
                style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.06)' }}
                onClick={downloadTrialLogCSV}
              >
                Export CSV Log
              </button>
            </div>
          )}

          <div className="flex gap-3 justify-center mt-6">
            <button className="btn-primary" onClick={beginSession}>
              Play Again
            </button>
            <button
              className="btn-primary"
              style={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.05)' }}
              onClick={() => { setMode('micro-reach'); useGameStore.setState({ phase: 'menu', score: null }); }}
            >
              Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!score) return null;

  const modeMeta = MODES.find((m) => m.id === mode)!;
  const totalR   = metrics.totalReactions;
  const accuracy = totalR > 0 ? Math.round(metrics.correctReactions / totalR * 100) : 0;
  const avgRT    = metrics.reactionTimes.length
    ? Math.round(metrics.reactionTimes.reduce((a, b) => a + b, 0) / metrics.reactionTimes.length)
    : 0;

  const insight =
    score.cmci >= 80 ? 'Exceptional coupling. Elite response profile.' :
    score.cmci >= 65 ? 'Strong performance. Consistent motor-cognitive link.' :
    score.cmci >= 50 ? 'Developing precision. Continue training for improvement.' :
    'Early stage. Focus on reducing errors before speed.';

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="glass-panel p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-1 font-display">
            Session Complete
          </p>
          <h2 className="font-display text-xl font-bold text-white uppercase tracking-widest">
            Performance Report
          </h2>
        </div>

        {/* CMCI gauge + secondary stats */}
        <div className="flex items-center gap-8 mb-8">
          <CMCIGauge value={score.cmci} />
          <div className="flex-1 space-y-3">
            <div>
              <span className="text-[11px] uppercase tracking-widest text-slate-500">Reactions</span>
              <p className="font-mono text-lg font-bold text-white">{totalR}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-widest text-slate-500">Accuracy</span>
              <p
                className="font-mono text-lg font-bold"
                style={{ color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffd60a' : '#ff2d55' }}
              >
                {accuracy}%
              </p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-widest text-slate-500">Avg Reaction</span>
              <p className="font-mono text-lg font-bold text-slate-200">
                {avgRT > 0 ? `${avgRT} ms` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Metric bars */}
        <div className="border-t border-white/05 pt-6">
          <MetricBar label="Cognitive Stability"  value={score.cognitive}      color="#7b2fff" delay={0}   />
          <MetricBar label="Motor Execution"       value={score.motor}          color="#00d4ff" delay={150} />
          <MetricBar label="Error Correction"      value={score.errorCorrection} color="#00ff88" delay={300} />
        </div>

        {/* Insight */}
        <div
          className="mt-4 mb-6 px-4 py-3 rounded-lg text-xs text-slate-300 italic text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {insight}
        </div>

        <CognitiveProgress mode={mode} color={modeMeta.color} />

        {trials.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              className="btn-primary text-xs"
              style={{ color: '#67e8f9', borderColor: 'rgba(34,211,238,0.35)', background: 'rgba(34,211,238,0.06)' }}
              onClick={downloadTrialLog}
            >
              Export JSON Log
            </button>
            <button
              className="btn-primary text-xs"
              style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.35)', background: 'rgba(56,189,248,0.06)' }}
              onClick={downloadTrialLogCSV}
            >
              Export CSV Log
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center mt-6">
          <button className="btn-primary" onClick={startSession}>
            Retry {modeMeta.label}
          </button>
          <button
            className="btn-primary"
            style={{
              color: '#94a3b8',
              borderColor: 'rgba(148,163,184,0.3)',
              background: 'rgba(148,163,184,0.05)',
            }}
            onClick={() => {
              setMode('micro-reach');
              useGameStore.setState({ phase: 'menu', score: null });
            }}
          >
            Change Mode
          </button>
        </div>
      </div>
    </div>
  );
}
