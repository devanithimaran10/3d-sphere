/**
 * Cognitive progress prediction.
 *
 * Works identically for every game mode (core CMCI modes and mini-games)
 * because it only ever operates on a plain 0-100 "unified score" series —
 * it never looks at how that score was computed. A simple linear-regression
 * slope over the recent window both classifies the trend and extrapolates
 * a predicted next score.
 */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

export interface ProgressPrediction {
  trendDirection: 'up' | 'down' | 'flat';
  changeVsAverage: number; // current score minus average of all prior scores
  predictedNext: number;   // naive linear projection, clamped 0-100
  sampleSize: number;
}

/** `scoresOldestFirst` must end with the most recent (current) score. */
export function predictProgress(scoresOldestFirst: number[]): ProgressPrediction {
  const n = scoresOldestFirst.length;
  if (n === 0) return { trendDirection: 'flat', changeVsAverage: 0, predictedNext: 50, sampleSize: 0 };

  const current = scoresOldestFirst[n - 1];
  const prior = scoresOldestFirst.slice(0, -1);
  const changeVsAverage = Math.round(current - (prior.length ? mean(prior) : current));

  const window = scoresOldestFirst.slice(-8);
  const wn = window.length;
  let slope = 0;
  if (wn >= 2) {
    const xs = window.map((_, i) => i);
    const xMean = mean(xs);
    const yMean = mean(window);
    let num = 0;
    let den = 0;
    for (let i = 0; i < wn; i++) {
      num += (xs[i] - xMean) * (window[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    slope = den === 0 ? 0 : num / den;
  }

  const trendDirection: 'up' | 'down' | 'flat' = slope > 1.5 ? 'up' : slope < -1.5 ? 'down' : 'flat';
  const predictedNext = Math.round(clamp(current + slope, 0, 100));

  return { trendDirection, changeVsAverage, predictedNext, sampleSize: n };
}

/**
 * Normalise a raw score (any scale — mini-game points, CMCI, etc.) to 0-100
 * relative to the player's own all-time range for that same metric, so
 * every game produces a comparable "unified cognitive score" without any
 * per-game tuning. 100 = personal best so far, 0 = personal worst so far.
 * Needs at least one prior data point to be meaningful; otherwise returns
 * a neutral baseline of 50.
 */
export function normalizeScore(rawScore: number, priorScores: number[]): number {
  if (priorScores.length === 0) return 50;
  const all = [...priorScores, rawScore];
  const min = Math.min(...all);
  const max = Math.max(...all);
  if (max === min) return 50;
  return Math.round(((rawScore - min) / (max - min)) * 100);
}
