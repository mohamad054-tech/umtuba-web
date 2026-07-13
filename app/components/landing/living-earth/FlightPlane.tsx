"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { LivingRoute } from "./types";
import { createArcCurve } from "./curveUtils";
import { FLIGHT_RADIUS } from "./livingEarthData";

type FlightPlaneProps = {
  route: LivingRoute;
  routeIndex: number;
  reducedMotion: boolean;
};

const _lookTarget = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export default function FlightPlane({
  route,
  routeIndex,
  reducedMotion,
}: FlightPlaneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const trailRef = useRef<THREE.MeshBasicMaterial>(null);

  const curve = useMemo(
    () =>
      createArcCurve(
        route.from.lat,
        route.from.lng,
        route.to.lat,
        route.to.lng,
        FLIGHT_RADIUS,
        2.38
      ),
    [route]
  );

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      const p = curve.getPointAt(0.35);
      const t = curve.getTangentAt(0.35);
      group.position.copy(p);
      _lookTarget.copy(p).add(t);
      group.up.copy(_up);
      group.lookAt(_lookTarget);
      group.visible = true;
      return;
    }

    const duration = route.duration;
    const phase = routeIndex * 2.4;
    const progress =
      ((clock.getElapsedTime() + phase) % duration) / duration;

    const position = curve.getPointAt(progress);
    const tangent = curve.getTangentAt(progress);
    group.position.copy(position);
    _lookTarget.copy(position).add(tangent);
    group.up.copy(_up);
    group.lookAt(_lookTarget);
    group.visible = true;

    if (trailRef.current) {
      trailRef.current.opacity = 0.18 + Math.sin(progress * Math.PI) * 0.12;
    }
  });

  return (
    <group ref={groupRef} visible={false} scale={0.55}>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[0.085, 0.018, 0.018]} />
        <meshBasicMaterial color="#f8fafc" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.03, 0.004, 0.1]} />
        <meshBasicMaterial color={route.color} toneMapped={false} />
      </mesh>
      <mesh position={[-0.028, 0.02, 0]}>
        <boxGeometry args={[0.02, 0.035, 0.004]} />
        <meshBasicMaterial color="#e2e8f0" toneMapped={false} />
      </mesh>
      <mesh scale={2.2}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshBasicMaterial
          ref={trailRef}
          color={route.color}
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
