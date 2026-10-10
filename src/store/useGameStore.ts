import { create } from 'zustand';
import type {
  GameMode, SphereColor, SphereAction, GamePhase,
  RuleMap, ActiveSphere, SessionMetrics, AdaptiveParams, CMCIScore,
  PatientState, RLAction, TrialLog, SessionTrialLog,
} from '../types';
import { MINI_GAME_MODES } from '../types';
import { useSettingsStore } from './useSettingsStore';
import { useMiniGameStore } from './useMiniGameStore';
import { useHistoryStore } from './useHistoryStore';
import { estimatePatientState } from '../ai/stateEstimator';
import { useRLStore, computeReward } from '../ai/rlController';
import { applyAction } from '../ai/safetyLayer';
import { normalizeScore } from '../ai/progressPredictor';

// ─── Constants ────────────────────────────────────────────────
const BASE_RULES: RuleMap = { green: 'left', blue: 'right', red: 'inhibit', yellow: 'hold' };

const EMPTY_METRICS: SessionMetrics = {
  reactionTimes: [], driftMagnitudes: [], inhibitionErrors: 0,
  falsePositives: 0, ruleSwitchLatencies: [], totalReactions: 0, correctReactions: 0,
};

const INIT_ADAPTIVE: AdaptiveParams = {
  objectSpeed: 0.75,
  targetSize: 1.15,
  cognitiveLoad: 0.4,
  spawnDelay: 2200,
  targetDistance: 0.65,
  responseTimeLimit: 2200,
};
const RELAXED_ADAPTIVE: AdaptiveParams = {
  objectSpeed: 0.55,
  targetSize: 1.35,
  cognitiveLoad: 0.30,
  spawnDelay: 2800,
  targetDistance: 0.50,
  responseTimeLimit: 2800,
};

// ─── Helpers ──────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number)   => a + (b - a) * t;
const mean  = (arr: number[]) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;

function createSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function shuffleRules(): RuleMap {
  const movable: SphereAction[] = ['left', 'right', 'hold'];
  const shuffled = [...movable].sort(() => Math.random() - 0.5);
  return { green: shuffled[0], blue: shuffled[1], red: 'inhibit', yellow: shuffled[2] };
}

function adaptParams(current: AdaptiveParams, metrics: SessionMetrics): AdaptiveParams {
  const relaxed  = useSettingsStore.getState().relaxedPace;
  const avgRT    = mean(metrics.reactionTimes.slice(-6)) || 600;
  const total    = metrics.totalReactions || 1;
  const errorRate = (metrics.inhibitionErrors + metrics.falsePositives) / total;
  const accuracy  = metrics.correctReactions / total;

  const tSpeed = errorRate > 0.35 ? 0.70 : accuracy > 0.85 && avgRT < 380 ? (relaxed ? 1.05 : 1.45) : 1.0;
  const tSize  = errorRate > 0.35 ? 1.30 : accuracy > 0.85 ? 0.78 : 1.0;
  const tDelay = errorRate > 0.35 ? 2200 : avgRT < 350 ? (relaxed ? 1300 : 900) : (relaxed ? 1900 : 1500);
  const tLoad  = errorRate > 0.35 ? 0.30 : accuracy > 0.85 ? 0.80 : 0.55;
  const tDist  = errorRate > 0.35 ? 0.50 : accuracy > 0.85 ? (relaxed ? 0.65 : 0.80) : 0.65;
  const tLimit = errorRate > 0.35 ? 2600 : accuracy > 0.85 ? (relaxed ? 1800 : 1400) : 2200;

  const t = 0.12;
  const speedCeiling = relaxed ? 1.15 : 2.20;
  const delayFloor    = relaxed ? 1400 : 620;
  return {
    objectSpeed:       clamp(lerp(current.objectSpeed,   tSpeed, t), 0.40, speedCeiling),
    targetSize:        clamp(lerp(current.targetSize,    tSize,  t), 0.55, 1.50),
    cognitiveLoad:     clamp(lerp(current.cognitiveLoad, tLoad,  t), 0.20, 1.00),
    spawnDelay:        clamp(lerp(current.spawnDelay,    tDelay, t), delayFloor, 2600),
    targetDistance:    clamp(lerp(current.targetDistance ?? 0.65, tDist, t), 0.40, 0.85),
    responseTimeLimit: clamp(lerp(current.responseTimeLimit ?? 2200, tLimit, t), 1000, 3200),
  };
}

function detectFatigue(metrics: SessionMetrics): number {
  if (metrics.reactionTimes.length < 10) return 0;
  const recent  = mean(metrics.reactionTimes.slice(-5));
  const earlier = mean(metrics.reactionTimes.slice(-10, -5));
  if (!earlier) return 0;
  return clamp((recent - earlier) / earlier * 2, 0, 1);
}

