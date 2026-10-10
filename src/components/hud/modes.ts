import type { GameMode, SphereColor, SphereAction } from '../../types';

export const MODES: {
  id: GameMode; label: string; sub: string;
  icon: string; difficulty: number; color: string;
  desc: string;
}[] = [
  {
    id: 'micro-reach', label: 'Micro-Reach', sub: 'Drift Control',
    icon: '◈', difficulty: 2, color: '#00d4ff',
    desc: 'React to sphere colours with precise directional swipes. Baseline cognitive-motor assessment.',
  },
  {
    id: 'rule-switch', label: 'Rule-Switch', sub: 'Reaction Field',
    icon: '⟳', difficulty: 4, color: '#7b2fff',
    desc: 'Colour-action mappings shift unpredictably mid-session. Measures adaptive cognition.',
  },
  {
    id: 'inhibition-conflict', label: 'Inhibition', sub: 'Conflict Trainer',
    icon: '✕', difficulty: 3, color: '#ff2d55',
    desc: 'Suppress responses to distractors and red targets. Tests executive inhibition.',
  },
  {
    id: 'micro-trajectory', label: 'Trajectory', sub: 'Stabilisation',
    icon: '↗', difficulty: 4, color: '#00ff88',
    desc: 'Interact with drifting targets under increasing speed. Measures motor precision.',
  },
  {
    id: 'dual-task', label: 'Dual-Task', sub: 'Coupling Challenge',
    icon: '⊗', difficulty: 5, color: '#ffd60a',
    desc: 'Rule-switching simultaneous with spatial tracking. Maximum cognitive-motor load.',
  },
  {
    id: 'reflex-gate', label: 'Reflex Gate', sub: 'Portal Timing',
    icon: '◉', difficulty: 4, color: '#ff2d55',
    desc: 'Four portals open and close. Hit the target portal exactly when it opens. Tests reflexes.',
  },
  {
    id: 'geometric-draw', label: 'Geometric Draw', sub: 'Kolam Sand Art',
    icon: '❊', difficulty: 3, color: '#a855f7',
    desc: 'Trace beautiful traditional geometric patterns and looping sand art. Tests precision drawing.',
  },
];

export const ACTION_LABEL: Record<SphereAction, string> = {
  left: '← Swipe Left', right: '→ Swipe Right',
  hold: '⏸ Hold 2s', inhibit: '✕ Ignore',
};

export const DOT_CLASS: Record<SphereColor, string> = {
  green: 'dot-green', blue: 'dot-blue', red: 'dot-red', yellow: 'dot-yellow',
};

export const COLOR_HEX: Record<SphereColor, string> = {
  green: '#00ff88', blue: '#00d4ff', red: '#ff2d55', yellow: '#ffd60a',
};
