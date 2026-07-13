"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TERMINATOR_RADIUS } from "./livingEarthData";

type DayNightTerminatorProps = {
  reducedMotion: boolean;
};

const terminatorVertex = /* glsl */ `
  varying vec3 vWorldNormal;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const terminatorFragment = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vWorldNormal;
  void main() {
    float d = dot(normalize(vWorldNormal), normalize(uSunDir));
    float night = smoothstep(-0.05, 0.22, -d);
    float edge = smoothstep(0.0, 0.18, abs(d));
    float alpha = night * 0.34 + (1.0 - edge) * 0.08;
    gl_FragColor = vec4(0.01, 0.02, 0.06, alpha);
  }
`;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default function DayNightTerminator({
  reducedMotion,
}: DayNightTerminatorProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const sunDir = useMemo(() => new THREE.Vector3(1, 0.15, 0.2).normalize(), []);

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: sunDir.clone() },
    }),
    [sunDir]
  );

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat || reducedMotion) return;
    mat.uniforms.uSunDir.value.applyAxisAngle(Y_AXIS, delta * 0.035);
  });

  return (
    <mesh>
      <sphereGeometry args={[TERMINATOR_RADIUS, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        vertexShader={terminatorVertex}
        fragmentShader={terminatorFragment}
        uniforms={uniforms}
      />
    </mesh>
  );
}
