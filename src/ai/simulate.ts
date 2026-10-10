import type { AdaptiveParams, PatientState } from '../types';
import { useRLStore, computeReward } from './rlController';
import { applyAction } from './safetyLayer';

/**
 * Simulation-First Strategy.
 *
 * Bootstraps the RL controller's Q-table against synthetic patient
 * profiles before any real session runs, so the very first real user
 * doesn't face a cold, randomly-acting agent. Runs once, synchronously,
 * entirely in-browser — no external data needed. Gated by
 * `useRLStore.bootstrapped` so it never re-runs once seeded.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Archetype = 'fast-learner' | 'fatigue-prone' | 'high-error' | 'steady';

const ARCHETYPES: Archetype[] = ['fast-learner', 'fatigue-prone', 'high-error', 'steady'];

function stepPatient(state: PatientState, archetype: Archetype, adaptive: AdaptiveParams): PatientState {
  const difficulty = adaptive.objectSpeed / 2.2; // 0..1 rough proxy
  let { cognitiveAbility, motorStability, fatigueProbability, errorTendency } = state;

  switch (archetype) {
    case 'fast-learner':
      cognitiveAbility += (1 - difficulty) * 6 + Math.random() * 4;
      motorStability += 2;
      fatigueProbability += 0.01;
      errorTendency = clamp(errorTendency + (difficulty - 0.5) * 0.05, 0, 1);
      break;
    case 'fatigue-prone':
      fatigueProbability += 0.04 + difficulty * 0.03;
      cognitiveAbility -= fatigueProbability * 8;
      errorTendency = clamp(errorTendency + fatigueProbability * 0.06, 0, 1);
      break;
    case 'high-error':
      errorTendency = clamp(errorTendency + 0.03 + difficulty * 0.04, 0, 1);
      cognitiveAbility -= errorTendency * 5;
      fatigueProbability += 0.015;
      break;
    case 'steady':
    default:
      cognitiveAbility += (Math.random() - 0.45) * 3;
      motorStability += (Math.random() - 0.45) * 3;
      fatigueProbability += 0.008;
      break;
  }

  // Rest actions and low difficulty recover fatigue over time.
  if (difficulty < 0.35) fatigueProbability -= 0.05;

  return {
    cognitiveAbility: clamp(cognitiveAbility, 0, 100),
    motorStability: clamp(motorStability, 0, 100),
    fatigueProbability: clamp(fatigueProbability, 0, 1),
    errorTendency: clamp(errorTendency, 0, 1),
  };
}

const BASELINE_ADAPTIVE: AdaptiveParams = {
  objectSpeed: 0.75, targetSize: 1.15, cognitiveLoad: 0.4, spawnDelay: 2200,
};

export function bootstrapFromSimulation(episodes = 40, trialsPerEpisode = 25) {
  const rl = useRLStore.getState();
  if (rl.bootstrapped) return;

  for (let e = 0; e < episodes; e++) {
    const archetype = ARCHETYPES[e % ARCHETYPES.length];
    let state: PatientState = {
      cognitiveAbility: 40 + Math.random() * 20,
      motorStability: 40 + Math.random() * 20,
      fatigueProbability: 0.1,
      errorTendency: 0.2,
    };
    let adaptive: AdaptiveParams = { ...BASELINE_ADAPTIVE };

    for (let t = 0; t < trialsPerEpisode; t++) {
      const action = useRLStore.getState().chooseAction(state);
      const { adaptive: nextAdaptive, safe } = applyAction(action, adaptive, state, BASELINE_ADAPTIVE);
      const nextState = stepPatient(state, archetype, nextAdaptive);
      const reward = computeReward(state, nextState, !safe);
      useRLStore.getState().updateQ(state, action, reward, nextState);
      state = nextState;
      adaptive = nextAdaptive;
    }
  }

  useRLStore.getState().markBootstrapped();
}