function calcCMCI(metrics: SessionMetrics): CMCIScore {
  const avgRT    = mean(metrics.reactionTimes) || 900;
  const total    = metrics.totalReactions || 1;
  const acc      = metrics.correctReactions / total;
  const avgDrift = mean(metrics.driftMagnitudes) || 0;
  const inhibOk  = 1 - clamp((metrics.inhibitionErrors + metrics.falsePositives) / total, 0, 1);

  const cognitive      = clamp((1 - clamp((avgRT - 180) / 900, 0, 1)) * acc * 100, 0, 100);
  const motor          = clamp((1 - clamp(avgDrift / 2.5, 0, 1)) * 100, 0, 100);
  const errorCorrection = clamp(inhibOk * 100, 0, 100);
  const cmci           = cognitive * 0.40 + motor * 0.30 + errorCorrection * 0.30;

  return { cognitive, motor, errorCorrection, cmci };
}

function reduceDifficulty(a: AdaptiveParams): AdaptiveParams {
  return {
    objectSpeed:       Math.max(0.40, a.objectSpeed   * 0.84),
    targetSize:        Math.min(1.50, a.targetSize    * 1.12),
    cognitiveLoad:     Math.max(0.20, a.cognitiveLoad * 0.78),
    spawnDelay:        Math.min(2600, a.spawnDelay    * 1.22),
    targetDistance:    Math.max(0.40, (a.targetDistance ?? 0.65) * 0.88),
    responseTimeLimit: Math.min(3200, (a.responseTimeLimit ?? 2200) * 1.25),
  };
}

// ─── Store ────────────────────────────────────────────────────
interface GameStore {
  phase: GamePhase;
  mode: GameMode;
  rules: RuleMap;
  activeSpheres: ActiveSphere[];
  metrics: SessionMetrics;
  adaptive: AdaptiveParams;
  score: CMCIScore | null;
  timeLeft: number;
  totalDuration: number;
  fatigue: number;
  ruleSwitchAlert: boolean;
  lastRuleSwitchAt: number;
  paused: boolean;
  sessionId: string | null;
  sessionStartedAt: number | null;
  trials: TrialLog[];

  // AI layer (state estimation + RL controller + safety layer)
  patientState: PatientState | null;
  lastAIAction: RLAction | null;
  safetyOverride: string | null;

  setMode: (m: GameMode) => void;
  startSession: () => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  spawnSphere: (s: ActiveSphere) => void;
  removeSphere: (id: string) => void;
  registerInput: (p: {
    sphereId: string; action: SphereAction;
    driftMagnitude?: number; reactionTime?: number;
  }) => void;
  registerInhibition: (sphereId: string) => void;
  registerMiss: (sphereId: string) => void;
  triggerRuleSwitch: () => void;
  tick: (deltaMs: number) => void;
  getSessionTrialLog: () => SessionTrialLog;
  setDifficulty: (actionOrParams: RLAction | Partial<AdaptiveParams>) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  mode: 'micro-reach',
  rules: { ...BASE_RULES },
  activeSpheres: [],
  metrics: { ...EMPTY_METRICS },
  adaptive: { ...INIT_ADAPTIVE },
  score: null,
  timeLeft: 90,
  totalDuration: 90,
  fatigue: 0,
  ruleSwitchAlert: false,
  lastRuleSwitchAt: 0,
  paused: false,
  sessionId: null,
  sessionStartedAt: null,
  trials: [],

  patientState: null,
  lastAIAction: null,
  safetyOverride: null,

  setMode: (mode) => set({ mode }),

  startSession: () => {
    const { relaxedPace: relaxed, sessionLength } = useSettingsStore.getState();
    const startedAt = Date.now();
    set({
      phase: 'playing',
      rules: { ...BASE_RULES },
      activeSpheres: [],
      metrics: { ...EMPTY_METRICS },
      adaptive: relaxed ? { ...RELAXED_ADAPTIVE } : { ...INIT_ADAPTIVE },
      score: null,
      timeLeft: sessionLength,
      totalDuration: sessionLength,
      fatigue: 0,
      ruleSwitchAlert: false,
      lastRuleSwitchAt: Date.now(),
      paused: false,
      patientState: null,
      lastAIAction: null,
      safetyOverride: null,
      sessionId: createSessionId(),
      sessionStartedAt: startedAt,
      trials: [],
    });
  },

  pauseSession: () => {
    if (get().phase !== 'playing') return;
    // Dismiss in-flight spheres so no auto-miss/inhibition penalty fires while paused.
    set({ paused: true, activeSpheres: [] });
  },

  resumeSession: () => {
    if (get().phase !== 'playing') return;
    set({ paused: false, lastRuleSwitchAt: Date.now() });
  },

