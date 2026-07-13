"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { LivingRoute } from "./types";
import { createArcCurve } from "./curveUtils";
import { useGlobalPulse } from "./GlobalPulseContext";
import { ROUTE_RADIUS } from "./livingEarthData";

type FlightRouteProps = {
  route: LivingRoute;
  reducedMotion: boolean;
};

type LineLike = {
  material: { opacity: number };
};

export default function FlightRoute({
  route,
  reducedMotion,
}: FlightRouteProps) {
  const coreRef = useRef<LineLike | null>(null);
  const glowRef = useRef<LineLike | null>(null);
  const { getCityIntensity } = useGlobalPulse();

  const points = useMemo(() => {
    const curve = createArcCurve(
      route.from.lat,
      route.from.lng,
      route.to.lat,
      route.to.lng,
      ROUTE_RADIUS,
      2.34
    );
    return curve.getPoints(48);
  }, [route]);

  useFrame(() => {
    const core = coreRef.current;
    const glow = glowRef.current;
    if (!core || !glow) return;

    if (reducedMotion) {
      core.material.opacity = 0.7;
      glow.material.opacity = 0.11;
      return;
    }

    const boost = Math.max(
      getCityIntensity(route.from.name),
      getCityIntensity(route.to.name)
    );
    core.material.opacity = 0.7 + boost * 0.28;
    glow.material.opacity = 0.11 + boost * 0.16;
  });

  return (
    <>
      <Line
        ref={glowRef as never}
        points={points}
        color={route.color}
        lineWidth={6}
        transparent
        opacity={0.11}
        depthWrite={false}
      />
      <Line
        ref={coreRef as never}
        points={points}
        color={route.color}
        lineWidth={1.75}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </>
  );
}
