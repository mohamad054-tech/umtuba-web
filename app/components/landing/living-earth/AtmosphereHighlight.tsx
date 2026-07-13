"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { latLngToVector3 } from "../../journey/globeCoordinates";
import { useLivingEarthHover } from "./LivingEarthHoverContext";

export default function AtmosphereHighlight() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const { hoveredCity } = useLivingEarthHover();
  const targetOpacity = useRef(0);

  const position = useMemo(() => {
    if (!hoveredCity) return new THREE.Vector3(0, 0, 0);
    return latLngToVector3(hoveredCity.lat, hoveredCity.lng, 2.09);
  }, [hoveredCity]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    targetOpacity.current = hoveredCity ? 0.22 : 0;
    mat.opacity += (targetOpacity.current - mat.opacity) * Math.min(1, delta * 8);

    if (hoveredCity) {
      mesh.position.copy(position);
      mat.color.set(hoveredCity.color);
      mesh.visible = mat.opacity > 0.01;
    } else {
      mesh.visible = mat.opacity > 0.01;
    }
  });

  return (
    <mesh ref={meshRef} visible={false} scale={1}>
      <sphereGeometry args={[0.22, 20, 20]} />
      <meshBasicMaterial
        ref={matRef}
        color="#93c5fd"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
