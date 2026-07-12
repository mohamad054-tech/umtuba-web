"use client";

import { useMemo } from "react";
import * as THREE from "three";

export type City = {
  name: string;
  lat: number;
  lng: number;
  color: string;
};

type CityMarkerProps = {
  city: City;
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

export default function CityMarker({ city }: CityMarkerProps) {
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.04),
    [city.lat, city.lng]
  );

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.045, 24, 24]} />

        <meshBasicMaterial
          color={city.color}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={2.5}>
        <sphereGeometry args={[0.045, 24, 24]} />

        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={0.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}