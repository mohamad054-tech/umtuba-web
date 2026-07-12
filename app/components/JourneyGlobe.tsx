"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import type { JourneyHandoffPayload } from "../lib/journey/handoff";
import { useMotionApi } from "./motion/useMotion";
import {
  GLOBE_CITIES,
  mapArrivalEnginePhase,
  resolveGlobeDestination,
  resolveTravelEndpoints,
  shouldDrawTravelPath,
  type GlobeCity,
  type PostJourneyArrivalPhase,
} from "./journey/handoffArrival";
import {
  EARTH_Y_ROTATION,
  latLngToVector3,
  latLngToWorldVector3,
} from "./journey/globeCoordinates";
import { resolvePostJourneyArrivalTransitionId } from "../motion/transitions/post-journey-arrival";
import { resolveMotionProfile } from "../lib/motion/profiles";
import type { GlobeToCityPhase } from "./globe-to-city/globeToCityMotion";

/** 2048×1024 — full 4096 marble uploads were losing WebGL on remount. */
const EARTH_TEXTURE_URL = "/textures/earth-blue-marble-2048.jpg";

useLoader.preload(THREE.TextureLoader, EARTH_TEXTURE_URL);

const AUTO_ROTATE_SPEED_NORMAL = 0.6;
const AUTO_ROTATE_SPEED_GENTLE = 0.28;

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
  pointerOverGlobe: boolean;
  cityEntryPhase: GlobeToCityPhase;
  cityEntryStartedAt: number;
  cityEntryDurationMs: number;
  cityEntryReduced: boolean;
  cityEntryPushStart: THREE.Vector3;
  cityEntryPushEnd: THREE.Vector3;
  portalProgress: number;
};

type OrbitControlsLike = {
  enabled: boolean;
  autoRotate: boolean;
  autoRotateSpeed: number;
};

/** Hover pause only after arrival is idle/complete and city entry is not running. */
function canPauseAutoRotateOnHover(runtime: ArrivalRuntime) {
  const cityActive =
    runtime.cityEntryPhase !== "idle" && runtime.cityEntryPhase !== "complete";

  if (cityActive) {
    return false;
  }

  return runtime.phase === "idle" || runtime.phase === "complete";
}

