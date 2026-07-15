"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import ArrivalPulse from "./ArrivalPulse";
import CityMarker from "./CityMarker";
import FlightAnimation from "./FlightAnimation";
import JourneyRoute from "./JourneyRoute";
import { journeyCities, journeyRoutes } from "./journeyData";

export default function Earth() {
  const earthGroupRef = useRef<THREE.Group>(null);

  const earthTexture = useLoader(
    THREE.TextureLoader,
    "/textures/earth-blue-marble.jpg"
  );

  // Three.js loader textures are configured after load; clone so we don't mutate the hook value.
  const map = useMemo(() => {
    const tex = earthTexture.clone();
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, [earthTexture]);

  useFrame((_, delta) => {
    if (!earthGroupRef.current) return;

    earthGroupRef.current.rotation.y += delta * 0.015;
  });

  return (
    <group
      ref={earthGroupRef}
      rotation={[0, 0.55, 0]}
      scale={1.04}
    >
      <mesh>
        <sphereGeometry args={[2, 128, 128]} />

        <meshStandardMaterial
          map={map}
          roughness={0.72}
          metalness={0.03}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.075, 128, 128]} />

        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.11}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={1.08}>
        <sphereGeometry args={[2.08, 96, 96]} />

        <meshBasicMaterial
          color="#2563eb"
          transparent
          opacity={0.045}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {journeyRoutes.map((route, index) => (
        <JourneyRoute
          key={`${route.from.name}-${route.to.name}-${index}`}
          route={route}
        />
      ))}

      {journeyRoutes.map((route, index) => (
        <FlightAnimation
          key={`flight-${route.from.name}-${route.to.name}`}
          route={route}
          routeIndex={index}
          routeCount={journeyRoutes.length}
          duration={3.5}
        />
      ))}

      {journeyCities.map((city, index) => (
        <ArrivalPulse
          key={`pulse-${city.name}`}
          city={city}
          delay={index * 3.5}
          duration={1.4}
        />
      ))}

      {journeyCities.map((city) => (
        <CityMarker key={city.name} city={city} />
      ))}
    </group>
  );
}