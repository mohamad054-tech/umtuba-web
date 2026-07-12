"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import type { JourneyHandoffPayload } from "../lib/journey/handoff";
import { useMotion } from "./motion/useMotion";
import {
  GLOBE_CITIES,
  mapArrivalEnginePhase,
  resolveGlobeDestination,
  resolveTravelEndpoints,
  shouldDrawTravelPath,
  type GlobeCity,
  type PostJourneyArrivalPhase,
} from "./journey/handoffArrival";
import { resolvePostJourneyArrivalTransitionId } from "../motion/transitions/post-journey-arrival";
import { resolveMotionProfile } from "../lib/motion/profiles";

type Route = {
  from: GlobeCity;
  to: GlobeCity;
  color: string;
};

const routes: Route[] = [
  {
    from: GLOBE_CITIES[0],
    to: GLOBE_CITIES[1],
    color: "#67e8f9",
  },
  {
    from: GLOBE_CITIES[1],
    to: GLOBE_CITIES[2],
    color: "#a78bfa",
  },
  {
    from: GLOBE_CITIES[2],
    to: GLOBE_CITIES[3],
    color: "#34d399",
  },
];

function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);

  const x = -radius * Math.cos(latitude) * Math.cos(longitude);
  const y = radius * Math.sin(latitude);
  const z = radius * Math.cos(latitude) * Math.sin(longitude);

  return new THREE.Vector3(x, y, z);
}

function smoothStep(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

type ArrivalRuntime = {
  phase: PostJourneyArrivalPhase;
  phaseStartedAt: number;
  phaseDurationMs: number;
  reducedMotion: boolean;
  destinationIndex: number;
  sameOrigin: boolean;
  cameraStart: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  controlsEnabled: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
};

type OrbitControlsLike = {
  enabled: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
};

function CityMarker({ city }: { city: GlobeCity }) {
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.035),
    [city.lat, city.lng]
  );

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.035, 24, 24]} />
        <meshBasicMaterial color={city.color} toneMapped={false} />
      </mesh>
      <mesh scale={2.2}>
        <sphereGeometry args={[0.035, 24, 24]} />
        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function JourneyRoute({
  route,
  dimmed = false,
}: {
  route: Route;
  dimmed?: boolean;
}) {
  const points = useMemo(() => {
    const start = latLngToVector3(route.from.lat, route.from.lng, 2.04);
    const end = latLngToVector3(route.to.lat, route.to.lng, 2.04);
    const middle = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.35);
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    return curve.getPoints(80);
  }, [route]);

  return (
    <>
      <Line
        points={points}
        color={route.color}
        lineWidth={2.4}
        transparent
        opacity={dimmed ? 0.2 : 0.95}
      />
      <Line
        points={points}
        color={route.color}
        lineWidth={7}
        transparent
        opacity={dimmed ? 0.03 : 0.08}
      />
    </>
  );
}

function TravelPathReveal({
  route,
  runtimeRef,
}: {
  route: Route;
  runtimeRef: MutableRefObject<ArrivalRuntime>;
}) {
  const points = useMemo(() => {
    const start = latLngToVector3(route.from.lat, route.from.lng, 2.04);
    const end = latLngToVector3(route.to.lat, route.to.lng, 2.04);
    const middle = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.35);
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    return curve.getPoints(80);
  }, [route]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    geo.setDrawRange(0, 0);
    return geo;
  }, [points]);

  const lineObject = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color: route.color,
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    });
    return new THREE.Line(geometry, material);
  }, [geometry, route.color]);

  useFrame(() => {
    const runtime = runtimeRef.current;

    if (runtime.sameOrigin || runtime.phase === "idle") {
      geometry.setDrawRange(0, 0);
      return;
    }

    if (
      runtime.phase !== "path" &&
      runtime.phase !== "pulse" &&
      runtime.phase !== "card" &&
      runtime.phase !== "focus_hold" &&
      runtime.phase !== "complete"
    ) {
      geometry.setDrawRange(0, 0);
      return;
    }

    let progress = 1;

    if (runtime.phase === "path") {
      const elapsed = performance.now() - runtime.phaseStartedAt;
      progress = Math.min(
        1,
        Math.max(0, elapsed / Math.max(runtime.phaseDurationMs, 1))
      );
      progress = smoothStep(progress);
    }

    const count = Math.max(2, Math.floor(progress * points.length));
    geometry.setDrawRange(0, count);
  });

  return <primitive object={lineObject} />;
}

