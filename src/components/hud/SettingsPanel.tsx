import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore, SESSION_LENGTHS, type TextScale, type SessionLength } from '../../store/useSettingsStore';

const TEXT_SCALES: { id: TextScale; label: string }[] = [
  { id: 'normal', label: 'A' },
  { id: 'large',  label: 'A+' },
  { id: 'xlarge', label: 'A++' },
];

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="text-xs font-display uppercase tracking-widest text-slate-200">{label}</p>
        <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onChange}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
        style={{ background: checked ? '#00d4ff55' : 'rgba(255,255,255,0.08)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const {
    textScale, highContrast, reducedMotion, relaxedPace, clarityMode, sessionLength, tapToSelect,
    setTextScale, toggleHighContrast, toggleReducedMotion, toggleRelaxedPace,
    toggleClarityMode, setSessionLength, toggleTapToSelect,
  } = useSettingsStore();

  return (
    <>
      <button
        className="glass px-3 py-2.5 text-slate-400 hover:text-white transition-all text-xs font-display tracking-widest uppercase"
        onClick={() => setOpen(true)}
        aria-label="Open accessibility settings"
      >
        ⚙ Settings
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-panel p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto animate-fade-up"
            data-contrast={highContrast ? 'high' : 'normal'}
            data-motion={reducedMotion ? 'reduced' : 'normal'}
            data-clarity={clarityMode ? 'on' : 'off'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm uppercase tracking-widest text-white">Accessibility</h3>
              <button
                className="text-slate-500 hover:text-white text-lg leading-none"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="mb-2">
              <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">Text Size</p>
              <div className="flex gap-2">
                {TEXT_SCALES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTextScale(t.id)}
                    className="flex-1 py-2 rounded-lg font-display text-sm transition-all"
                    style={{
                      background: textScale === t.id ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${textScale === t.id ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: textScale === t.id ? '#00d4ff' : '#94a3b8',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <ToggleRow
              label="High Contrast" desc="Brighter text and stronger panel borders"
              checked={highContrast} onChange={toggleHighContrast}
            />
            <ToggleRow
              label="Reduced Motion" desc="Disable fade / pulse UI animations"
              checked={reducedMotion} onChange={toggleReducedMotion}
            />
            <ToggleRow
              label="Relaxed Pace" desc="Slower objects and longer response windows"
              checked={relaxedPace} onChange={toggleRelaxedPace}
            />
            <ToggleRow
              label="Clarity Mode" desc="Remove glow / blur effects that can cause glare"
              checked={clarityMode} onChange={toggleClarityMode}
            />
            <ToggleRow
              label="Tap-to-Select" desc="Add on-screen Left / Hold / Right buttons instead of swipe gestures"
              checked={tapToSelect} onChange={toggleTapToSelect}
            />

            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[12px] uppercase tracking-widest text-slate-500 mb-2">Session Length</p>
              <div className="flex gap-2">
                {SESSION_LENGTHS.map((len: SessionLength) => (
                  <button
                    key={len}
                    onClick={() => setSessionLength(len)}
                    className="flex-1 py-2 rounded-lg font-display text-xs transition-all"
                    style={{
                      background: sessionLength === len ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${sessionLength === len ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: sessionLength === len ? '#00d4ff' : '#94a3b8',
                    }}
                  >
                    {Math.round(len / 60 * 10) / 10}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
