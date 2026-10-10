import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import type { ActiveSphere, SphereAction } from '../types';
import { sound } from '../services/audioService';
import { useBurstStore } from '../store/useBurstStore';

const HEX: Record<string, string> = {
  green:  '#00ff88',
  blue:   '#00d4ff',
  red:    '#ff2d55',
  yellow: '#ffd60a',
};

interface Props { sphere: ActiveSphere }

export default function Sphere({ sphere }: Props) {
  const meshRef    = useRef<THREE.Mesh>(null);
  const ringRef    = useRef<THREE.Mesh>(null);
  const holdRingRef= useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [flash,   setFlash]   = useState<'success' | 'error' | null>(null);

  // Hold progress state (0 to 1)
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding]       = useState(false);

  const dragStart   = useRef<{ x: number; y: number; time: number } | null>(null);
  const holdInterval= useRef<ReturnType<typeof setInterval> | null>(null);
  const inhibitTimer= useRef<ReturnType<typeof setTimeout> | null>(null);

  const { registerInput, registerInhibition, adaptive, rules } = useGameStore();
  const triggerBurst = useBurstStore((s) => s.triggerBurst);

  const col = HEX[sphere.color];
  const HINT: Record<string, string> = { left: '←', right: '→', hold: '⏸', inhibit: '✕' };
  const hint = HINT[rules[sphere.color]];

  // Red spheres: auto-register inhibition after timeout
  useEffect(() => {
    if (sphere.color !== 'red') return;
    const timeout = 1800 / adaptive.objectSpeed;
    inhibitTimer.current = setTimeout(() => {
      sound.playInhibitSuccess();
      triggerBurst(sphere.position, '#00ff88', 'INHIBITED');
      registerInhibition(sphere.id);
    }, timeout);
    return () => { if (inhibitTimer.current) clearTimeout(inhibitTimer.current); };
  }, [sphere, adaptive.objectSpeed, registerInhibition, triggerBurst]);

  const triggerFlash = (type: 'success' | 'error') => {
    setFlash(type);
    setTimeout(() => setFlash(null), 380);
  };

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Touching red = inhibition error
    if (sphere.color === 'red') {
      if (inhibitTimer.current) clearTimeout(inhibitTimer.current);
      sound.playError();
      triggerFlash('error');
      triggerBurst(sphere.position, '#ff2d55', 'INHIBIT ERROR');
      registerInput({
        sphereId: sphere.id,
        action: 'left',
        reactionTime: Date.now() - sphere.spawnTime,
        driftMagnitude: 0,
      });
      return;
    }

    // Yellow: progressive hold charge (2.0s = 2000ms)
    if (sphere.color === 'yellow') {
      setIsHolding(true);
      setHoldProgress(0);
      const startTime = Date.now();
      const DURATION = 1800; // 1.8 seconds hold duration

      holdInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setHoldProgress(progress);
        sound.playHoldTick(progress);

        if (progress >= 1) {
          if (holdInterval.current) clearInterval(holdInterval.current);
          setIsHolding(false);
          sound.playHoldComplete();
          triggerFlash('success');
          triggerBurst(sphere.position, '#ffd60a', 'PERFECT HOLD');
          registerInput({
            sphereId: sphere.id,
            action: 'hold',
            reactionTime: Date.now() - sphere.spawnTime,
            driftMagnitude: 0,
          });
        }
      }, 50);
    }
  }, [sphere, registerInput, triggerBurst]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!dragStart.current || sphere.color === 'red' || sphere.color === 'yellow') return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) < 24) return;

    const action: SphereAction = dx < 0 ? 'left' : 'right';
    const drift  = Math.abs(dy) / window.innerHeight;
    dragStart.current = null;

    sound.playHit();
    triggerFlash('success');
    triggerBurst(sphere.position, col, action === 'left' ? '← LEFT' : 'RIGHT →');
    registerInput({
      sphereId: sphere.id,
      action,
      reactionTime: Date.now() - sphere.spawnTime,
      driftMagnitude: drift * 2,
    });
  }, [sphere, col, registerInput, triggerBurst]);

  const handlePointerUp = useCallback(() => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);

    // Direct click resolution: if clicked without dragging within 400ms
    if (dragStart.current && sphere.color !== 'red' && sphere.color !== 'yellow') {
      const clickDuration = Date.now() - dragStart.current.time;
      if (clickDuration < 420) {
        // Direct click executes expected action
        const action: SphereAction = rules[sphere.color] === 'left' || rules[sphere.color] === 'right'
          ? rules[sphere.color]
          : 'left';

        sound.playHit();
        triggerFlash('success');
        triggerBurst(sphere.position, col, '+100 STRIKE');
        registerInput({
          sphereId: sphere.id,
          action,
          reactionTime: Date.now() - sphere.spawnTime,
          driftMagnitude: 0.05,
        });
      }
    }

    dragStart.current = null;
  }, [sphere, col, rules, registerInput, triggerBurst]);

  // Animate scale + ring rotation
  useFrame((state) => {
    if (!meshRef.current) return;
    const base  = adaptive.targetSize * 0.52;
    const target = isHolding ? base * 1.3 : hovered ? base * 1.18 : base;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.14);

    if (ringRef.current) {
      ringRef.current.rotation.z += 0.012;
      const rt = flash === 'success' ? 0.95 : flash === 'error' ? 0.6 : hovered ? 0.75 : 0.35;
      (ringRef.current.material as THREE.MeshStandardMaterial).opacity =
        THREE.MathUtils.lerp(
          (ringRef.current.material as THREE.MeshStandardMaterial).opacity,
          rt,
          0.15
        );
    }

    if (holdRingRef.current) {
      holdRingRef.current.rotation.z -= 0.025;
      const holdScale = 1.0 + holdProgress * 0.5;
      holdRingRef.current.scale.set(holdScale, holdScale, holdScale);
    }

    // Dynamic levitation wobble
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.8 + sphere.spawnTime) * 0.12;
  });

  const emissiveInt = flash === 'success' ? 3.5 : flash === 'error' ? 0.2 : isHolding ? 2.5 : hovered ? 1.8 : 0.9;
  const distort     = isHolding ? 0.45 : hovered ? 0.32 : 0.12;

  return (
    <Float speed={1.4 * adaptive.objectSpeed} rotationIntensity={0.15} floatIntensity={0.6}>
      <group position={sphere.position}>
        {/* Glow point light */}
        <pointLight
          color={col}
          intensity={isHolding ? 7 : hovered ? 5 : 2.5}
          distance={6}
          decay={2}
        />

        {/* Main sphere */}
        <mesh
          ref={meshRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => {
            setHovered(false);
            if (holdInterval.current) clearInterval(holdInterval.current);
            setIsHolding(false);
            setHoldProgress(0);
            dragStart.current = null;
          }}
        >
          <sphereGeometry args={[1, 64, 64]} />
          <MeshDistortMaterial
            color={col}
            emissive={col}
            emissiveIntensity={emissiveInt}
            distort={distort}
            speed={isHolding ? 7 : hovered ? 5 : 1.8}
            roughness={0.08}
            metalness={0.25}
          />
        </mesh>

        {/* Outer orbital ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[0.78, 0.018, 8, 80]} />
          <meshStandardMaterial
            color={col}
            emissive={col}
            emissiveIntensity={1.2}
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Yellow Progressive Hold Charge Ring */}
        {sphere.color === 'yellow' && isHolding && (
          <mesh ref={holdRingRef} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.95, 0.04, 16, 64, Math.PI * 2 * holdProgress]} />
            <meshStandardMaterial
              color="#ffd60a"
              emissive="#ffd60a"
              emissiveIntensity={2.5}
            />
          </mesh>
        )}

        {/* Distractor marker – faint red X overlay */}
        {sphere.isDistractor && (
          <mesh position={[0, 0, 0.56]}>
            <ringGeometry args={[0.18, 0.22, 4]} />
            <meshBasicMaterial color="#ff2d55" transparent opacity={0.55} />
          </mesh>
        )}

        {/* Action hint — always faces camera */}
        <Billboard>
          <Text
            position={[0, 0, 0.7]}
            fontSize={0.28}
            color={isHolding ? '#ffffff' : col}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.035}
            outlineColor="#000000"
          >
            {isHolding ? `${Math.round(holdProgress * 100)}%` : hint}
          </Text>
        </Billboard>
      </group>
    </Float>
  );
}