function DestinationPulse({
  city,
  runtimeRef,
}: {
  city: GlobeCity;
  runtimeRef: MutableRefObject<ArrivalRuntime>;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.045),
    [city.lat, city.lng]
  );

  useFrame(() => {
    const pulse = pulseRef.current;
    const runtime = runtimeRef.current;

    if (!pulse) {
      return;
    }

    const active =
      runtime.phase === "pulse" ||
      runtime.phase === "card" ||
      runtime.phase === "focus_hold" ||
      runtime.phase === "complete";

    if (!active) {
      pulse.visible = false;
      return;
    }

    pulse.visible = true;
    const now = performance.now();
    const elapsed = now - runtime.phaseStartedAt;
    const duration = runtime.reducedMotion ? 360 : 1100;
    const cycle = runtime.phase === "pulse" ? duration : 1400;
    const localElapsed =
      runtime.phase === "pulse" ? Math.max(0, elapsed) : now;
    const progress = (localElapsed % cycle) / cycle;
    const scale = runtime.reducedMotion
      ? 1 + progress * 2.2
      : 1 + progress * 5;

    pulse.scale.setScalar(scale);
    const material = pulse.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0, 0.5 * (1 - progress));
  });

  return (
    <mesh ref={pulseRef} position={position} visible={false}>
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

function HandoffCameraRig({
  runtimeRef,
  controlsRef,
}: {
  runtimeRef: MutableRefObject<ArrivalRuntime>;
  controlsRef: MutableRefObject<OrbitControlsLike | null>;
}) {
  const { camera } = useThree();

  useFrame(() => {
    const runtime = runtimeRef.current;
    const controls = controlsRef.current;

    if (controls) {
      controls.enabled = runtime.controlsEnabled;
      controls.autoRotate = runtime.autoRotate;
      controls.autoRotateSpeed = runtime.autoRotateSpeed;
    }

    if (runtime.phase !== "camera") {
      if (
        runtime.phase === "path" ||
        runtime.phase === "pulse" ||
        runtime.phase === "card" ||
        runtime.phase === "focus_hold"
      ) {
        camera.position.copy(runtime.cameraTarget);
        camera.lookAt(0, 0, 0);
      }
      return;
    }

    if (runtime.reducedMotion) {
      camera.position.copy(runtime.cameraTarget);
      camera.lookAt(0, 0, 0);
      return;
    }

    const elapsed = performance.now() - runtime.phaseStartedAt;
    const progress = smoothStep(
      Math.min(1, Math.max(0, elapsed / Math.max(runtime.phaseDurationMs, 1)))
    );

    camera.position.lerpVectors(
      runtime.cameraStart,
      runtime.cameraTarget,
      progress
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Earth({
  runtimeRef,
  highlightRoute,
  destination,
  cinematic,
}: {
  runtimeRef: MutableRefObject<ArrivalRuntime>;
  highlightRoute: Route | null;
  destination: GlobeCity;
  cinematic: boolean;
}) {
  const earthTexture = useLoader(
    THREE.TextureLoader,
    "/textures/earth-blue-marble.jpg"
  );

  // Three.js requires mutating the loaded texture's color space.
  // eslint-disable-next-line react-hooks/immutability -- TextureLoader asset is intentionally mutated
  earthTexture.colorSpace = THREE.SRGBColorSpace;

  return (
    <group rotation={[0, -0.55, 0]}>
      <mesh>
        <sphereGeometry args={[2, 96, 96]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.06, 96, 96]} />
        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {routes.map((route, index) => {
        const isHighlight =
          highlightRoute &&
          route.from.name === highlightRoute.from.name &&
          route.to.name === highlightRoute.to.name;

        return (
          <JourneyRoute
            key={`${route.from.name}-${route.to.name}-${index}`}
            route={route}
            dimmed={Boolean(cinematic && highlightRoute && !isHighlight)}
          />
        );
      })}

      {cinematic && highlightRoute ? (
        <TravelPathReveal route={highlightRoute} runtimeRef={runtimeRef} />
      ) : null}

      {GLOBE_CITIES.map((city) => (
        <CityMarker key={city.name} city={city} />
      ))}

      {cinematic ? (
        <DestinationPulse city={destination} runtimeRef={runtimeRef} />
      ) : null}
    </group>
  );
}

type JourneyGlobeProps = {
  handoff?: JourneyHandoffPayload | null;
  onArrivalPhaseChange?: (phase: PostJourneyArrivalPhase) => void;
  onArrivalComplete?: () => void;
};

export default function JourneyGlobe({
  handoff = null,
  onArrivalPhaseChange,
  onArrivalComplete,
}: JourneyGlobeProps) {
  const { startTransition, subscribe, cancel } = useMotion();
  const cinematic = Boolean(handoff);
  const destinationInfo = useMemo(
    () => resolveGlobeDestination(handoff),
    [handoff]
  );
  const travel = useMemo(
    () => resolveTravelEndpoints(destinationInfo.index),
    [destinationInfo.index]
  );
  const highlightRoute = useMemo(() => {
    if (!shouldDrawTravelPath(destinationInfo.index)) {
      return null;
    }

    return routes.find(
      (route) =>
        route.from.name === GLOBE_CITIES[travel.fromIndex].name &&
        route.to.name === GLOBE_CITIES[travel.toIndex].name
    ) ?? null;
  }, [destinationInfo.index, travel.fromIndex, travel.toIndex]);

  const destination = destinationInfo.city;
  const cameraTarget = useMemo(() => {
    const point = latLngToVector3(destination.lat, destination.lng, 1);
    return point.normalize().multiplyScalar(6);
  }, [destination.lat, destination.lng]);

  const runtimeRef = useRef<ArrivalRuntime>({
    phase: "idle",
    phaseStartedAt: 0,
    phaseDurationMs: 1,
    reducedMotion: false,
    destinationIndex: destinationInfo.index,
    sameOrigin: travel.sameOrigin,
    cameraStart: new THREE.Vector3(0, 0, 6),
    cameraTarget,
    controlsEnabled: !cinematic,
    autoRotate: !cinematic,
    autoRotateSpeed: cinematic ? 0.25 : 0.6,
  });

  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef<string | null>(null);
  const onPhaseChangeRef = useRef(onArrivalPhaseChange);
  const onCompleteRef = useRef(onArrivalComplete);

  useEffect(() => {
    onPhaseChangeRef.current = onArrivalPhaseChange;
    onCompleteRef.current = onArrivalComplete;
  }, [onArrivalPhaseChange, onArrivalComplete]);

  useEffect(() => {
    runtimeRef.current.destinationIndex = destinationInfo.index;
    runtimeRef.current.sameOrigin = travel.sameOrigin;
    runtimeRef.current.cameraTarget.copy(cameraTarget);
  }, [destinationInfo.index, travel.sameOrigin, cameraTarget]);

  useEffect(() => {
    const shell = shellRef.current;

    if (!cinematic || !handoff) {
      runtimeRef.current.phase = "idle";
      runtimeRef.current.controlsEnabled = true;
      runtimeRef.current.autoRotate = true;
      runtimeRef.current.autoRotateSpeed = 0.6;
      if (shell) {
        shell.style.transition = "";
        shell.style.opacity = "1";
      }
      return;
    }

    let cancelled = false;
    const profile = resolveMotionProfile("normal");
    const reducedMotion = profile === "reduced";
    const transitionId = resolvePostJourneyArrivalTransitionId(
      travel.sameOrigin
    );
    runtimeRef.current.reducedMotion = reducedMotion;
    runtimeRef.current.controlsEnabled = false;
    runtimeRef.current.autoRotate = false;
    runtimeRef.current.autoRotateSpeed = 0.25;
    runtimeRef.current.cameraStart.set(0, 0, 6);
    runtimeRef.current.phase = "fade";

    // Imperative opacity only — React style props must not reset this on re-render.
    if (shell) {
      shell.style.transition = "none";
      shell.style.opacity = "0";
    }

    const revealShell = () => {
      if (!shellRef.current) {
        return;
      }
      shellRef.current.style.opacity = "1";
    };

    const unsubscribe = subscribe((event) => {
      if (cancelled) {
        return;
      }

      if (event.type === "transition:start") {
        if (event.transitionId !== transitionId) {
          return;
        }
        runIdRef.current = event.runId;
        return;
      }

      if (
        runIdRef.current &&
        "runId" in event &&
        event.runId !== runIdRef.current
      ) {
        return;
      }

      if (event.type === "phase:start") {
        const phase = mapArrivalEnginePhase(event.phaseId);
        runtimeRef.current.phase = phase;
        runtimeRef.current.phaseStartedAt = performance.now();
        runtimeRef.current.phaseDurationMs = event.durationMs;

        if (phase === "fade") {
          if (shellRef.current) {
            shellRef.current.style.transition = reducedMotion
              ? "opacity 160ms ease"
              : "opacity 420ms ease";
          }
          revealShell();
        }

        if (phase === "camera") {
          runtimeRef.current.cameraStart.set(0, 0, 6);
        }

        onPhaseChangeRef.current?.(phase);
      }

      if (event.type === "transition:complete") {
        runtimeRef.current.phase = "complete";
        runtimeRef.current.controlsEnabled = true;
        runtimeRef.current.autoRotate = true;
        runtimeRef.current.autoRotateSpeed = 0.25;
        revealShell();
        onPhaseChangeRef.current?.("complete");
        onCompleteRef.current?.();
      }

      if (
        event.type === "transition:fail" ||
        event.type === "transition:cancel"
      ) {
        revealShell();
        runtimeRef.current.controlsEnabled = true;
        runtimeRef.current.autoRotate = true;
        runtimeRef.current.autoRotateSpeed = 0.25;
      }
    });

    void startTransition({
      type: transitionId,
      profile: "normal",
      concurrency: "replace",
      payload: {
        city: destination.name,
        sameOrigin: travel.sameOrigin,
      },
      onFail: () => {
        runtimeRef.current.controlsEnabled = true;
        runtimeRef.current.autoRotate = true;
        runtimeRef.current.autoRotateSpeed = 0.25;
        revealShell();
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
      cancel();
    };
  }, [
    cinematic,
    handoff,
    destination.name,
    travel.sameOrigin,
    startTransition,
    subscribe,
    cancel,
  ]);

  return (
    <div
      ref={shellRef}
      className="h-[620px] w-full overflow-hidden rounded-3xl bg-black"
    >
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={1.1} />
        <directionalLight position={[5, 3, 5]} intensity={2.5} />
        <Stars
          radius={120}
          depth={60}
          count={5000}
          factor={4}
          saturation={0}
          fade
        />

        <Earth
          runtimeRef={runtimeRef}
          highlightRoute={highlightRoute}
          destination={destination}
          cinematic={cinematic}
        />

        {cinematic ? (
          <HandoffCameraRig
            runtimeRef={runtimeRef}
            controlsRef={controlsRef}
          />
        ) : null}

        <OrbitControls
          ref={(controls) => {
            controlsRef.current = controls as OrbitControlsLike | null;
          }}
          enablePan={false}
          autoRotate={!cinematic}
          autoRotateSpeed={cinematic ? 0.25 : 0.6}
          enableDamping
          dampingFactor={0.06}
          minDistance={4.5}
          maxDistance={9}
          enabled={!cinematic}
        />
      </Canvas>
    </div>
  );
}
