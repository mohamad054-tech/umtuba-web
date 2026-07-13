"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { EARTH_Y_ROTATION } from "../journey/globeCoordinates";
import LivingEarthEffects from "./living-earth/LivingEarthEffects";
import { EARTH_RADIUS } from "./living-earth/livingEarthData";
import { usePrefersReducedMotion } from "./living-earth/usePrefersReducedMotion";

const EARTH_TEXTURE_URL = "/textures/earth-blue-marble-2048.jpg";

useLoader.preload(THREE.TextureLoader, EARTH_TEXTURE_URL);

function HeroEarth({
  reducedMotion,
  focusCity,
}: {
  reducedMotion: boolean;
  focusCity: string | null;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL);

  useEffect(() => {
    // Three.js requires mutating the loaded texture color space once.
    // eslint-disable-next-line react-hooks/immutability -- TextureLoader asset is intentionally mutated
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 8;
  }, [earthTexture]);

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    groupRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef} rotation={[0.12, EARTH_Y_ROTATION, 0]}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 96, 96]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.78}
          metalness={0.04}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.06, 96, 96]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.06}>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#1d4ed8"
          transparent
          opacity={0.05}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <LivingEarthEffects
        reducedMotion={reducedMotion}
        focusCity={focusCity}
      />
    </group>
  );
}

function HeroGlobeScene({
  reducedMotion,
  focusCity,
}: {
  reducedMotion: boolean;
  focusCity: string | null;
}) {
  return (
    <>
      <color attach="background" args={["#050510"]} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} />
      <directionalLight position={[-4, -1, -2]} intensity={0.35} color="#93c5fd" />

      <Stars
        radius={100}
        depth={50}
        count={reducedMotion ? 1200 : 2800}
        factor={3.2}
        saturation={0}
        fade
        speed={reducedMotion ? 0 : 0.35}
      />

      <Suspense fallback={null}>
        <HeroEarth reducedMotion={reducedMotion} focusCity={focusCity} />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableRotate
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.65}
      />
    </>
  );
}

type LandingHeroGlobeProps = {
  focusCity?: string | null;
};

export default function LandingHeroGlobe({
  focusCity = null,
}: LandingHeroGlobeProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="landing-hero-globe relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.15, 5.6], fov: 42 }}
        dpr={reducedMotion ? [1, 1.25] : [1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <HeroGlobeScene
          reducedMotion={reducedMotion}
          focusCity={focusCity}
        />
      </Canvas>
    </div>
  );
}
