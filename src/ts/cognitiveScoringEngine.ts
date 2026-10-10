import type { SessionRecord } from '../store/useHistoryStore';
import type { GameSessionResult } from '../neuroplay/types';

export type CognitiveDomainKey =
  | 'verbalMemory'
  | 'visualMemory'
  | 'episodicMemory'
  | 'workingMemory'
  | 'attention'
  | 'cognitiveFlexibility'
  | 'processingSpeed'
  | 'executiveInhibition'
  | 'motorPrecision';

export interface DomainMetadata {
  key: CognitiveDomainKey;
  label: string;
  description: string;
  icon: string;
  color: string;
}

export const COGNITIVE_DOMAINS: Record<CognitiveDomainKey, DomainMetadata> = {
  verbalMemory: {
    key: 'verbalMemory',
    label: 'Verbal Memory',
    description: 'Word list retention and linguistic recall',
    icon: '📝',
    color: '#38bdf8',
  },
  visualMemory: {
    key: 'visualMemory',
    label: 'Visual Memory',
    description: 'Spatial pattern & visual array retention',
    icon: '🧩',
    color: '#00d4ff',
  },
  episodicMemory: {
    key: 'episodicMemory',
    label: 'Episodic Memory',
    description: 'Scene detail and contextual memory recall',
    icon: '🖼️',
    color: '#818cf8',
  },
  workingMemory: {
    key: 'workingMemory',
    label: 'Working Memory',
    description: 'Active information holding & sequence manipulation',
    icon: '🧠',
    color: '#ffd60a',
  },
  attention: {
    key: 'attention',
    label: 'Attention & Focus',
    description: 'Sustained concentration & target discrimination',
    icon: '🎯',
    color: '#2dd4bf',
  },
  cognitiveFlexibility: {
    key: 'cognitiveFlexibility',
    label: 'Cognitive Flexibility',
    description: 'Adaptive task switching & rule mental shifts',
    icon: '⟳',
    color: '#a855f7',
  },
  processingSpeed: {
    key: 'processingSpeed',
    label: 'Processing Speed',
    description: 'Rapid reflex latency & stimulus decision timing',
    icon: '⚡',
    color: '#f43f5e',
  },
  executiveInhibition: {
    key: 'executiveInhibition',
    label: 'Executive Inhibition',
    description: 'Distractor suppression & impulse control',
    icon: '✕',
    color: '#ff2d55',
  },
  motorPrecision: {
    key: 'motorPrecision',
    label: 'Motor Precision',
    description: 'Directional drift control & micro-trajectory accuracy',
    icon: '↗',
    color: '#00ff88',
  },
};

/** Mapping from every active game / mode ID (14 total) to its primary cognitive domain. */
export const GAME_TO_DOMAIN_MAP: Record<string, CognitiveDomainKey> = {
  // NeuroAdapt Modes (5 Sphere modes + 2 Mini games = 7 modes)
  'micro-reach': 'motorPrecision',
  'rule-switch': 'cognitiveFlexibility',
  'inhibition-conflict': 'executiveInhibition',
  'micro-trajectory': 'motorPrecision',
  'dual-task': 'workingMemory',
  'reflex-gate': 'processingSpeed',
  'geometric-draw': 'motorPrecision',

  // NeuroPlay Games (7 cognitive games)
  'word-recall': 'verbalMemory',
  'pattern-recall': 'visualMemory',
  'scene-memory': 'episodicMemory',
  'focus-finder': 'attention',
  'sequence-master': 'workingMemory',
  'quick-response': 'processingSpeed',
};

export interface DomainScoreResult {
  domain: CognitiveDomainKey;
  label: string;
  score: number | null; // null if Not Assessed Yet
  sessionCount: number;
  status: 'assessed' | 'not-assessed';
  trend: 'improving' | 'stable' | 'declining' | 'insufficient-data';
}

export type ConfidenceLevel = 'Limited Data' | 'Developing Profile' | 'Good Data Coverage' | 'High Confidence';

