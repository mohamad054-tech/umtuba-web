"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { JourneyCity } from "./journeyData";

type ArrivalPulseProps = {
  city: JourneyCity;
  delay?: number;
  duration?: number;
};

function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

export default function ArrivalPulse({
  city,
  delay = 0,
  duration = 1.4,
}: ArrivalPulseProps) {
  const pulseRef = useRef<THREE.Mesh>(null);

  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.045),
    [city.lat, city.lng]
  );

  useFrame(({ clock }) => {
    const pulse = pulseRef.current;

    if (!pulse) {
      return;
    }

    const elapsed = clock.getElapsedTime() - delay;

    if (elapsed < 0) {
      pulse.visible = false;
      return;
    }

    pulse.visible = true;

    const progress = (elapsed % duration) / duration;
    const scale = 1 + progress * 5;

    pulse.scale.setScalar(scale);

    const material = pulse.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.5 * (1 - progress));
  });

  return (
    <mesh ref={pulseRef} position={position}>
      <ringGeometry args={[0.05, 0.09, 64]} />

      <meshBasicMaterial
        color={city.color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}