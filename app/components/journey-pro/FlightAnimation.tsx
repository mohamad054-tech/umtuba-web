"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useJourney } from "./JourneyContext";
import type { Route } from "./JourneyRoute";

type FlightAnimationProps = {
  route: Route;
  routeIndex: number;
  routeCount: number;
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

export default function FlightAnimation({
  route,
  routeIndex,
  routeCount,
  duration = 3.5,
}: FlightAnimationProps) {
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const { currentCityIndex, setCurrentCityIndex, isPlaying, speed } =
    useJourney();

  const curve = useMemo(() => {
    const start = latLngToVector3(
      route.from.lat,
      route.from.lng,
      2.07
    );

    const end = latLngToVector3(
      route.to.lat,
      route.to.lng,
      2.07
    );

    const middle = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.38);

    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }, [route]);

  useFrame(({ clock }, delta) => {
    const marker = markerRef.current;

    if (!marker) return;

    if (!isPlaying) {
      marker.visible = false;
      return;
    }

    const safeSpeed = Math.max(speed, 0.1);
    const totalDuration = duration * routeCount;

    const cycleTime =
      (clock.getElapsedTime() * safeSpeed) % totalDuration;

    const routeStartTime = routeIndex * duration;
    const routeEndTime = routeStartTime + duration;

    const isActive =
      cycleTime >= routeStartTime &&
      cycleTime < routeEndTime;

    marker.visible = isActive;

    if (!isActive) return;

    const routeElapsed = cycleTime - routeStartTime;
    const progress = routeElapsed / duration;

    const position = curve.getPointAt(progress);
    marker.position.copy(position);

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2;
    }

    const desiredCityIndex =
      progress >= 0.92 ? routeIndex + 1 : routeIndex;

    if (currentCityIndex !== desiredCityIndex) {
      setCurrentCityIndex(desiredCityIndex);
    }
  });

  return (
    <group ref={markerRef} visible={false}>
      {/* الضوء خلف صورة المستخدم */}
      <mesh scale={2.8}>
        <sphereGeometry args={[0.07, 24, 24]} />

        <meshBasicMaterial
          color={route.color}
          transparent
          opacity={0.18}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* الحلقة المضيئة حول الصورة */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.105, 0.012, 16, 48]} />

        <meshBasicMaterial
          color={route.color}
          transparent
          opacity={0.95}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* صورة صاحب المنشور */}
      <Html
        center
        transform
        sprite
        distanceFactor={7}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "9999px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111827",
            color: "white",
            fontWeight: 900,
            fontSize: "18px",
            border: `3px solid ${route.color}`,
            boxShadow: `0 0 18px ${route.color}`,
          }}
        >
          <span>M</span>

          <img
            src="/profile-avatar.jpg"
            alt="Post creator"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      </Html>
    </group>
  );
}