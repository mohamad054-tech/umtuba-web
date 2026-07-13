"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type AtmosphericParticlesProps = {
  reducedMotion: boolean;
  count?: number;
};

export default function AtmosphericParticles({
  reducedMotion,
  count = 48,
}: AtmosphericParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const velocities = useRef<Float32Array | null>(null);

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const radius = 2.18 + Math.random() * 0.42;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      vel[i * 3] = (Math.random() - 0.5) * 0.012;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.012;

      const tint = 0.72 + Math.random() * 0.28;
      col[i * 3] = 0.55 * tint;
      col[i * 3 + 1] = 0.72 * tint;
      col[i * 3 + 2] = 1.0 * tint;
    }

    velocities.current = vel;
    return { positions: pos, colors: col };
  }, [count]);

  useFrame((_, delta) => {
    const points = pointsRef.current;
    const vel = velocities.current;
    if (!points || !vel || reducedMotion) return;

    const attr = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const dt = Math.min(delta, 0.033);

    for (let i = 0; i < count; i += 1) {
      const ix = i * 3;
      array[ix] += vel[ix] * dt * 12;
      array[ix + 1] += vel[ix + 1] * dt * 12;
      array[ix + 2] += vel[ix + 2] * dt * 12;

      const x = array[ix];
      const y = array[ix + 1];
      const z = array[ix + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const minR = 2.16;
      const maxR = 2.62;

      if (len < minR || len > maxR) {
        const target = THREE.MathUtils.clamp(len, minR, maxR);
        array[ix] = (x / len) * target;
        array[ix + 1] = (y / len) * target;
        array[ix + 2] = (z / len) * target;
        vel[ix] *= -0.7;
        vel[ix + 1] *= -0.7;
        vel[ix + 2] *= -0.7;
      }
    }

    attr.needsUpdate = true;
    points.rotation.y += dt * 0.015;
  });

  if (reducedMotion) return null;

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        transparent
        opacity={0.38}
        depthWrite={false}
        vertexColors
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
