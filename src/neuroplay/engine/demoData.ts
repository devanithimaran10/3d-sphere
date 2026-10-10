import type { DifficultyLevel, GameId, GameSessionResult, TrialResult } from '../types';
import { GAME_META } from '../types';
import { calculateAccuracy } from './scoringEngine';
import { calculateSessionScore } from './scoringEngine';
import { estimateFatigue } from './fatigueEngine';

/** Generates realistic-looking historical demo data (gradual improvement
 *  across 7 sessions) so the dashboard isn't empty on first launch.
 *  Every record is tagged `isDemo: true` and must never be presented as
 *  real user data. */

const DEMO_ROTATION: GameId[] = [
  'word-recall', 'pattern-recall', 'focus-finder', 'sequence-master',
  'rule-switch', 'quick-response', 'scene-memory',
];

function buildTrials(count: number, difficulty: DifficultyLevel, targetAccuracy: number, avgRtMs: number, seed: number): TrialResult[] {
  const trials: TrialResult[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const noise = Math.sin(seed + i * 1.7) * 12;
    const correct = Math.random() * 100 < targetAccuracy + noise;
    const rtNoise = Math.sin(seed + i * 2.3) * 150;
    trials.push({
      correct,
      reactionTimeMs: Math.round(avgRtMs + rtNoise + (correct ? 0 : 120)),
      difficulty,
      timestamp: now - (count - i) * 1500,
    });
  }
  return trials;
}

export function generateDemoSessions(): GameSessionResult[] {
  const sessions: GameSessionResult[] = [];
  const days = 7;

  for (let d = 0; d < days; d++) {
    const progress = d / (days - 1); // 0 -> 1 across the week
    const gameId = DEMO_ROTATION[d % DEMO_ROTATION.length];
    const domain = GAME_META[gameId].domain;

    const difficultyStart = (1 + Math.floor(progress * 2)) as DifficultyLevel;
    const difficultyEnd = Math.min(5, difficultyStart + (Math.random() > 0.6 ? 1 : 0)) as DifficultyLevel;
    const targetAccuracy = 58 + progress * 28; // 58% -> 86%
    const avgRt = 1450 - progress * 500;        // 1450ms -> 950ms

    const trials = buildTrials(12, difficultyEnd, targetAccuracy, avgRt, d * 3.1);
    const accuracy = calculateAccuracy(trials);
    const avgReactionMs = Math.round(
      trials.reduce((s, t) => s + (t.reactionTimeMs ?? 0), 0) / trials.length,
    );
    const fatigueLevel = estimateFatigue(trials, Date.now() - (days - d) * 86400000 - 6 * 60000);
    const score = calculateSessionScore(trials, difficultyEnd);

    sessions.push({
      id: `demo-${d}-${gameId}`,
      gameId,
      domain,
      date: new Date(Date.now() - (days - d) * 86400000).toISOString(),
      trials,
      accuracy,
      avgReactionMs,
      difficultyStart,
      difficultyEnd,
      score,
      fatigueLevel,
      isDemo: true,
    });
  }

  return sessions.reverse(); // newest first, matching real session ordering
}
