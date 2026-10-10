import { Canvas, useFrame } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameFrame, type PlayingContext } from '../components/GameFrame';

const xrStore = createXRStore();
function trialCountForLevel(level: number) { return [10, 12, 14, 16, 18][level - 1] ?? 10; }
function targetRadiusForLevel(level: number) { return [0.5, 0.44, 0.38, 0.32, 0.27][level - 1] ?? 0.5; }
function timeoutForLevel(level: number) { return [1800, 1600, 1400, 1200, 1000][level - 1] ?? 1800; }
type TargetPosition = [number, number, number];

function randomPosition(): TargetPosition {
  return [-2.7 + Math.random() * 5.4, -1.45 + Math.random() * 2.9, -3.5 - Math.random() * 2.8];
}

export function QuickResponse() {
  return <GameFrame gameId="quick-response" instructions={[
    'A glowing target will appear at a random position and depth in the 3D arena.',
    'Select it as quickly as you can. In a headset, point with a controller or hand and select it.',
    'Selecting empty space or acting before a target appears counts as an error.',
  ]}>{(ctx) => <Session {...ctx} />}</GameFrame>;
}

function Session({ difficulty, recordTrial, endGame }: PlayingContext) {
  const [sessionDifficulty] = useState(difficulty);
  const total = trialCountForLevel(sessionDifficulty);
  const targetRadius = targetRadiusForLevel(sessionDifficulty);
  const timeout = timeoutForLevel(sessionDifficulty);
  const [trialIndex, setTrialIndex] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'target'>('waiting');
  const [position, setPosition] = useState<TargetPosition>([0, 0, -4]);
  const [xrMessage, setXrMessage] = useState<string | null>(null);
  const shownAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);

  const advance = useCallback(() => {
    if (trialIndex + 1 >= total) { endGame(); return; }
    setPhase('waiting');
    setTrialIndex((index) => index + 1);
  }, [endGame, total, trialIndex]);

  useEffect(() => {
    resolvedRef.current = false;
    const startTimer = setTimeout(() => {
      setPosition(randomPosition());
      shownAtRef.current = Date.now();
      setPhase('target');
      timerRef.current = setTimeout(() => {
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        recordTrial(false, null);
        advance();
      }, timeout);
    }, 500 + Math.random() * 1000);
    return () => { clearTimeout(startTimer); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [advance, recordTrial, timeout, trialIndex]);

  const resolve = useCallback((correct: boolean) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    recordTrial(correct, phase === 'target' ? Date.now() - shownAtRef.current : null);
    advance();
  }, [advance, phase, recordTrial]);

  const enterVR = async () => {
    setXrMessage(null);
    try {
      const session = await xrStore.enterVR();
      if (!session) setXrMessage('VR is not available in this browser or headset.');
    } catch {
      setXrMessage('Unable to start VR. Check the headset connection and WebXR permission.');
    }
  };

  return <div className="np-card p-4 md:p-6">
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm text-slate-400">Trial {trialIndex + 1} of {total}</p>
      <button className="np-btn-secondary text-sm" onClick={enterVR}>Enter VR</button>
    </div>
    <div className="np-vr-arena">
      <Canvas camera={{ position: [0, 0, 0], fov: 68 }} onPointerMissed={() => resolve(false)} gl={{ antialias: true }}>
        <XR store={xrStore}><Arena phase={phase} position={position} radius={targetRadius} onSelect={() => resolve(true)} /></XR>
      </Canvas>
      {phase === 'waiting' && <p className="np-vr-arena-hint">Wait for the target…</p>}
    </div>
    <p className="mt-3 text-center text-xs text-slate-500">Desktop: click the target. VR: point and select with your controller or hand.</p>
    {xrMessage && <p className="mt-2 text-center text-xs text-amber-400">{xrMessage}</p>}
  </div>;
}

function Arena({ phase, position, radius, onSelect }: { phase: 'waiting' | 'target'; position: TargetPosition; radius: number; onSelect: () => void }) {
  return <>
    <color attach="background" args={['#07111d']} /><fog attach="fog" args={['#07111d', 5, 13]} />
    <ambientLight intensity={0.35} /><pointLight position={[0, 3, 1]} intensity={16} color="#38bdf8" distance={10} />
    <pointLight position={[-3, -1, -4]} intensity={8} color="#2dd4bf" distance={7} />
    <ArenaGrid />
    {phase === 'target' && <ReactionTarget position={position} radius={radius} onSelect={onSelect} />}
  </>;
}

function ArenaGrid() {
  const grid = useRef<THREE.GridHelper>(null);
  useFrame(({ clock }) => { if (grid.current) grid.current.position.z = -5.8 + Math.sin(clock.elapsedTime * 0.22) * 0.1; });
  return <><gridHelper ref={grid} args={[12, 24, '#164e63', '#0f2d3a']} position={[0, -2.1, -5.8]} />
    <mesh position={[0, 0, -7]}><planeGeometry args={[12, 8]} /><meshBasicMaterial color="#081827" transparent opacity={0.65} /></mesh></>;
}

function ReactionTarget({ position, radius, onSelect }: { position: TargetPosition; radius: number; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 1.8;
    group.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 5) * 0.08);
  });
  return <group ref={group} position={position} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <pointLight color="#2dd4bf" intensity={12} distance={5} />
    <mesh><sphereGeometry args={[radius, 32, 32]} /><meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={2.8} roughness={0.18} metalness={0.35} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius * 1.42, radius * 0.11, 12, 40]} /><meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} /></mesh>
  </group>;
}
