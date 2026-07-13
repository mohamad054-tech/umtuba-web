"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { buildDiscoverCityHref } from "../../../lib/nav";
import { latLngToVector3 } from "../../journey/globeCoordinates";
import ActivityLabel from "./ActivityLabel";
import { useGlobalPulse } from "./GlobalPulseContext";
import { useLivingEarthHover } from "./LivingEarthHoverContext";
import { MARKER_RADIUS } from "./livingEarthData";
import type { LivingCity } from "./types";

type CityPulseMarkerProps = {
  city: LivingCity;
  pulseOffset: number;
  reducedMotion: boolean;
};

export default function CityPulseMarker({
  city,
  pulseOffset,
  reducedMotion,
}: CityPulseMarkerProps) {
  const router = useRouter();
  const [highlighted, setHighlighted] = useState(false);
  const pulseRef = useRef<THREE.Mesh>(null);
  const activityRingRef = useRef<THREE.Mesh>(null);
  const glowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const { setHoveredCity } = useLivingEarthHover();
  const { getCityIntensity } = useGlobalPulse();

  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, MARKER_RADIUS),
    [city.lat, city.lng]
  );

  const tooltipId = `living-earth-tooltip-${city.name
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  const show = useCallback(() => {
    setHighlighted(true);
    setHoveredCity(city);
    document.body.style.cursor = "pointer";
  }, [city, setHoveredCity]);

  const hide = useCallback(() => {
    setHighlighted(false);
    setHoveredCity(null);
    document.body.style.cursor = "auto";
  }, [setHoveredCity]);

  const openCity = useCallback(() => {
    router.push(buildDiscoverCityHref(city.name, city.country));
  }, [city.country, city.name, router]);

  useFrame(({ clock }) => {
    const pulse = pulseRef.current;
    const activityRing = activityRingRef.current;
    if (!pulse) return;

    const activity = reducedMotion ? 0 : getCityIntensity(city.name);

    if (reducedMotion) {
      pulse.scale.setScalar(highlighted ? 2.4 : 1.8);
      const mat = pulse.material as THREE.MeshBasicMaterial;
      mat.opacity = highlighted ? 0.28 : 0.14;
      if (glowMatRef.current) {
        glowMatRef.current.opacity = highlighted ? 0.36 : 0.18;
      }
      if (glowMeshRef.current) {
        glowMeshRef.current.scale.setScalar(highlighted ? 3.2 : 2.35);
      }
      if (coreRef.current) {
        coreRef.current.scale.setScalar(highlighted ? 1.35 : 1);
      }
      if (activityRing) activityRing.visible = false;
      return;
    }

    const elapsed = clock.getElapsedTime() + pulseOffset;
    const cycle = 3.6;
    const progress = (elapsed % cycle) / cycle;
    const scale = 1.2 + progress * 3.4;
    pulse.scale.setScalar(scale);
    const mat = pulse.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.32 * (1 - progress));

    if (activityRing) {
      if (activity > 0.01) {
        activityRing.visible = true;
        const expand = 1.4 + (1 - activity) * 4.2;
        activityRing.scale.setScalar(expand);
        const activityMat = activityRing.material as THREE.MeshBasicMaterial;
        activityMat.opacity = 0.38 * activity;
      } else {
        activityRing.visible = false;
      }
    }

    if (glowMatRef.current) {
      const base = highlighted
        ? 0.42
        : 0.16 + Math.sin(elapsed * 1.4) * 0.04;
      glowMatRef.current.opacity = Math.min(0.55, base + activity * 0.28);
    }
    if (glowMeshRef.current) {
      const baseScale = highlighted ? 3.2 : 2.35;
      glowMeshRef.current.scale.setScalar(baseScale + activity * 1.1);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(
        (highlighted ? 1.4 : 1) + activity * 0.25
      );
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={coreRef}
        onPointerOver={(event) => {
          event.stopPropagation();
          show();
        }}
        onPointerOut={hide}
        onClick={(event) => {
          event.stopPropagation();
          openCity();
        }}
      >
        <sphereGeometry args={[0.028, 14, 14]} />
        <meshBasicMaterial color={city.color} toneMapped={false} />
      </mesh>

      <mesh ref={glowMeshRef} scale={2.35}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshBasicMaterial
          ref={glowMatRef}
          color={city.color}
          transparent
          opacity={0.2}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pulseRef}>
        <ringGeometry args={[0.04, 0.068, 48]} />
        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={activityRingRef} visible={false}>
        <ringGeometry args={[0.045, 0.078, 48]} />
        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          show();
        }}
        onPointerOut={hide}
        onClick={(event) => {
          event.stopPropagation();
          openCity();
        }}
      >
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <ActivityLabel cityName={city.name} reducedMotion={reducedMotion} />

      <Html
        position={[0, 0.14, 0]}
        center
        distanceFactor={10}
        zIndexRange={[40, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="relative flex flex-col items-center">
          {highlighted ? (
            <div
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none w-max max-w-[170px] rounded-lg border border-white/15 bg-[#0b0b18]/92 px-2.5 py-1.5 text-left text-white shadow-[0_10px_28px_rgba(0,0,0,0.4)] backdrop-blur-md"
            >
              <p className="text-[11px] font-semibold leading-tight tracking-wide">
                {city.name}
              </p>
              <p className="mt-0.5 text-[10px] text-white/55">{city.country}</p>
              <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.14em] text-sky-300/80">
                Open Discover
              </p>
            </div>
          ) : null}
        </div>
      </Html>
    </group>
  );
}
