export type GameMode =
  | 'micro-reach'
  | 'rule-switch'
  | 'inhibition-conflict'
  | 'micro-trajectory'
  | 'dual-task'
  | 'reflex-gate'
  | 'geometric-draw';

export const MINI_GAME_MODES = new Set<GameMode>([
  'reflex-gate', 'geometric-draw',
]);

export type SphereColor = 'green' | 'blue' | 'red' | 'yellow';
export type SphereAction = 'left' | 'right' | 'inhibit' | 'hold';
export type GamePhase = 'menu' | 'playing' | 'results';

export interface RuleMap {
  green: SphereAction;
  blue: SphereAction;
  red: SphereAction;
  yellow: SphereAction;
}

export interface ActiveSphere {
  id: string;
  color: SphereColor;
  position: [number, number, number];
  spawnTime: number;
  isDistractor?: boolean;
}

export interface SessionMetrics {
  reactionTimes: number[];
  driftMagnitudes: number[];
  inhibitionErrors: number;
  falsePositives: number;
  ruleSwitchLatencies: number[];
  totalReactions: number;
  correctReactions: number;
}

export interface AdaptiveParams {
  objectSpeed: number;
  targetSize: number;
  cognitiveLoad: number;
  spawnDelay: number;
  targetDistance?: number;
  responseTimeLimit?: number;
}

/** A single completed sphere interaction, retained for research export. */
export interface TrialLog {
  sessionId: string;
  trialNumber: number;
  timestamp: string;
  mode: GameMode;
  sphereId: string;
  sphereColor: SphereColor;
  expectedAction: SphereAction;
  actualAction: SphereAction | null;
  outcome: 'correct' | 'incorrect' | 'missed' | 'inhibited';
  correct: boolean;
  reactionTimeMs: number | null;
  driftMagnitude: number | null;
  isDistractor: boolean;
  /** Difficulty settings active when this sphere was resolved. */
  difficulty: AdaptiveParams;
}

export interface SessionTrialLog {
  schemaVersion: 1;
  sessionId: string | null;
  startedAt: string | null;
  mode: GameMode;
  trials: TrialLog[];
}

export interface CMCIScore {
  cognitive: number;
  motor: number;
  errorCorrection: number;
  cmci: number;
}

// ─── AI layer: patient-state estimation + RL adaptation ────────
export interface PatientState {
  cognitiveAbility: number;   // 0-100, higher = stronger recent cognitive performance
  motorStability: number;     // 0-100, higher = steadier motor execution
  fatigueProbability: number; // 0-1
  errorTendency: number;      // 0-1, recent error rate
}

export type RLAction =
  | 'increase_difficulty'
  | 'decrease_difficulty'
  | 'increase_cognitive_load'
  | 'increase_motor_load'
  | 'trigger_rest'
  | 'hold_steady';
