import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PatientState, RLAction } from '../types';

/**
 * RL Controller.
 *
 * Implements the State -> Action -> Reward loop from the project proposal
 * as a tabular, epsilon-greedy Q-learning agent over a discretised patient
 * state. It is a genuine, working reinforcement-learning algorithm (the
 * same family as the Multi-Armed Bandit approach cited in the literature
 * survey) — not a stand-in — chosen because it needs no external training
 * data or GPU: it learns entirely on-device from real session outcomes,
 * and its Q-table persists to localStorage so learning carries across
 * sessions (the "Across-session" tier of the proposal's Two-Tiered
 * Personalization).
 */

export const RL_ACTIONS: RLAction[] = [
  'increase_difficulty',
  'decrease_difficulty',
  'increase_cognitive_load',
  'increase_motor_load',
  'trigger_rest',
  'hold_steady',
];

const ALPHA = 0.25; // learning rate
const GAMMA = 0.85; // discount factor
const MIN_EPSILON = 0.05;

type QRow = Record<RLAction, number>;

function emptyRow(): QRow {
  return RL_ACTIONS.reduce((acc, a) => { acc[a] = 0; return acc; }, {} as QRow);
}

function bin(v: number, lo: number, hi: number): 'low' | 'mid' | 'high' {
  const t = (v - lo) / (hi - lo || 1);
  return t < 0.34 ? 'low' : t < 0.67 ? 'mid' : 'high';
}

/** Discretise a continuous Patient State into a compact Q-table key. */
export function stateKey(s: PatientState): string {
  return [
    bin(s.cognitiveAbility, 0, 100),
    bin(s.motorStability, 0, 100),
    bin(s.fatigueProbability, 0, 1),
    bin(s.errorTendency, 0, 1),
  ].join('|');
}

/**
 * Reward shaping matching the proposal:
 *  Positive - patient improvement, stable performance under challenge.
 *  Negative - excessive errors, high fatigue events, overload.
 */
export function computeReward(prev: PatientState, next: PatientState, safetyIntervened: boolean): number {
  let reward = 0;
  reward += (next.cognitiveAbility - prev.cognitiveAbility) * 0.04;
  reward += (next.motorStability - prev.motorStability) * 0.03;
  reward -= (next.errorTendency - prev.errorTendency) * 6;
  reward -= Math.max(0, next.fatigueProbability - 0.6) * 8;
  if (next.fatigueProbability > 0.85) reward -= 3;
  if (safetyIntervened) reward -= 1; // discourage actions that need overriding
  return Math.max(-10, Math.min(10, reward));
}

interface RLStore {
  qTable: Record<string, QRow>;
  episodeCount: number;
  bootstrapped: boolean;
  chooseAction: (state: PatientState) => RLAction;
  updateQ: (prevState: PatientState, action: RLAction, reward: number, nextState: PatientState) => void;
  markBootstrapped: () => void;
  resetLearning: () => void;
}

export const useRLStore = create<RLStore>()(
  persist(
    (set, get) => ({
      qTable: {},
      episodeCount: 0,
      bootstrapped: false,

      chooseAction: (state) => {
        const { qTable, episodeCount } = get();
        const key = stateKey(state);
        const row = qTable[key] ?? emptyRow();
        const epsilon = Math.max(MIN_EPSILON, 0.35 - episodeCount * 0.0015);

        if (Math.random() < epsilon) {
          return RL_ACTIONS[Math.floor(Math.random() * RL_ACTIONS.length)];
        }
        let best: RLAction = RL_ACTIONS[0];
        let bestVal = -Infinity;
        for (const a of RL_ACTIONS) {
          if (row[a] > bestVal) { bestVal = row[a]; best = a; }
        }
        return best;
      },

      updateQ: (prevState, action, reward, nextState) => {
        set((s) => {
          const prevKey = stateKey(prevState);
          const nextKey = stateKey(nextState);
          const prevRow = { ...(s.qTable[prevKey] ?? emptyRow()) };
          const nextRow = s.qTable[nextKey] ?? emptyRow();
          const maxNext = Math.max(...RL_ACTIONS.map((a) => nextRow[a]));
          prevRow[action] = prevRow[action] + ALPHA * (reward + GAMMA * maxNext - prevRow[action]);
          return {
            qTable: { ...s.qTable, [prevKey]: prevRow },
            episodeCount: s.episodeCount + 1,
          };
        });
      },

      markBootstrapped: () => set({ bootstrapped: true }),
      resetLearning: () => set({ qTable: {}, episodeCount: 0, bootstrapped: false }),
    }),
    { name: 'neuro-adapt-rl' }
  )
);
