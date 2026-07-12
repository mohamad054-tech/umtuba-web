"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { journeyCities } from "./journeyData";

function latLngToCameraPosition(
  lat: number,
  lng: number,
  distance: number
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  const x = -(distance * Math.sin(phi) * Math.cos(theta));
  const y = distance * Math.cos(phi);
  const z = distance * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

export default function CameraController() {
  const { camera } = useThree();

  const cameraPositions = useMemo(
    () =>
      journeyCities.map((city) =>
        latLngToCameraPosition(city.lat, city.lng, 5.2)
      ),
    []
  );

  useFrame(({ clock }) => {
    const travelDuration = 4;
    const pauseDuration = 1.5;
    const segmentDuration = travelDuration + pauseDuration;

    const totalSegments = cameraPositions.length;
    const totalDuration = totalSegments * segmentDuration;

    const elapsed = clock.getElapsedTime() % totalDuration;

    const currentIndex =
      Math.floor(elapsed / segmentDuration) % totalSegments;

    const nextIndex = (currentIndex + 1) % totalSegments;

    const segmentElapsed = elapsed % segmentDuration;

    const progress = Math.min(
      segmentElapsed / travelDuration,
      1
    );

    const easedProgress = smoothStep(progress);

    const startPosition = cameraPositions[currentIndex];
    const endPosition = cameraPositions[nextIndex];

    camera.position.lerpVectors(
      startPosition,
      endPosition,
      easedProgress
    );

    camera.lookAt(0, 0, 0);
  });

  return null;
}