import type { SessionMetrics, PatientState } from '../types';

/**
 * Patient-State Estimator.
 *
 * Plays the architectural role of the CNN+LSTM "DL Model" in the project
 * proposal: it turns a rolling window of raw per-trial signals (reaction
 * time, drift, correctness) into a multi-dimensional Patient State. It is
 * implemented with rolling statistical feature extraction (windowed mean,
 * linear-trend slope, variance) rather than a trained neural network —
 * there is no labeled clinical dataset or training pipeline available in
 * this environment. The interface is intentionally the same shape a real
 * trained model would expose, so one can be substituted later without
 * touching any caller.
 */

const WINDOW = 8;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);

/** Least-squares slope of a short series, normalised to roughly [-1, 1]. */
function trendSlope(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const xs = values.map((_, i) => i);
  const xMean = mean(xs);
  const yMean = mean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const scale = Math.max(1, Math.abs(yMean)) * 0.15;
  return clamp(slope / scale, -1, 1);
}

/**
 * Estimate the current Patient State from session metrics.
 * `fatigue` is the already-computed fatigue scalar (single source of
 * truth, shared with the rest of the app's HUD/history) rather than
 * re-derived here.
 */
export function estimatePatientState(metrics: SessionMetrics, fatigue: number): PatientState {
  const total = metrics.totalReactions || 1;
  const recentRT = metrics.reactionTimes.slice(-WINDOW);
  const recentDrift = metrics.driftMagnitudes.slice(-WINDOW);

  const avgRT = mean(recentRT) || 900;
  const rtImprovement = -trendSlope(recentRT); // falling RT over the window = improving
  const accuracy = metrics.correctReactions / total;

  const cognitiveBase = (1 - clamp((avgRT - 180) / 900, 0, 1)) * accuracy * 100;
  const cognitiveAbility = clamp(cognitiveBase + rtImprovement * 12, 0, 100);

  const avgDrift = mean(recentDrift);
  const driftVariance = recentDrift.length > 1
    ? mean(recentDrift.map((d) => (d - avgDrift) ** 2))
    : 0;
  const motorStability = clamp((1 - clamp(avgDrift / 2.5, 0, 1)) * 100 - driftVariance * 20, 0, 100);

  const errorTendency = clamp((metrics.inhibitionErrors + metrics.falsePositives) / total, 0, 1);

  return {
    cognitiveAbility,
    motorStability,
    fatigueProbability: clamp(fatigue, 0, 1),
    errorTendency,
  };
}
