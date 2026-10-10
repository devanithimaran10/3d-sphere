import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import type { SphereColor, SphereAction } from '../../types';
import { ACTION_LABEL, DOT_CLASS, COLOR_HEX } from './modes';

// ─── Difficulty pips ──────────────────────────────────────────
export function DiffPips({ n, max = 5, color }: { n: number; max?: number; color: string }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full transition-all"
          style={{
            background: i < n ? color : 'rgba(255,255,255,0.12)',
            boxShadow: i < n ? `0 0 6px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ─── Rules legend ─────────────────────────────────────────────
export function RulesLegend({ compact = false }: { compact?: boolean }) {
  const rules = useGameStore((s) => s.rules);
  const pairs: { color: SphereColor; action: SphereAction }[] = [
    { color: 'green',  action: rules.green  },
    { color: 'blue',   action: rules.blue   },
    { color: 'yellow', action: rules.yellow },
    { color: 'red',    action: rules.red    },
  ];
  return (
    <div className={`flex flex-col gap-${compact ? '1.5' : '2'}`}>
      {pairs.map(({ color, action }) => (
        <div key={color} className="flex items-center gap-2.5">
          <span
            className={`flex-shrink-0 rounded-full ${compact ? 'w-2 h-2' : 'w-2.5 h-2.5'} ${DOT_CLASS[color]}`}
          />
          <span
            className={`font-mono ${compact ? 'text-[12px]' : 'text-xs'} tracking-wide`}
            style={{ color: COLOR_HEX[color] }}
          >
            {ACTION_LABEL[action]}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Animated metric bar ──────────────────────────────────────
export function MetricBar({ label, value, color, delay = 0 }: {
  label: string; value: number; color: string; delay?: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.round(value)), delay + 80);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] uppercase tracking-widest text-slate-400 font-display">{label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color }}>
          {Math.round(value).toString().padStart(3, '0')}
        </span>
      </div>
      <div className="metric-track">
        <div
          className="metric-fill"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
            transition: `width 1.4s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────
export function Sparkline({ values, color, width = 220, height = 44 }: {
  values: number[]; color: string; width?: number; height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ─── CMCI Radial gauge ────────────────────────────────────────
export function CMCIGauge({ value }: { value: number }) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(value), 300);
    return () => clearTimeout(t);
  }, [value]);

  const offset = circumference * (1 - drawn / 100);
  const col =
    value >= 75 ? '#00ff88' :
    value >= 50 ? '#00d4ff' :
    value >= 30 ? '#ffd60a' : '#ff2d55';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={col}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)',
            filter: `drop-shadow(0 0 8px ${col})`,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl font-bold" style={{ color: col }}>
          {Math.round(drawn)}
        </span>
        <span className="text-[11px] uppercase tracking-widest text-slate-500 mt-0.5">CMCI</span>
      </div>
    </div>
  );
}
