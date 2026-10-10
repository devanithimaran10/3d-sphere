import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useBurstStore, type BurstEffect } from '../store/useBurstStore';

export const SphereBurstEffects: React.FC = () => {
  const bursts = useBurstStore((s) => s.bursts);

  return (
    <group>
      {bursts.map((b) => (
        <SingleBurst key={b.id} burst={b} />
      ))}
    </group>
  );
};

const SingleBurst: React.FC<{ burst: BurstEffect }> = ({ burst }) => {
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const textRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const elapsed = Date.now() - burst.createdAt;
    const progress = Math.min(elapsed / 900, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);

    // Shockwave expansion
    if (shockwaveRef.current) {
      const scale = 0.5 + easeOut * 2.8;
      shockwaveRef.current.scale.set(scale, scale, scale);
      (shockwaveRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress * 1.2);
    }

    // Outer shockwave ring
    if (ringRef.current) {
      const rScale = 0.4 + easeOut * 3.4;
      ringRef.current.scale.set(rScale, rScale, rScale);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 - progress);
    }

    // Floating text rise
    if (textRef.current) {
      textRef.current.position.y = burst.position[1] + easeOut * 1.4;
    }
  });

  return (
    <group ref={groupRef} position={burst.position}>
      {/* Expanding planar shockwave */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.45, 32]} />
        <meshBasicMaterial
          color={burst.color}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary outer shockwave */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.5, 0.04, 12, 36]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* 12 Radial Spark Particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const elevation = Math.sin(i * 1.8) * 0.4;
        return (
          <SparkParticle
            key={i}
            angle={angle}
            elevation={elevation}
            color={burst.color}
            createdAt={burst.createdAt}
          />
        );
      })}

      {/* Floating 3D Text Badge */}
      {burst.label && (
        <group ref={textRef}>
          <Billboard>
            <Text
              fontSize={0.32}
              color={burst.color}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.04}
              outlineColor="#000000"
            >
              {burst.label}
            </Text>
          </Billboard>
        </group>
      )}
    </group>
  );
};

const SparkParticle: React.FC<{
  angle: number;
  elevation: number;
  color: string;
  createdAt: number;
}> = ({ angle, elevation, color, createdAt }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = Date.now() - createdAt;
    const progress = Math.min(elapsed / 800, 1);
    const easeOut = 1 - Math.pow(1 - progress, 2);

    const dist = easeOut * 2.2;
    meshRef.current.position.x = Math.cos(angle) * dist;
    meshRef.current.position.y = elevation * dist;
    meshRef.current.position.z = Math.sin(angle) * dist;

    const scale = Math.max(0.01, 1 - progress);
    meshRef.current.scale.set(scale, scale, scale);
    (meshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress * 1.1);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  );
};
