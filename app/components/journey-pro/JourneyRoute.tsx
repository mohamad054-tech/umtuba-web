"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { City } from "./CityMarker";

export type Route = {
  from: City;
  to: City;
  color: string;
};

type JourneyRouteProps = {
  route: Route;
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

export default function JourneyRoute({ route }: JourneyRouteProps) {
  const points = useMemo(() => {
    const start = latLngToVector3(
      route.from.lat,
      route.from.lng,
      2.05
    );

    const end = latLngToVector3(
      route.to.lat,
      route.to.lng,
      2.05
    );

    const middle = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.35);

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      middle,
      end
    );

    return curve.getPoints(80);
  }, [route]);

  return (
    <>
      <Line
        points={points}
        color={route.color}
        lineWidth={3}
        transparent
        opacity={1}
      />

      <Line
        points={points}
        color={route.color}
        lineWidth={8}
        transparent
        opacity={0.12}
      />
    </>
  );
}