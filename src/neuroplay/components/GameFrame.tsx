import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { DifficultyLevel, GameId, TrialResult } from '../types';
import { DOMAIN_LABEL, GAME_META } from '../types';
import { useNeuroPlayStore } from '../store/useNeuroPlayStore';
import { updateDifficulty } from '../engine/adaptiveEngine';
import { calculateAccuracy, calculateSessionScore, mean } from '../engine/scoringEngine';
import { estimateFatigue, fatigueBand, restRecommendation } from '../engine/fatigueEngine';
import { generateGameRecommendation } from '../engine/recommendationEngine';

export interface PlayingContext {
  difficulty: DifficultyLevel;
  trialCount: number;
  recordTrial: (correct: boolean, reactionTimeMs?: number | null) => void;
  endGame: () => void;
}

type Phase = 'intro' | 'countdown' | 'playing' | 'results';

export function GameFrame({ gameId, instructions, children }: {
  gameId: GameId;
  instructions: string[];
  children: (ctx: PlayingContext) => ReactNode;
}) {
  const meta = GAME_META[gameId];
  const startingDifficulty = useNeuroPlayStore((s) => s.difficultyByGame[gameId]);
  const addGameSession = useNeuroPlayStore((s) => s.addGameSession);
  const closeGame = useNeuroPlayStore((s) => s.closeGame);
  const navigate = useNeuroPlayStore((s) => s.navigate);
  const inTrainingSession = useNeuroPlayStore((s) => s.trainingQueue !== null);
  const advanceTrainingSession = useNeuroPlayStore((s) => s.advanceTrainingSession);
  // Select the stable `sessions` array reference and derive the filtered
  // list in a memo — computing a fresh array inside the selector itself
  // would make useSyncExternalStore see a "changed" snapshot on every
  // read and re-render forever.
  const sessions = useNeuroPlayStore((s) => s.sessions);
  const priorScores = useMemo(
    () => sessions.filter((x) => x.domain === meta.domain).slice(0, 5).map((x) => x.score),
    [sessions, meta.domain],
  );

  const [phase, setPhase] = useState<Phase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(startingDifficulty);
  const [fatigueLevel, setFatigueLevel] = useState(0);
  const trialsRef = useRef<TrialResult[]>([]);
  const sessionStartRef = useRef(0);
  const difficultyStartRef = useRef<DifficultyLevel>(startingDifficulty);
  const [, forceRender] = useState(0);
  const [result, setResult] = useState<{
    accuracy: number; avgReactionMs: number | null; score: number;
    fatigueLevel: number; mistakes: number; recommendation: string;
  } | null>(null);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      trialsRef.current = [];
      sessionStartRef.current = Date.now();
      difficultyStartRef.current = difficulty;
      setFatigueLevel(0);
      setPhase('playing');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, countdown, difficulty]);

  const start = () => { setCountdown(3); setPhase('countdown'); };

  const recordTrial: PlayingContext['recordTrial'] = (correct, reactionTimeMs = null) => {
    trialsRef.current = [...trialsRef.current, { correct, reactionTimeMs, difficulty, timestamp: Date.now() }]; // eslint-disable-line react-hooks/purity -- timestamp only recorded from user-triggered event handlers
    const nextFatigue = estimateFatigue(trialsRef.current, sessionStartRef.current);
    const nextDifficulty = updateDifficulty(trialsRef.current, difficulty, nextFatigue);
    setFatigueLevel(nextFatigue);
    if (nextDifficulty !== difficulty) setDifficulty(nextDifficulty);
    forceRender((n) => n + 1);
  };

  const endGame = () => {
    const trials = trialsRef.current;
    const accuracy = calculateAccuracy(trials);
    const times = trials.map((t) => t.reactionTimeMs).filter((t): t is number => t !== null);
    const avgReactionMs = times.length ? Math.round(mean(times)) : null;
    const score = calculateSessionScore(trials, difficulty);
    const mistakes = trials.filter((t) => !t.correct).length;

    const session = {
      id: Math.random().toString(36).slice(2, 11), // eslint-disable-line react-hooks/purity -- id only generated from a user-triggered event handler
      gameId, domain: meta.domain, date: new Date().toISOString(),
      trials, accuracy, avgReactionMs,
      difficultyStart: difficultyStartRef.current, difficultyEnd: difficulty,
      score, fatigueLevel,
    };
    addGameSession(session);

    const rest = restRecommendation(fatigueLevel);
    const recommendation = rest ?? generateGameRecommendation(session, priorScores);
    setResult({ accuracy, avgReactionMs, score, fatigueLevel, mistakes, recommendation });
    setPhase('results');
  };

  const playAgain = () => { setDifficulty(startingDifficulty); setPhase('intro'); setResult(null); };
  const backToDashboard = () => { closeGame(); navigate('dashboard'); };

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-center p-6 md:p-10">
      {phase === 'intro' && (
        <div className="np-card max-w-xl w-full p-8 md:p-10 text-center">
          <p className="text-sm uppercase tracking-widest text-teal-400 font-semibold mb-2">Training Focus · {DOMAIN_LABEL[meta.domain]}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-50 mb-4">{meta.description}</h2>
          <ul className="text-left space-y-2 mb-8 text-slate-300 text-base md:text-lg">
            {instructions.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-teal-400 mt-1">•</span><span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-slate-400">
            <span>Starting difficulty:</span>
            <DifficultyDots level={startingDifficulty} />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            This is self-paced training. Difficulty adjusts gradually from your performance and you can stop whenever you need a break.
          </p>
          <button className="np-btn-primary" onClick={start}>Start</button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="np-card max-w-xl w-full p-16 text-center">
          <span className="text-7xl font-black text-teal-400">{countdown > 0 ? countdown : 'Go!'}</span>
        </div>
      )}

      {phase === 'playing' && (
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <span className="text-lg font-semibold text-slate-100">{meta.name}</span>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-2">Difficulty <DifficultyDots level={difficulty} /></span>
              <span>Trials: {trialsRef.current.length}</span>
              {fatigueLevel >= 35 && (
                <span className={fatigueLevel >= 65 ? 'text-amber-400' : 'text-slate-400'}>
                  Fatigue: {fatigueBand(fatigueLevel)}
                </span>
              )}
            </div>
          </div>
          {children({ difficulty, trialCount: trialsRef.current.length, recordTrial, endGame })}
        </div>
      )}

      {phase === 'results' && result && (
        <div className="np-card max-w-xl w-full p-8 md:p-10">
          <p className="text-sm uppercase tracking-widest text-teal-400 font-semibold mb-1">Session Complete</p>
          <h2 className="text-2xl font-bold text-slate-50 mb-6">{meta.name}</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatBlock label="Score" value={result.score} />
            <StatBlock label="Accuracy" value={`${result.accuracy}%`} />
            {result.avgReactionMs !== null && <StatBlock label="Avg Reaction" value={`${result.avgReactionMs} ms`} />}
            <StatBlock label="Difficulty" value={`Level ${difficulty}`} />
            <StatBlock label="Mistakes" value={result.mistakes} />
            <StatBlock label="Fatigue" value={fatigueBand(result.fatigueLevel)} />
          </div>

          <div className="np-callout mb-8">{result.recommendation}</div>
          <p className="text-xs text-slate-500 text-center mb-6">
            This result is a training indicator for {DOMAIN_LABEL[meta.domain].toLowerCase()}, not a clinical assessment.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            {inTrainingSession ? (
              <button className="np-btn-primary" onClick={advanceTrainingSession}>Continue</button>
            ) : (
              <>
                <button className="np-btn-primary" onClick={playAgain}>Play Again</button>
                <button className="np-btn-secondary" onClick={backToDashboard}>Back to Dashboard</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DifficultyDots({ level }: { level: DifficultyLevel }) {
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: i <= level ? '#2dd4bf' : 'rgba(148,163,184,0.25)' }}
        />
      ))}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="np-stat">
      <p className="np-stat-label">{label}</p>
      <p className="np-stat-value">{value}</p>
    </div>
  );
}
