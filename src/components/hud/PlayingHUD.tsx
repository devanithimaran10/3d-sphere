import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { GameMode, SphereColor, SphereAction } from '../../types';
import { MODES } from './modes';
import { DiffPips, RulesLegend } from './shared';
import { AIInsightsPanel } from './AIInsightsPanel';
import { SensorBadge } from './SensorBadge';

export function PlayingHUD() {
  const {
    mode, metrics, adaptive, timeLeft, totalDuration, fatigue, paused,
    ruleSwitchAlert, endSession, tick, pauseSession, resumeSession,
    spawnSphere, registerInhibition, registerMiss,
    triggerRuleSwitch,
  } = useGameStore();
  const tapToSelect = useSettingsStore((s) => s.tapToSelect);

  const spawnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const switchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameReadyRef  = useRef(false);
  const [countdown, setCountdown] = useState<number | null>(3);

  // Session countdown
  useEffect(() => {
    const id = setInterval(() => tick(100), 100);
    return () => clearInterval(id);
  }, [tick]);

  // 3-2-1-GO! countdown before spheres spawn
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setCountdown(2), 900));
    timers.push(setTimeout(() => setCountdown(1), 1800));
    timers.push(setTimeout(() => setCountdown(0), 2700));
    timers.push(setTimeout(() => { setCountdown(null); gameReadyRef.current = true; }, 3400));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Keyboard controls: ← → arrows + Space
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const gs = useGameStore.getState();
      if (gs.phase !== 'playing' || gs.paused) return;
      if (!gameReadyRef.current) return;
      const { activeSpheres, rules, registerInput } = useGameStore.getState();

      let action: SphereAction | null = null;
      if (e.key === 'ArrowLeft')  action = 'left';
      if (e.key === 'ArrowRight') action = 'right';
      if (e.key === ' ')          action = 'hold';
      if (!action) return;
      e.preventDefault();

      const target = activeSpheres.find(
        (s) => !s.isDistractor && s.color !== 'red' && rules[s.color] === action
      );
      if (target) {
        registerInput({
          sphereId: target.id,
          action,
          reactionTime: Date.now() - target.spawnTime,
          driftMagnitude: 0,
        });
      }
    };
    window.addEventListener('keydown', handleKey);
  }, []);

  // Sphere spawn loop
  useEffect(() => {
    const POSITIONS: [number, number, number][] = [
      [-2.8, 0.6, 0], [-1.4, -0.4, 0], [0, 0.7, 0], [1.4, -0.4, 0], [2.8, 0.6, 0],
    ];

    const WEIGHTS: Record<GameMode, number[]> = {
      'micro-reach':          [0.28, 0.28, 0.22, 0.22],
      'rule-switch':          [0.26, 0.26, 0.24, 0.24],
      'inhibition-conflict':  [0.22, 0.22, 0.38, 0.18],
      'micro-trajectory':     [0.30, 0.30, 0.18, 0.22],
      'dual-task':            [0.25, 0.25, 0.28, 0.22],
      'reflex-gate':          [0.28, 0.28, 0.22, 0.22],
      'geometric-draw':       [0.28, 0.28, 0.22, 0.22],
    };

    const pickColor = (): SphereColor => {
      const colors: SphereColor[] = ['green', 'blue', 'red', 'yellow'];
      const w = WEIGHTS[mode];
      const r = Math.random();
      let acc = 0;
      for (let i = 0; i < colors.length; i++) {
        acc += w[i];
        if (r < acc) return colors[i];
      }
      return colors[0];
    };

    const spawn = () => {
      const state = useGameStore.getState();
      if (state.phase !== 'playing') return;
      if (state.paused) { spawnTimer.current = setTimeout(spawn, 400); return; }
      if (!gameReadyRef.current) { spawnTimer.current = setTimeout(spawn, 300); return; }
      const isConflict = mode === 'inhibition-conflict';
      const count = isConflict ? Math.floor(Math.random() * 2) + 2 : 1;

      const used = new Set<number>();
      for (let i = 0; i < count; i++) {
        let pi = Math.floor(Math.random() * POSITIONS.length);
        while (used.has(pi) && used.size < POSITIONS.length) {
          pi = Math.floor(Math.random() * POSITIONS.length);
        }
        used.add(pi);

        const id    = Math.random().toString(36).slice(2, 11);
        const color = pickColor();
        const isDistractor = isConflict && color !== 'red' && Math.random() < 0.25;

        const zDepth = adaptive.targetDistance ? (adaptive.targetDistance - 0.65) * 1.5 : 0;
        const pos: [number, number, number] = [POSITIONS[pi][0], POSITIONS[pi][1], POSITIONS[pi][2] - zDepth];

        spawnSphere({
          id, color,
          position: pos,
          spawnTime: Date.now(),
          isDistractor,
        });

        // Auto-remove respecting responseTimeLimit or objectSpeed
        const lifetime = color === 'red'
          ? (adaptive.responseTimeLimit ? adaptive.responseTimeLimit * 0.75 : 2200 / adaptive.objectSpeed)
          : (adaptive.responseTimeLimit ?? (3200 / adaptive.objectSpeed));
        setTimeout(() => {
          const state = useGameStore.getState();
          const still = state.activeSpheres.find((s) => s.id === id);
          if (!still) return;
          if (color === 'red') registerInhibition(id);
          else registerMiss(id);
        }, lifetime);
      }

      const jitter = 0.8 + Math.random() * 0.5;
      spawnTimer.current = setTimeout(spawn, adaptive.spawnDelay * jitter);
    };

    spawnTimer.current = setTimeout(spawn, 1000);
    return () => { if (spawnTimer.current) clearTimeout(spawnTimer.current); };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rule-switching (modes 2, 5)
  useEffect(() => {
    if (mode !== 'rule-switch' && mode !== 'dual-task') return;

    const schedule = () => {
      const delay = (7000 + Math.random() * 9000) / Math.max(0.3, adaptive.cognitiveLoad);
      switchTimer.current = setTimeout(() => {
        if (useGameStore.getState().paused) { schedule(); return; }
        triggerRuleSwitch();
        schedule();
      }, delay);
    };

    const first = setTimeout(schedule, 12000);
    return () => {
      clearTimeout(first);
      if (switchTimer.current) clearTimeout(switchTimer.current);
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const mins = Math.floor(timeLeft / 60);
  const secs = Math.floor(timeLeft % 60);
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const pct = Math.round((timeLeft / totalDuration) * 100);

  const totalR  = metrics.totalReactions;
  const accuracy = totalR > 0 ? Math.round((metrics.correctReactions / totalR) * 100) : 100;
  const avgRT    = metrics.reactionTimes.length
    ? Math.round(metrics.reactionTimes.slice(-5).reduce((a, b) => a + b, 0) /
        metrics.reactionTimes.slice(-5).length)
    : 0;

  const modeMeta = MODES.find((m) => m.id === mode)!;
  const diffLevel = Math.round(adaptive.cognitiveLoad * 5);

  // Tap-to-select: apply an action to the oldest eligible active sphere,
  // mirroring the keyboard shortcut logic — an alternative for users who
  // find the swipe/hold gesture difficult.
  const tapAction = (action: SphereAction) => {
    const gs = useGameStore.getState();
    if (gs.phase !== 'playing' || gs.paused) return;
    const target = gs.activeSpheres.find(
      (s) => !s.isDistractor && s.color !== 'red' && gs.rules[s.color] === action
    );
    if (target) {
      gs.registerInput({
        sphereId: target.id,
        action,
        reactionTime: Date.now() - target.spawnTime,
        driftMagnitude: 0,
      });
    }
  };

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {/* ── Top bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3">
        <div className="glass px-4 py-2.5 flex items-center gap-4">
          <span className="font-display text-xs tracking-widest" style={{ color: modeMeta.color }}>
            {modeMeta.icon} {modeMeta.label}
          </span>
          <span className="w-px h-4 bg-white/10" />
          <DiffPips n={diffLevel} color={modeMeta.color} />
        </div>

        {/* Timer */}
        <div className="glass px-5 py-2.5 flex flex-col items-center">
          <span
            className={`font-display text-lg font-bold tabular-nums ${timeLeft < 15 ? 'animate-glow-pulse' : ''}`}
            style={{ color: timeLeft < 15 ? '#ff2d55' : '#e2e8f0' }}
          >
            {timeStr}
          </span>
          <div className="w-full mt-1 metric-track" style={{ width: 80 }}>
            <div
              className="metric-fill"
              style={{
                width: `${pct}%`,
                background: timeLeft < 15
                  ? 'linear-gradient(90deg,#ff2d5588,#ff2d55)'
                  : 'linear-gradient(90deg,#00d4ff44,#00d4ff)',
              }}
            />
          </div>
        </div>

        {/* Sensor & Pause / Stop */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <SensorBadge />
          <button
            className="glass px-4 py-2.5 flex items-center gap-2
                       text-slate-400 hover:text-white hover:border-white/20 transition-all
                       text-xs font-display tracking-widest uppercase"
            onClick={() => (paused ? resumeSession() : pauseSession())}
            aria-label={paused ? 'Resume session' : 'Pause session'}
          >
            <span className="text-base leading-none">{paused ? '▶' : '❚❚'}</span> {paused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="glass px-4 py-2.5 flex items-center gap-2
                       text-slate-400 hover:text-white hover:border-white/20 transition-all
                       text-xs font-display tracking-widest uppercase"
            onClick={endSession}
          >
            <span className="text-base leading-none">■</span> Stop
          </button>
        </div>
      </div>

      {/* ── AI patient-state + RL action insight ── */}
      <AIInsightsPanel />

      {/* ── Tap-to-select controls (alternative to swipe/hold) ── */}
      {tapToSelect && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto">
          <button
            className="glass px-6 py-3 text-sm font-display tracking-widest uppercase text-slate-300 hover:text-white transition-all"
            onClick={() => tapAction('left')}
          >
            ← Left
          </button>
          <button
            className="glass px-6 py-3 text-sm font-display tracking-widest uppercase text-slate-300 hover:text-white transition-all"
            onClick={() => tapAction('hold')}
          >
            ⏸ Hold
          </button>
          <button
            className="glass px-6 py-3 text-sm font-display tracking-widest uppercase text-slate-300 hover:text-white transition-all"
            onClick={() => tapAction('right')}
          >
            Right →
          </button>
        </div>
      )}

      {/* ── Rules panel (bottom-left) ── */}
      <div className="absolute bottom-5 left-5 glass px-4 py-4 animate-fade-up">
        <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 font-display">
          {mode === 'rule-switch' || mode === 'dual-task' ? '⚠ Active Rules' : 'Rules'}
        </p>
        <RulesLegend compact />
      </div>

      {/* ── Live metrics (bottom-right) ── */}
      <div className="absolute bottom-5 right-5 glass px-5 py-4 min-w-[160px] animate-fade-up">
        <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-3 font-display">
          Live Metrics
        </p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-slate-500 uppercase tracking-widest">Accuracy</span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: accuracy >= 80 ? '#00ff88' : accuracy >= 60 ? '#ffd60a' : '#ff2d55' }}
            >
              {accuracy}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-slate-500 uppercase tracking-widest">Avg RT</span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: avgRT > 0 && avgRT < 400 ? '#00ff88' : avgRT < 700 ? '#ffd60a' : '#ff2d55' }}
            >
              {avgRT > 0 ? `${avgRT}ms` : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-slate-500 uppercase tracking-widest">Reactions</span>
            <span className="font-mono text-sm font-bold text-slate-300">{totalR}</span>
          </div>
          {fatigue > 0.5 && (
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-[11px] text-yellow-400 uppercase tracking-widest">Fatigue detected</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Break prompt — appears once fatigue is pronounced ── */}
      {fatigue > 0.72 && !paused && (
        <div
          className="absolute top-24 left-1/2 -translate-x-1/2 glass px-5 py-3 flex items-center gap-4 pointer-events-auto animate-fade-up"
          style={{ borderColor: 'rgba(255,214,10,0.4)' }}
        >
          <span className="text-[12px] text-yellow-300 uppercase tracking-widest">
            Reaction times are slowing — consider a short break
          </span>
          <button
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.62rem' }}
            onClick={pauseSession}
          >
            Pause
          </button>
        </div>
      )}

      {/* ── Paused overlay ── */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto" style={{ background: 'rgba(3,4,10,0.72)' }}>
          <div className="glass-panel p-8 text-center animate-fade-up">
            <p className="font-display text-xl font-bold uppercase tracking-widest text-white mb-2">Paused</p>
            <p className="text-[12px] text-slate-400 mb-6">Timer and scoring are frozen. Take your time.</p>
            <div className="flex gap-3 justify-center">
              <button className="btn-primary" onClick={resumeSession}>Resume</button>
              <button
                className="btn-primary"
                style={{ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.05)' }}
                onClick={endSession}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Countdown overlay ── */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <span
            key={countdown}
            className="font-display font-black animate-fade-up"
            style={{
              fontSize: countdown === 0 ? '5rem' : '8rem',
              color: countdown === 0 ? '#00ff88' : '#00d4ff',
              textShadow: '0 0 40px currentColor, 0 0 80px currentColor',
              letterSpacing: '0.05em',
            }}
          >
            {countdown === 0 ? 'GO!' : countdown}
          </span>
        </div>
      )}

      {/* ── Rule-switch alert (top-center) ── */}
      {ruleSwitchAlert && (
        <div
          className="absolute top-20 left-1/2 animate-rule-flash z-20 pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className="glass px-6 py-3 border flex flex-col items-center gap-2"
            style={{
              borderColor: 'rgba(255,45,85,0.5)',
              boxShadow: '0 0 30px rgba(255,45,85,0.2)',
            }}
          >
            <span className="font-display text-xs tracking-widest uppercase" style={{ color: '#ff2d55' }}>
              ⚡ Rules Changed
            </span>
            <RulesLegend compact />
          </div>
        </div>
      )}
    </div>
  );
}
