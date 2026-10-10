import type { AdaptiveParams, PatientState, RLAction } from '../types';

/**
 * Safety Constraint Layer.
 *
 * Vets the RL controller's proposed action against hard, non-negotiable
 * limits before it is allowed to touch the live session parameters. If the
 * action would breach a limit — or the patient is clearly overloaded — the
 * system falls back to `baseline` (the existing rule-based `adaptParams`
 * controller), exactly matching the proposal's "if unsafe, the system
 * falls back to the baseline controller" behaviour. This is the one layer
 * that is never learned or approximated: the limits below are fixed.
 */

const HARD_MAX_SPEED = 2.2;
const HARD_MIN_SPAWN_DELAY = 550;
const HARD_MAX_COGNITIVE_LOAD = 1.0;
const MANDATORY_REST_FATIGUE = 0.85;
const MAX_STEP = { speed: 0.18, size: 0.12, load: 0.12, delay: 400 };

function applyStep(current: AdaptiveParams, action: RLAction): AdaptiveParams {
  switch (action) {
    case 'increase_difficulty':
      return {
        objectSpeed: current.objectSpeed + MAX_STEP.speed,
        targetSize: current.targetSize - MAX_STEP.size,
        cognitiveLoad: current.cognitiveLoad,
        spawnDelay: current.spawnDelay - MAX_STEP.delay,
      };
    case 'decrease_difficulty':
      return {
        objectSpeed: current.objectSpeed - MAX_STEP.speed,
        targetSize: current.targetSize + MAX_STEP.size,
        cognitiveLoad: current.cognitiveLoad,
        spawnDelay: current.spawnDelay + MAX_STEP.delay,
      };
    case 'increase_cognitive_load':
      return { ...current, cognitiveLoad: current.cognitiveLoad + MAX_STEP.load };
    case 'increase_motor_load':
      return { ...current, objectSpeed: current.objectSpeed + MAX_STEP.speed * 0.6 };
    case 'trigger_rest':
      return {
        objectSpeed: current.objectSpeed * 0.75,
        targetSize: current.targetSize * 1.15,
        cognitiveLoad: current.cognitiveLoad * 0.7,
        spawnDelay: current.spawnDelay * 1.35,
      };
    case 'hold_steady':
    default:
      return { ...current };
  }
}

function withinHardLimits(a: AdaptiveParams): boolean {
  return (
    a.objectSpeed <= HARD_MAX_SPEED && a.objectSpeed >= 0.3 &&
    a.spawnDelay >= HARD_MIN_SPAWN_DELAY &&
    a.cognitiveLoad <= HARD_MAX_COGNITIVE_LOAD && a.cognitiveLoad >= 0.15 &&
    a.targetSize >= 0.4 && a.targetSize <= 1.8
  );
}

export interface SafetyResult {
  adaptive: AdaptiveParams;
  safe: boolean;
  reason: string | null;
  actionApplied: RLAction;
}

export function applyAction(
  action: RLAction,
  current: AdaptiveParams,
  state: PatientState,
  baseline: AdaptiveParams,
): SafetyResult {
  // Hard clinical override: mandatory rest regardless of what the RL agent chose.
  if (state.fatigueProbability >= MANDATORY_REST_FATIGUE && action !== 'trigger_rest') {
    const rested = applyStep(current, 'trigger_rest');
    return {
      adaptive: withinHardLimits(rested) ? rested : baseline,
      safe: false,
      reason: 'High fatigue detected — mandatory rest enforced',
      actionApplied: 'trigger_rest',
    };
  }

  const proposed = applyStep(current, action);
  if (!withinHardLimits(proposed)) {
    return {
      adaptive: baseline,
      safe: false,
      reason: `Proposed "${action}" exceeded clinical limits — reverted to baseline controller`,
      actionApplied: action,
    };
  }

  return { adaptive: proposed, safe: true, reason: null, actionApplied: action };
}

export const SAFETY_LIMITS = {
  HARD_MAX_SPEED,
  HARD_MIN_SPAWN_DELAY,
  HARD_MAX_COGNITIVE_LOAD,
  MANDATORY_REST_FATIGUE,
};