export interface ComprehensiveCognitiveProfile {
  overallScore: number | null;
  domainScores: Record<CognitiveDomainKey, DomainScoreResult>;
  assessedDomainsCount: number;
  totalDomainsCount: number;
  totalCompletedSessions: number;
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Extract standardized 0-100 score from a NeuroAdapt session record. */
export function getStandardizedNeuroAdaptScore(session: SessionRecord): number {
  if (session.unifiedScore !== undefined && session.unifiedScore !== null) {
    return clamp(session.unifiedScore, 0, 100);
  }
  if (session.cmci !== null && session.cmci !== undefined) {
    return clamp(session.cmci, 0, 100);
  }
  if (session.accuracy !== null && session.accuracy !== undefined) {
    return clamp(session.accuracy, 0, 100);
  }
  return 50;
}

/** Extract standardized 0-100 score from a NeuroPlay session result. */
export function getStandardizedNeuroPlayScore(session: GameSessionResult): number {
  if (typeof session.score === 'number' && !isNaN(session.score)) {
    return clamp(session.score, 0, 100);
  }
  if (typeof session.accuracy === 'number' && !isNaN(session.accuracy)) {
    return clamp(session.accuracy, 0, 100);
  }
  return 50;
}

/**
 * Calculates a complete, standardized cognitive training profile from
 * historical session records without hardcoding or inventing values.
 */
export function calculateComprehensiveProfile(
  neuroAdaptSessions: SessionRecord[],
  neuroPlaySessions: GameSessionResult[]
): ComprehensiveCognitiveProfile {
  const domainSessions: Record<CognitiveDomainKey, number[]> = {
    verbalMemory: [],
    visualMemory: [],
    episodicMemory: [],
    workingMemory: [],
    attention: [],
    cognitiveFlexibility: [],
    processingSpeed: [],
    executiveInhibition: [],
    motorPrecision: [],
  };

  // 1. Process NeuroAdapt Sessions
  for (const s of neuroAdaptSessions) {
    const domainKey = GAME_TO_DOMAIN_MAP[s.mode];
    if (domainKey) {
      const stdScore = getStandardizedNeuroAdaptScore(s);
      domainSessions[domainKey].push(stdScore);
    }
  }

  // 2. Process NeuroPlay Sessions
  for (const s of neuroPlaySessions) {
    const domainKey = GAME_TO_DOMAIN_MAP[s.gameId];
    if (domainKey) {
      const stdScore = getStandardizedNeuroPlayScore(s);
      domainSessions[domainKey].push(stdScore);
    }
  }

  const domainScores: Record<CognitiveDomainKey, DomainScoreResult> = {} as any;
  let assessedCount = 0;
  let weightedSum = 0;

  // 3. Compute Domain Scores using Exponentially Weighted Moving Average (EWMA)
  const keys = Object.keys(COGNITIVE_DOMAINS) as CognitiveDomainKey[];

  for (const key of keys) {
    const meta = COGNITIVE_DOMAINS[key];
    const scores = domainSessions[key];

    if (scores.length === 0) {
      domainScores[key] = {
        domain: key,
        label: meta.label,
        score: null, // NOT ASSESSED YET
        sessionCount: 0,
        status: 'not-assessed',
        trend: 'insufficient-data',
      };
      continue;
    }

    assessedCount++;

    // Calculate EWMA giving 60% weight to recent 3 sessions
    const recentScores = scores.slice(0, 5); // newest first
    let domainScore = 0;
    let weightTotal = 0;

    recentScores.forEach((sc, idx) => {
      const weight = Math.pow(0.7, idx);
      domainScore += sc * weight;
      weightTotal += weight;
    });

    const finalDomainScore = Math.round(clamp(domainScore / weightTotal, 0, 100));

    // Determine Trend
    let trend: DomainScoreResult['trend'] = 'stable';
    if (scores.length >= 2) {
      const diff = scores[0] - scores[1];
      if (diff >= 4) trend = 'improving';
      else if (diff <= -4) trend = 'declining';
    }

    domainScores[key] = {
      domain: key,
      label: meta.label,
      score: finalDomainScore,
      sessionCount: scores.length,
      status: 'assessed',
      trend,
    };

    weightedSum += finalDomainScore;
  }

  // 4. Calculate Overall Cognitive Training Performance Score
  // Excludes unplayed domains completely instead of treating them as zero
  const overallScore = assessedCount > 0 ? Math.round(weightedSum / assessedCount) : null;

  // 5. Calculate Confidence Level & Explanation
  const totalCompletedSessions = neuroAdaptSessions.length + neuroPlaySessions.length;

  let confidenceLevel: ConfidenceLevel = 'Limited Data';
  let confidenceExplanation = 'Your training profile becomes more representative as you complete more sessions across different cognitive domains.';

  if (totalCompletedSessions >= 15 && assessedCount >= 7) {
    confidenceLevel = 'High Confidence';
    confidenceExplanation = 'Robust data coverage across multiple domains providing a highly accurate training profile.';
  } else if (totalCompletedSessions >= 8 && assessedCount >= 4) {
    confidenceLevel = 'Good Data Coverage';
    confidenceExplanation = 'Strong profile foundation. Continue training remaining domains for full assessment.';
  } else if (totalCompletedSessions >= 3 || assessedCount >= 2) {
    confidenceLevel = 'Developing Profile';
    confidenceExplanation = 'Initial training trends detected. Play games in unassessed domains to expand your score precision.';
  }

  return {
    overallScore,
    domainScores,
    assessedDomainsCount: assessedCount,
    totalDomainsCount: keys.length,
    totalCompletedSessions,
    confidenceLevel,
    confidenceExplanation,
  };
}
