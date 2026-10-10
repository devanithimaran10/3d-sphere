import type { RLAction } from '../../types';
import { useGameStore } from '../../store/useGameStore';

const ACTION_META: Record<RLAction, { label: string; icon: string; color: string }> = {
  increase_difficulty:     { label: 'Increasing Difficulty',  icon: '↑', color: '#ff2d55' },
  decrease_difficulty:     { label: 'Easing Difficulty',      icon: '↓', color: '#00ff88' },
  increase_cognitive_load: { label: 'Raising Cognitive Load', icon: '⟳', color: '#7b2fff' },
  increase_motor_load:     { label: 'Raising Motor Load',     icon: '↗', color: '#00d4ff' },
  trigger_rest:            { label: 'Suggesting Rest',        icon: '☕', color: '#ffd60a' },
  hold_steady:             { label: 'Holding Steady',         icon: '=', color: '#94a3b8' },
};

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-1.5">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
        <span className="font-mono text-[11px] font-bold" style={{ color }}>{Math.round(value)}</span>
      </div>
      <div className="metric-track" style={{ width: 130, height: 4 }}>
        <div
          className="metric-fill"
          style={{ width: `${Math.round(value)}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

export function AIInsightsPanel() {
  const patientState  = useGameStore((s) => s.patientState);
  const lastAIAction   = useGameStore((s) => s.lastAIAction);
  const safetyOverride = useGameStore((s) => s.safetyOverride);

  if (!patientState || !lastAIAction) return null;
  const action = ACTION_META[lastAIAction];

  return (
    <div className="absolute top-24 left-5 glass px-4 py-4 min-w-[170px] animate-fade-up">
      <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 font-display">
        AI Adaptation
      </p>
      <MiniBar label="Cognitive" value={patientState.cognitiveAbility} color="#7b2fff" />
      <MiniBar label="Motor"     value={patientState.motorStability}   color="#00d4ff" />
      <MiniBar label="Fatigue"   value={patientState.fatigueProbability * 100} color="#ffd60a" />

      <div className="mt-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <span style={{ color: action.color }}>{action.icon}</span>
          <span className="text-[11px] font-display uppercase tracking-widest" style={{ color: action.color }}>
            {action.label}
          </span>
        </div>
        {safetyOverride && (
          <p className="text-[10px] text-amber-400 mt-1.5 leading-snug">
            ⚠ {safetyOverride}
          </p>
        )}
      </div>
    </div>
  );
}