  endSession: () => {
    const { metrics, mode, patientState } = get();
    const isMini  = MINI_GAME_MODES.has(mode);
    const score   = isMini ? null : calcCMCI(metrics);
    const totalR  = metrics.totalReactions;
    const accuracy = !isMini && totalR > 0 ? Math.round((metrics.correctReactions / totalR) * 100) : null;
    const avgReactionMs = !isMini && metrics.reactionTimes.length
      ? Math.round(mean(metrics.reactionTimes)) : null;
    const miniScoreVal = isMini ? useMiniGameStore.getState().score : null;

    // Unified cognitive score (0-100), comparable across every mode: the
    // CMCI itself for core modes, or the mini-game's raw score normalised
    // against the player's own history in that same mode.
    const unifiedScore = isMini
      ? normalizeScore(
          miniScoreVal ?? 0,
          useHistoryStore.getState().sessions
            .filter((s) => s.mode === mode && s.miniScore !== null)
            .map((s) => s.miniScore!),
        )
      : Math.round(score!.cmci);

    useHistoryStore.getState().addSession({
      finalPatientState: isMini ? null : patientState,
      unifiedScore,
      id: Math.random().toString(36).slice(2, 11),
      mode,
      date: new Date().toISOString(),
      cmci: score ? Math.round(score.cmci) : null,
      accuracy,
      avgReactionMs,
      miniScore: miniScoreVal,
    });

    set({ phase: 'results', score, activeSpheres: [] });
  },

  spawnSphere: (sphere) =>
    set((s) => ({ activeSpheres: [...s.activeSpheres, sphere] })),

  removeSphere: (id) =>
    set((s) => ({ activeSpheres: s.activeSpheres.filter((x) => x.id !== id) })),

  registerInput: ({ sphereId, action, driftMagnitude = 0, reactionTime = 600 }) => {
    const { activeSpheres, rules, lastRuleSwitchAt, metrics: prev, adaptive, sessionId, mode } = get();
    const sphere = activeSpheres.find((s) => s.id === sphereId);
    if (!sphere) return;

    const expected       = sphere.isDistractor ? 'inhibit' : rules[sphere.color];
    const isInhibitError = sphere.color === 'red' && action !== 'inhibit';
    const isFalsePositive = !!sphere.isDistractor;
    const isCorrect = !isInhibitError && !isFalsePositive &&
      ((expected === 'left'  && action === 'left')  ||
       (expected === 'right' && action === 'right') ||
       (expected === 'hold'  && action === 'hold'));

    const timeSinceSwitch = Date.now() - lastRuleSwitchAt;
    const switchCost = timeSinceSwitch < 3500 ? Math.max(0, reactionTime - 450) : 0;

    const metrics: SessionMetrics = {
      ...prev,
      totalReactions:   prev.totalReactions + 1,
      correctReactions: prev.correctReactions + (isCorrect ? 1 : 0),
      reactionTimes:    [...prev.reactionTimes, reactionTime],
      driftMagnitudes:  [...prev.driftMagnitudes, driftMagnitude],
      inhibitionErrors: prev.inhibitionErrors + (isInhibitError  ? 1 : 0),
      falsePositives:   prev.falsePositives   + (isFalsePositive ? 1 : 0),
      ruleSwitchLatencies: switchCost > 0
        ? [...prev.ruleSwitchLatencies, switchCost]
        : prev.ruleSwitchLatencies,
    };

    const baselineAdaptive = adaptParams(adaptive, metrics);
    const fatigue          = detectFatigue(metrics);

    // AI layer: estimate patient state, let the RL controller propose an
    // action, and have the safety layer vet it (falling back to the
    // baseline rule-based controller when unsafe).
    const prevPatientState = get().patientState ?? estimatePatientState(EMPTY_METRICS, 0);
    const nextPatientState = estimatePatientState(metrics, fatigue);
    const rlAction   = useRLStore.getState().chooseAction(nextPatientState);
    const safetyResult = applyAction(rlAction, adaptive, nextPatientState, baselineAdaptive);
    const reward = computeReward(prevPatientState, nextPatientState, !safetyResult.safe);
    useRLStore.getState().updateQ(prevPatientState, rlAction, reward, nextPatientState);

    const finalAdaptive = fatigue > 0.72 ? reduceDifficulty(safetyResult.adaptive) : safetyResult.adaptive;

    set((s) => ({
      metrics,
      adaptive: finalAdaptive,
      fatigue,
      patientState: nextPatientState,
      lastAIAction: safetyResult.actionApplied,
      safetyOverride: safetyResult.reason,
      activeSpheres: s.activeSpheres.filter((x) => x.id !== sphereId),
      trials: sessionId ? [...s.trials, {
        sessionId,
        trialNumber: s.trials.length + 1,
        timestamp: new Date().toISOString(),
        mode,
        sphereId,
        sphereColor: sphere.color,
        expectedAction: expected,
        actualAction: action,
        outcome: isCorrect ? 'correct' : 'incorrect',
        correct: isCorrect,
        reactionTimeMs: Math.round(reactionTime),
        driftMagnitude,
        isDistractor: !!sphere.isDistractor,
        difficulty: { ...adaptive },
      }] : s.trials,
    }));
  },

