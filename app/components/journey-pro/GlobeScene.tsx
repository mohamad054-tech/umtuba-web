"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import CameraController from "./CameraController";
import Earth from "./Earth";

export default function GlobeScene() {
  return (
    <>
      <ambientLight intensity={1.1} />

      <directionalLight
        position={[5, 3, 5]}
        intensity={2.5}
      />

      <Stars
        radius={120}
        depth={60}
        count={5000}
        factor={4}
        saturation={0}
        fade
      />

      <Earth />

      <CameraController />

      <OrbitControls
        enablePan={false}
        enableRotate={false}
        enableZoom
        enableDamping
        dampingFactor={0.06}
        minDistance={2.25}
        maxDistance={9}
      />
    </>
  );
}