function CityMarker({ city }: { city: GlobeCity }) {
  const [highlighted, setHighlighted] = useState(false);
  const tooltipId = `globe-city-tooltip-${city.name
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.035),
    [city.lat, city.lng]
  );

  const show = useCallback(() => setHighlighted(true), []);
  const hide = useCallback(() => setHighlighted(false), []);

  return (
    <group position={position}>
      <mesh
        scale={highlighted ? 1.45 : 1}
        onPointerOver={(event) => {
          event.stopPropagation();
          show();
        }}
        onPointerOut={hide}
      >
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color={city.color} toneMapped={false} />
      </mesh>
      <mesh scale={highlighted ? 3.1 : 2.2}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={highlighted ? 0.38 : 0.18}
          toneMapped={false}
        />
      </mesh>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          show();
        }}
        onPointerOut={hide}
      >
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html
        position={[0, 0.15, 0]}
        center
        distanceFactor={10}
        zIndexRange={[50, 0]}
        style={{ pointerEvents: "auto" }}
      >
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            tabIndex={0}
            aria-label={`${city.name}, ${city.country}`}
            aria-describedby={highlighted ? tooltipId : undefined}
            onFocus={show}
            onBlur={hide}
            onPointerEnter={show}
            onPointerLeave={hide}
            className={`h-3.5 w-3.5 rounded-full border-2 bg-black/20 outline-none transition focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510] ${
              highlighted ? "scale-125" : "scale-100 opacity-80"
            }`}
            style={{
              borderColor: city.color,
              boxShadow: highlighted
                ? `0 0 14px ${city.color}`
                : `0 0 6px ${city.color}66`,
            }}
          />
          {highlighted ? (
            <div
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute top-full z-10 mt-2 w-max max-w-[190px] rounded-xl border border-white/15 bg-[#0b0b18]/95 px-3 py-2 text-left text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <p className="text-sm font-black leading-tight">{city.name}</p>
              <p className="mt-0.5 text-xs text-white/60">{city.country}</p>
              <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-cyan-200/90">
                Explore this city
              </p>
            </div>
          ) : null}
        </div>
      </Html>
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
    return curve.getPoints(64);
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

/**
 * Path reveal via drawRange on drei Line geometry.
 * No manual BufferGeometry/Line ownership and no dispose calls.
 */
function TravelPathReveal({
  route,
  runtimeRef,
}: {
  route: Route;
  runtimeRef: MutableRefObject<ArrivalRuntime>;
}) {
  const lineRef = useRef<{ geometry?: THREE.BufferGeometry } | null>(null);

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
    return curve.getPoints(64);
  }, [route]);

  useFrame(() => {
    const runtime = runtimeRef.current;
    const geometry = lineRef.current?.geometry;

    if (!geometry) {
      return;
    }

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

  return (
    <Line
      ref={lineRef as never}
      points={points}
      color={route.color}
      lineWidth={2.6}
      transparent
      opacity={0.95}
    />
  );
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
      <ringGeometry args={[0.05, 0.09, 48]} />
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
      const pauseForHover =
        runtime.pointerOverGlobe && canPauseAutoRotateOnHover(runtime);
      controls.autoRotate = runtime.autoRotate && !pauseForHover;
      controls.autoRotateSpeed = runtime.autoRotateSpeed;
    }

    const cityPhase = runtime.cityEntryPhase;
    const cityActive = cityPhase !== "idle" && cityPhase !== "complete";

    if (cityActive) {
      if (cityPhase === "camera_push") {
        if (runtime.cityEntryReduced) {
          camera.position.copy(runtime.cityEntryPushEnd);
        } else {
          const elapsed = performance.now() - runtime.cityEntryStartedAt;
          const progress = smoothStep(
            Math.min(
              1,
              Math.max(0, elapsed / Math.max(runtime.cityEntryDurationMs, 1))
            )
          );
          camera.position.lerpVectors(
            runtime.cityEntryPushStart,
            runtime.cityEntryPushEnd,
            progress
          );
        }
        camera.lookAt(0, 0, 0);
        return;
      }

      if (
        cityPhase === "portal_expand" ||
        cityPhase === "fade_route" ||
        cityPhase === "navigate_city" ||
        cityPhase === "pause_globe"
      ) {
        if (cityPhase !== "pause_globe") {
          camera.position.copy(runtime.cityEntryPushEnd);
        }
        camera.lookAt(0, 0, 0);

        if (cityPhase === "portal_expand" && !runtime.cityEntryReduced) {
          const elapsed = performance.now() - runtime.cityEntryStartedAt;
          runtime.portalProgress = smoothStep(
            Math.min(
              1,
              Math.max(0, elapsed / Math.max(runtime.cityEntryDurationMs, 1))
            )
          );
        } else if (
          cityPhase === "fade_route" ||
          cityPhase === "navigate_city"
        ) {
          runtime.portalProgress = 1;
        }
      }

      return;
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

function CityEntryPortal({
  city,
  runtimeRef,
}: {
  city: GlobeCity;
  runtimeRef: MutableRefObject<ArrivalRuntime>;
}) {
  const portalRef = useRef<THREE.Mesh>(null);
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.08),
    [city.lat, city.lng]
  );

  useFrame(() => {
    const portal = portalRef.current;
    const runtime = runtimeRef.current;

    if (!portal) {
      return;
    }

    const active =
      runtime.cityEntryPhase === "portal_expand" ||
      runtime.cityEntryPhase === "fade_route" ||
      runtime.cityEntryPhase === "navigate_city";

    if (!active) {
      portal.visible = false;
      return;
    }

    portal.visible = true;
    const progress = runtime.cityEntryReduced
      ? 1
      : Math.max(runtime.portalProgress, 0.08);
    portal.scale.setScalar(1 + progress * 14);
    const material = portal.material as THREE.MeshBasicMaterial;
    material.opacity = Math.max(0.12, 0.55 * (1 - progress * 0.35));
  });

  return (
    <mesh ref={portalRef} position={position} visible={false}>
      <ringGeometry args={[0.04, 0.09, 48]} />
      <meshBasicMaterial
        color={city.color}
        transparent
        opacity={0.45}
        side={THREE.DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function WebGlContextGuard({
  onContextLost,
}: {
  onContextLost: () => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    function handleLost(event: Event) {
      event.preventDefault();
      // Blank lost-context canvas otherwise keeps pointer-events and blocks
      // the page center (wheel / drag only work near the left/right edges).
      canvas.style.pointerEvents = "none";
      if (canvas.parentElement) {
        canvas.parentElement.style.pointerEvents = "none";
      }
      onContextLost();
    }

    canvas.addEventListener("webglcontextlost", handleLost, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", handleLost, false);
    };
  }, [gl, onContextLost]);

  return null;
}

function Earth({
  runtimeRef,
  highlightRoute,
  destination,
  cinematic,
  cityEntryActive,
}: {
  runtimeRef: MutableRefObject<ArrivalRuntime>;
  highlightRoute: Route | null;
  destination: GlobeCity;
  cinematic: boolean;
  cityEntryActive: boolean;
}) {
  const earthTexture = useLoader(THREE.TextureLoader, EARTH_TEXTURE_URL);

  useEffect(() => {
    // Three.js requires mutating the loaded texture color space once.
    // eslint-disable-next-line react-hooks/immutability -- TextureLoader asset is intentionally mutated
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 1;
    earthTexture.generateMipmaps = true;
    earthTexture.minFilter = THREE.LinearMipmapLinearFilter;
    earthTexture.magFilter = THREE.LinearFilter;
  }, [earthTexture]);

  return (
    <group rotation={[0, EARTH_Y_ROTATION, 0]}>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.06, 64, 64]} />
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

      {cityEntryActive ? (
        <CityEntryPortal city={destination} runtimeRef={runtimeRef} />
      ) : null}
    </group>
  );
}

type JourneyGlobeProps = {
  handoff?: JourneyHandoffPayload | null;
  onArrivalPhaseChange?: (phase: PostJourneyArrivalPhase) => void;
  onArrivalComplete?: () => void;
  cityEntryPhase?: GlobeToCityPhase;
  cityEntryReducedMotion?: boolean;
};

function JourneyGlobeComponent({
  handoff = null,
  onArrivalPhaseChange,
  onArrivalComplete,
  cityEntryPhase = "idle",
  cityEntryReducedMotion = false,
}: JourneyGlobeProps) {
  const { startTransition, subscribe } = useMotionApi();
  const cinematic = Boolean(handoff);
  const [contextLost, setContextLost] = useState(false);

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

    return (
      routes.find(
        (route) =>
          route.from.name === GLOBE_CITIES[travel.fromIndex].name &&
          route.to.name === GLOBE_CITIES[travel.toIndex].name
      ) ?? null
    );
  }, [destinationInfo.index, travel.fromIndex, travel.toIndex]);

  const destination = destinationInfo.city;
  const cameraTarget = useMemo(() => {
    return latLngToWorldVector3(destination.lat, destination.lng, 1)
      .normalize()
      .multiplyScalar(6);
  }, [destination.lat, destination.lng]);

  const cityEntryPushEnd = useMemo(() => {
    return latLngToWorldVector3(destination.lat, destination.lng, 1)
      .normalize()
      .multiplyScalar(3.35);
  }, [destination.lat, destination.lng]);

  const cityEntryActive =
    cityEntryPhase !== "idle" && cityEntryPhase !== "complete";

  const runtimeRef = useRef<ArrivalRuntime>({
    phase: "idle",
    phaseStartedAt: 0,
    phaseDurationMs: 1,
    reducedMotion: false,
    destinationIndex: destinationInfo.index,
    sameOrigin: travel.sameOrigin,
    cameraStart: new THREE.Vector3(0, 0, 6),
    cameraTarget: cameraTarget.clone(),
    controlsEnabled: !cinematic && !cityEntryActive,
    autoRotate: !cinematic && !cityEntryActive,
    autoRotateSpeed:
      cinematic || cityEntryActive
        ? AUTO_ROTATE_SPEED_GENTLE
        : AUTO_ROTATE_SPEED_NORMAL,
    pointerOverGlobe: false,
    cityEntryPhase: "idle",
    cityEntryStartedAt: 0,
    cityEntryDurationMs: 1,
    cityEntryReduced: false,
    cityEntryPushStart: cameraTarget.clone(),
    cityEntryPushEnd: cityEntryPushEnd.clone(),
    portalProgress: 0,
  });

  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef<string | null>(null);
  const onPhaseChangeRef = useRef(onArrivalPhaseChange);
  const onCompleteRef = useRef(onArrivalComplete);
  const hasRevealedRef = useRef(!cinematic);

  useEffect(() => {
    onPhaseChangeRef.current = onArrivalPhaseChange;
    onCompleteRef.current = onArrivalComplete;
  }, [onArrivalPhaseChange, onArrivalComplete]);

  useEffect(() => {
    runtimeRef.current.destinationIndex = destinationInfo.index;
    runtimeRef.current.sameOrigin = travel.sameOrigin;
    runtimeRef.current.cameraTarget.copy(cameraTarget);
    runtimeRef.current.cityEntryPushEnd.copy(cityEntryPushEnd);
  }, [destinationInfo.index, travel.sameOrigin, cameraTarget, cityEntryPushEnd]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    const previous = runtime.cityEntryPhase;
    runtime.cityEntryPhase = cityEntryPhase;
    runtime.cityEntryReduced = cityEntryReducedMotion;

    if (cityEntryPhase !== previous) {
      runtime.cityEntryStartedAt = performance.now();
      runtime.cityEntryDurationMs =
        cityEntryPhase === "camera_push"
          ? 900
          : cityEntryPhase === "portal_expand"
            ? 700
            : 280;
    }

    if (cityEntryActive) {
      runtime.controlsEnabled = false;
      runtime.autoRotate = false;
      runtime.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
      runtime.cityEntryPushStart.copy(runtime.cameraTarget);

      if (cityEntryPhase === "pause_globe") {
        runtime.portalProgress = 0;
      }
    } else if (previous !== "idle" && cityEntryPhase === "idle") {
      runtime.controlsEnabled = true;
      runtime.autoRotate = true;
      runtime.autoRotateSpeed = runtime.pointerOverGlobe
        ? AUTO_ROTATE_SPEED_GENTLE
        : AUTO_ROTATE_SPEED_NORMAL;
      runtime.portalProgress = 0;
    }
  }, [cityEntryPhase, cityEntryReducedMotion, cityEntryActive]);

  useEffect(() => {
    const shell = shellRef.current;

    if (!cinematic || !handoff) {
      runtimeRef.current.phase = "idle";
      runtimeRef.current.controlsEnabled = true;
      runtimeRef.current.autoRotate = true;
      runtimeRef.current.autoRotateSpeed = AUTO_ROTATE_SPEED_NORMAL;
      hasRevealedRef.current = true;
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
    runIdRef.current = null;
    hasRevealedRef.current = false;
    runtimeRef.current.reducedMotion = reducedMotion;
    runtimeRef.current.controlsEnabled = false;
    runtimeRef.current.autoRotate = false;
    runtimeRef.current.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
    runtimeRef.current.cameraStart.set(0, 0, 6);
    runtimeRef.current.phase = "fade";

    if (shell) {
      shell.style.transition = "none";
      shell.style.opacity = "0";
    }

    const revealShell = () => {
      hasRevealedRef.current = true;
      if (!shellRef.current) {
        return;
      }
      shellRef.current.style.opacity = "1";
    };

    const unsubscribe = subscribe((event) => {
      if (cancelled) {
        return;
      }

      if ("transitionId" in event && event.transitionId !== transitionId) {
        return;
      }

      if (event.type === "transition:start") {
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

        if (!phase) {
          return;
        }

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

        if (hasRevealedRef.current) {
          revealShell();
        }

        onPhaseChangeRef.current?.(phase);
      }

      if (event.type === "transition:complete") {
        runtimeRef.current.phase = "complete";
        runtimeRef.current.controlsEnabled = true;
        runtimeRef.current.autoRotate = true;
        runtimeRef.current.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
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
        runtimeRef.current.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
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
        runtimeRef.current.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
        revealShell();
      },
    });

    return () => {
      cancelled = true;
      unsubscribe();
      // Do not call cancel() here: React Strict Mode remount would tear down
      // the in-flight arrival and race a second Canvas/WebGL context.
      // The remounted effect uses concurrency: "replace" instead.
    };
  }, [
    cinematic,
    handoff,
    destination.name,
    travel.sameOrigin,
    startTransition,
    subscribe,
  ]);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleGlobePointerEnter = useCallback(() => {
    runtimeRef.current.pointerOverGlobe = true;
  }, []);

  const handleGlobePointerLeave = useCallback(() => {
    const runtime = runtimeRef.current;
    runtime.pointerOverGlobe = false;

    if (canPauseAutoRotateOnHover(runtime) && runtime.autoRotate) {
      runtime.autoRotateSpeed = AUTO_ROTATE_SPEED_GENTLE;
    }
  }, []);

  return (
    <div className="relative bg-[#050510]">
      <div
        ref={shellRef}
        className="h-[620px] w-full overflow-hidden rounded-3xl bg-[#050510]"
        style={{ pointerEvents: contextLost ? "none" : undefined }}
        onPointerEnter={handleGlobePointerEnter}
        onPointerLeave={handleGlobePointerLeave}
      >
        <Canvas
          camera={{ position: [0, 0, 6], fov: 45 }}
          dpr={[1, 1.25]}
          gl={{
            antialias: false,
            alpha: false,
            powerPreference: "default",
            failIfMajorPerformanceCaveat: false,
            preserveDrawingBuffer: false,
          }}
          style={{
            background: "#050510",
            pointerEvents: contextLost ? "none" : "auto",
          }}
          onCreated={({ gl }) => {
            gl.setClearColor("#050510", 1);
          }}
        >
          <WebGlContextGuard onContextLost={handleContextLost} />
          <color attach="background" args={["#050510"]} />
          <ambientLight intensity={1.1} />
          <directionalLight position={[5, 3, 5]} intensity={2.5} />
          <Stars
            radius={120}
            depth={60}
            count={2500}
            factor={4}
            saturation={0}
            fade
          />

          {/* Suspense stays inside Canvas so texture load never remounts WebGL. */}
          <Suspense fallback={null}>
            <Earth
              runtimeRef={runtimeRef}
              highlightRoute={highlightRoute}
              destination={destination}
              cinematic={cinematic}
              cityEntryActive={cityEntryActive}
            />
          </Suspense>

          <HandoffCameraRig
            runtimeRef={runtimeRef}
            controlsRef={controlsRef}
          />

          <OrbitControls
            ref={(controls) => {
              controlsRef.current = controls as OrbitControlsLike | null;
            }}
            enablePan={false}
            autoRotate={!cinematic && !cityEntryActive}
            autoRotateSpeed={
              cinematic || cityEntryActive
                ? AUTO_ROTATE_SPEED_GENTLE
                : AUTO_ROTATE_SPEED_NORMAL
            }
            enableDamping
            dampingFactor={0.06}
            minDistance={4.5}
            maxDistance={9}
            enabled={!cinematic && !cityEntryActive}
          />
        </Canvas>
      </div>

      {contextLost ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-x-4 bottom-4 z-30 rounded-2xl border border-amber-300/30 bg-amber-300/15 px-4 py-3 text-sm text-amber-50 backdrop-blur"
        >
          <p className="font-bold">Globe graphics paused</p>
          <p className="mt-1 text-amber-50/80">
            The WebGL context was lost. Reload to restore the globe.
          </p>
          <button
            type="button"
            onClick={handleReload}
            className="pointer-events-auto mt-3 rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            Reload page
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Memoized so parent arrival-phase / card state updates do not re-render
 * the Canvas host (a common cause of WebGL context loss under Strict Mode).
 */
const JourneyGlobe = memo(JourneyGlobeComponent);
export default JourneyGlobe;
