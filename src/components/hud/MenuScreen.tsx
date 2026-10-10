import { createPortal } from 'react-dom';
import { useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { MODES } from './modes';
import { DiffPips, RulesLegend } from './shared';
import { beginSession } from './actions';
import { SettingsButton } from './SettingsPanel';
import { HistoryButton } from './HistoryPanel';
import { SensorBadge } from './SensorBadge';

export function MenuScreen() {
  const { mode, setMode } = useGameStore();
  const { textScale, highContrast, reducedMotion, clarityMode } = useSettingsStore();

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center p-6 py-12 overflow-y-auto">
      {/* Top-right utility buttons — fixed to the viewport (portaled) so they
          stay reachable regardless of menu scroll position or text-scale zoom. */}
      {createPortal(
        <div
          className="fixed top-5 right-5 z-40 flex items-center gap-2"
          data-text-scale={textScale}
          data-contrast={highContrast ? 'high' : 'normal'}
          data-motion={reducedMotion ? 'reduced' : 'normal'}
          data-clarity={clarityMode ? 'on' : 'off'}
        >
          <SensorBadge />
          <HistoryButton />
          <SettingsButton />
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="text-center mb-8 animate-fade-up">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-2xl animate-glow-pulse" style={{ color: '#00d4ff' }}>◈</span>
          <h1
            className="font-display text-2xl font-bold tracking-widest uppercase"
            style={{ color: '#00d4ff', textShadow: '0 0 20px #00d4ff55' }}
          >
            Neuro-Adapt
          </h1>
        </div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
          Cognitive-Motor Coupling Intelligence System
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-8">
        {MODES.slice(0, 4).map((m, i) => (
          <div
            key={m.id}
            className={`glass-card p-5 animate-fade-up delay-${(i + 1) * 100} ${mode === m.id ? 'selected' : ''}`}
            style={{ opacity: 0 }}
            onClick={() => setMode(m.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl" style={{ color: m.color }}>{m.icon}</span>
              <DiffPips n={m.difficulty} color={m.color} />
            </div>
            <h3
              className="font-display text-sm font-semibold mb-0.5"
              style={{ color: m.color }}
            >
              {m.label}
            </h3>
            <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">{m.sub}</p>
            <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
          </div>
        ))}

        {/* 5th card spans both columns */}
        <div
          className={`glass-card p-5 col-span-2 animate-fade-up delay-600 ${mode === 'dual-task' ? 'selected' : ''}`}
          style={{ opacity: 0 }}
          onClick={() => setMode('dual-task')}
        >
          {(() => {
            const m = MODES[4];
            return (
              <div className="flex items-center gap-6">
                <span className="text-3xl" style={{ color: m.color }}>{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-display text-sm font-semibold" style={{ color: m.color }}>
                      {m.label}
                    </h3>
                    <DiffPips n={m.difficulty} color={m.color} />
                  </div>
                  <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-1">{m.sub}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Mini Games section */}
      <div className="w-full max-w-2xl mt-2 mb-6 animate-fade-up" style={{ opacity: 0, animationDelay: '0.65s' }}>
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-600 mb-3 font-display text-center">
          ── Mini Games ──
        </p>
        <div className="grid grid-cols-2 gap-3">
          {MODES.slice(5, 7).map((m) => (
            <div
              key={m.id}
              className={`glass-card p-4 ${mode === m.id ? 'selected' : ''}`}
              onClick={() => setMode(m.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl" style={{ color: m.color }}>{m.icon}</span>
                <DiffPips n={m.difficulty} color={m.color} />
              </div>
              <h3 className="font-display text-sm font-semibold mb-0.5" style={{ color: m.color }}>{m.label}</h3>
              <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-1.5">{m.sub}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rules + Start */}
      <div className="flex items-start gap-6 w-full max-w-2xl animate-fade-up delay-700" style={{ opacity: 0 }}>
        <div className="glass p-5 flex-1">
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 font-display">
            Default Rules
          </p>
          <RulesLegend />
        </div>
        <div className="flex flex-col items-center gap-3">
          <button className="btn-primary" onClick={beginSession}>
            Initialise Session
          </button>
          <p className="text-[11px] text-slate-600 uppercase tracking-widest text-center">
            {MODES.find((m) => m.id === mode)?.label ?? ''} mode
          </p>
        </div>
      </div>
    </div>
  );
}
