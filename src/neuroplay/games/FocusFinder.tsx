import { useEffect, useMemo, useRef, useState } from 'react';
import { GameFrame, type PlayingContext } from '../components/GameFrame';

const LETTERS_EASY = ['A', 'B', 'D', 'E', 'F', 'G', 'H'];
const LETTERS_HARD = ['A', 'B', 'D', 'E', 'F', 'G', 'H', 'K', 'Y', 'V']; // visually closer to X

function seqLengthForLevel(level: number) { return [16, 20, 26, 32, 40][level - 1] ?? 16; }
function intervalForLevel(level: number) { return [1100, 950, 800, 650, 520][level - 1] ?? 1100; }

function buildSequence(level: number): string[] {
  const pool = level >= 4 ? LETTERS_HARD : LETTERS_EASY;
  const len = seqLengthForLevel(level);
  return Array.from({ length: len }, () => (Math.random() < 0.28 ? 'X' : pool[Math.floor(Math.random() * pool.length)]));
}

export function FocusFinder() {
  return (
    <GameFrame
      gameId="focus-finder"
      instructions={[
        'Letters will appear one at a time.',
        'Click "Tap" (or press Space) whenever you see the letter X.',
        'Do nothing for every other letter.',
      ]}
    >
      {(ctx) => <Round {...ctx} />}
    </GameFrame>
  );
}

function Round({ difficulty, recordTrial, endGame }: PlayingContext) {
  const [roundDifficulty] = useState(difficulty);
  const sequence = useMemo(() => buildSequence(roundDifficulty), [roundDifficulty]);
  const interval = intervalForLevel(roundDifficulty);
  const [index, setIndex] = useState(-1);
  const [flash, setFlash] = useState(false);
  const tappedRef = useRef(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (index === -1) { const t = setTimeout(() => setIndex(0), 900); return () => clearTimeout(t); }
    if (index >= sequence.length) { endGame(); return; }

    tappedRef.current = false;
    shownAtRef.current = Date.now();
    const isX = sequence[index] === 'X';

    const t = setTimeout(() => {
      const tapped = tappedRef.current;
      const correct = isX ? tapped : !tapped;
      recordTrial(correct, isX && tapped ? Date.now() - shownAtRef.current : null);
      setIndex((i) => i + 1);
    }, interval);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const tap = () => {
    if (tappedRef.current || index < 0 || index >= sequence.length) return;
    tappedRef.current = true;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const current = index >= 0 && index < sequence.length ? sequence[index] : null;

  return (
    <div className="np-card p-12 text-center">
      <p className="text-sm text-slate-500 mb-6">
        {index >= 0 ? `Letter ${Math.min(index + 1, sequence.length)} of ${sequence.length}` : 'Get ready...'}
      </p>
      <div className="np-letter-stage" style={{ background: flash ? 'rgba(45,212,191,0.18)' : undefined }}>
        <span className="text-7xl font-black text-slate-50">{current ?? '·'}</span>
      </div>
      <button className="np-btn-primary mt-8" onClick={tap}>Tap (X)</button>
    </div>
  );
}
