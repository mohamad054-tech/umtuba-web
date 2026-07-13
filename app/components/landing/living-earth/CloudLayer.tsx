"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CLOUD_RADIUS } from "./livingEarthData";

type CloudLayerProps = {
  reducedMotion: boolean;
};

function createCloudTexture() {
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < 70; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 12 + Math.random() * 38;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    const alpha = 0.04 + Math.random() * 0.09;
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 2;
  return texture;
}

export default function CloudLayer({ reducedMotion }: CloudLayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => createCloudTexture(), []);

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.018;
  });

  if (!texture) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[CLOUD_RADIUS, 64, 64]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