  registerInhibition: (sphereId) => {
    const { activeSpheres, metrics: prev, adaptive, sessionId, mode } = get();
    const sphere = activeSpheres.find((s) => s.id === sphereId);
    if (!sphere) return;
    set((s) => ({
      metrics: {
        ...prev,
        totalReactions:   prev.totalReactions + 1,
        correctReactions: prev.correctReactions + 1,
      },
      activeSpheres: s.activeSpheres.filter((x) => x.id !== sphereId),
      trials: sessionId ? [...s.trials, {
        sessionId,
        trialNumber: s.trials.length + 1,
        timestamp: new Date().toISOString(),
        mode,
        sphereId,
        sphereColor: sphere.color,
        expectedAction: 'inhibit',
        actualAction: 'inhibit',
        outcome: 'inhibited',
        correct: true,
        reactionTimeMs: null,
        driftMagnitude: null,
        isDistractor: !!sphere.isDistractor,
        difficulty: { ...adaptive },
      }] : s.trials,
    }));
  },

  registerMiss: (sphereId) => {
    const { activeSpheres, metrics: prev, rules, adaptive, sessionId, mode } = get();
    const sphere = activeSpheres.find((s) => s.id === sphereId);
    if (!sphere || sphere.color === 'red') return;
    const reactionTime = Math.round(Date.now() - sphere.spawnTime);
    set((s) => ({
      metrics: {
        ...prev,
        totalReactions: prev.totalReactions + 1,
        reactionTimes:  [...prev.reactionTimes, 1200],
      },
      activeSpheres: s.activeSpheres.filter((x) => x.id !== sphereId),
      trials: sessionId ? [...s.trials, {
        sessionId,
        trialNumber: s.trials.length + 1,
        timestamp: new Date().toISOString(),
        mode,
        sphereId,
        sphereColor: sphere.color,
        expectedAction: sphere.isDistractor ? 'inhibit' : rules[sphere.color],
        actualAction: null,
        outcome: 'missed',
        correct: false,
        reactionTimeMs: reactionTime,
        driftMagnitude: null,
        isDistractor: !!sphere.isDistractor,
        difficulty: { ...adaptive },
      }] : s.trials,
    }));
  },

  triggerRuleSwitch: () => {
    const newRules = shuffleRules();
    set({ rules: newRules, ruleSwitchAlert: true, lastRuleSwitchAt: Date.now() });
    setTimeout(() => set({ ruleSwitchAlert: false }), 2800);
  },

  tick: (deltaMs) => {
    const { phase, timeLeft, paused } = get();
    if (phase !== 'playing' || paused) return;
    const next = timeLeft - deltaMs / 1000;
    if (next <= 0) get().endSession();
    else set({ timeLeft: next });
  },

  setDifficulty: (actionOrParams) => {
    const { adaptive, metrics, fatigue, patientState } = get();
    if (typeof actionOrParams === 'string') {
      const currentState = patientState ?? estimatePatientState(metrics, fatigue);
      const baseline = adaptParams(adaptive, metrics);
      const safetyResult = applyAction(actionOrParams as RLAction, adaptive, currentState, baseline);
      set({
        adaptive: safetyResult.adaptive,
        lastAIAction: safetyResult.actionApplied,
        safetyOverride: safetyResult.reason,
      });
    } else {
      const updated: AdaptiveParams = {
        ...adaptive,
        ...actionOrParams,
      };
      set({
        adaptive: {
          objectSpeed:       clamp(updated.objectSpeed, 0.30, 2.20),
          targetSize:        clamp(updated.targetSize, 0.40, 1.80),
          cognitiveLoad:     clamp(updated.cognitiveLoad, 0.15, 1.00),
          spawnDelay:        clamp(updated.spawnDelay, 550, 3000),
          targetDistance:    clamp(updated.targetDistance ?? 0.65, 0.35, 0.95),
          responseTimeLimit: clamp(updated.responseTimeLimit ?? 2200, 800, 4000),
        },
      });
    }
  },

  getSessionTrialLog: () => {
    const { sessionId, sessionStartedAt, mode, trials } = get();
    return {
      schemaVersion: 1,
      sessionId,
      startedAt: sessionStartedAt ? new Date(sessionStartedAt).toISOString() : null,
      mode,
      trials: [...trials],
    };
  },
}));

// re-export types used elsewhere
export type { SphereColor, GameMode, SphereAction, GamePhase };
