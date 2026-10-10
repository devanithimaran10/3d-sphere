import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistoryStore, type SessionRecord } from '../../store/useHistoryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { MINI_GAME_MODES } from '../../types';
import { MODES } from './modes';
import { Sparkline } from './shared';

function exportSessionsCsv(sessions: SessionRecord[]) {
  const header = [
    'date', 'mode', 'cmci', 'accuracy', 'avgReactionMs', 'miniScore',
    'aiCognitiveAbility', 'aiMotorStability', 'aiFatigueProbability', 'aiErrorTendency',
  ];
  const rows = sessions.map((s) => [
    s.date, s.mode, s.cmci ?? '', s.accuracy ?? '', s.avgReactionMs ?? '', s.miniScore ?? '',
    s.finalPatientState?.cognitiveAbility?.toFixed(1) ?? '',
    s.finalPatientState?.motorStability?.toFixed(1) ?? '',
    s.finalPatientState?.fatigueProbability?.toFixed(2) ?? '',
    s.finalPatientState?.errorTendency?.toFixed(2) ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neuro-adapt-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function HistoryButton() {
  const [open, setOpen] = useState(false);
  const sessions = useHistoryStore((s) => s.sessions);
  const clearHistory = useHistoryStore((s) => s.clearHistory);
  const { highContrast, reducedMotion, clarityMode } = useSettingsStore();

  const cmciTrend = sessions.filter((s) => s.cmci !== null).slice(0, 20).reverse().map((s) => s.cmci!);

  const bestByMiniMode = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.miniScore === null) return;
    const best = bestByMiniMode.get(s.mode) ?? 0;
    if (s.miniScore > best) bestByMiniMode.set(s.mode, s.miniScore);
  });

  return (
    <>
      <button
        className="glass px-3 py-2.5 text-slate-400 hover:text-white transition-all text-xs font-display tracking-widest uppercase"
        onClick={() => setOpen(true)}
        aria-label="Open session history"
      >
        ◷ History
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-panel p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto animate-fade-up"
            data-contrast={highContrast ? 'high' : 'normal'}
            data-motion={reducedMotion ? 'reduced' : 'normal'}
            data-clarity={clarityMode ? 'on' : 'off'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm uppercase tracking-widest text-white">Session History</h3>
              <button
                className="text-slate-500 hover:text-white text-lg leading-none"
                onClick={() => setOpen(false)}
                aria-label="Close history"
              >
                ✕
              </button>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No sessions recorded yet.</p>
            ) : (
              <>
                {cmciTrend.length >= 2 && (
                  <div className="mb-6">
                    <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">
                      CMCI Trend (last {cmciTrend.length})
                    </p>
                    <Sparkline values={cmciTrend} color="#00d4ff" />
                  </div>
                )}

                {bestByMiniMode.size > 0 && (
                  <div className="mb-6">
                    <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">
                      Best Mini-Game Scores
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {[...bestByMiniMode.entries()].map(([mode, best]) => {
                        const meta = MODES.find((m) => m.id === mode);
                        return (
                          <div key={mode} className="glass px-3 py-2 flex items-center justify-between">
                            <span
                              className="text-[12px] uppercase tracking-widest"
                              style={{ color: meta?.color }}
                            >
                              {meta?.label ?? mode}
                            </span>
                            <span className="font-mono text-sm font-bold text-white">{best}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">Recent Sessions</p>
                <div className="space-y-1.5 mb-4">
                  {sessions.slice(0, 15).map((s) => {
                    const meta = MODES.find((m) => m.id === s.mode);
                    const isMini = MINI_GAME_MODES.has(s.mode);
                    const dt = new Date(s.date);
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-white/[0.02]"
                      >
                        <span className="text-slate-400">
                          {dt.toLocaleDateString()} {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="uppercase tracking-widest" style={{ color: meta?.color }}>
                          {meta?.label ?? s.mode}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {isMini ? `${s.miniScore ?? 0} pts` : s.cmci !== null ? `${s.cmci} CMCI` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4">
                  <button
                    className="text-[12px] uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    onClick={() => exportSessionsCsv(sessions)}
                  >
                    Export CSV
                  </button>
                  <button
                    className="text-[12px] uppercase tracking-widest text-slate-600 hover:text-red-400 transition-colors"
                    onClick={() => { if (window.confirm('Clear all session history?')) clearHistory(); }}
                  >
                    Clear History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
