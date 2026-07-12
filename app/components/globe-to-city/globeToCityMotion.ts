import {
  buildCityHref,
  createCityHandoff,
  type CityHandoffPayload,
} from "../../lib/city/handoff";
import {
  getFallbackTimeoutMs,
  resolveMotionProfile,
  resolveTimeline,
  type MotionProfile,
  type MotionTransitionResult,
  type StartTransitionOptions,
} from "../../lib/motion";
import { globeToCityTransition, GLOBE_TO_CITY_TRANSITION_ID } from "../../motion/transitions/globe-to-city";

export const GLOBE_TO_CITY_PHASES = [
  "idle",
  "pause_globe",
  "camera_push",
  "portal_expand",
  "fade_route",
  "navigate_city",
  "complete",
] as const;

export type GlobeToCityPhase = (typeof GLOBE_TO_CITY_PHASES)[number];

export function isGlobeToCityPhase(value: string): value is GlobeToCityPhase {
  return (GLOBE_TO_CITY_PHASES as readonly string[]).includes(value);
}

export function mapEnginePhaseToGlobeToCityPhase(
  phaseId: string
): GlobeToCityPhase {
  if (isGlobeToCityPhase(phaseId)) {
    return phaseId;
  }

  return "fade_route";
}

export function resolveGlobeToCityProfile(
  matchMedia?: (query: string) => { matches: boolean }
): MotionProfile {
  return resolveMotionProfile("normal", { matchMedia });
}

export function getGlobeToCityPhaseOrder(reduced: boolean): string[] {
  if (reduced) {
    return ["pause_globe", "fade_route", "navigate_city"];
  }

  return [
    "pause_globe",
    "camera_push",
    "portal_expand",
    "fade_route",
    "navigate_city",
  ];
}

export function buildGlobeToCityHandoff(input: {
  city: string;
  country: string;
  lat: number;
  lng: number;
  videoId?: string | null;
  title?: string | null;
  authorName?: string | null;
}): CityHandoffPayload {
  return createCityHandoff({
    city: input.city,
    country: input.country,
    lat: input.lat,
    lng: input.lng,
    source: {
      videoId: input.videoId ?? null,
      title: input.title ?? null,
      authorName: input.authorName ?? null,
    },
    fromPath: "/post-journey",
  });
}

export function buildGlobeToCityHref(handoff: CityHandoffPayload) {
  return buildCityHref(handoff);
}

export function buildGlobeToCityStartOptions(input: {
  handoff: CityHandoffPayload;
  profile: MotionProfile;
  onComplete: () => void;
  onFail: () => void;
  onCancel: () => void;
}): StartTransitionOptions<CityHandoffPayload> {
  return {
    type: GLOBE_TO_CITY_TRANSITION_ID,
    profile: input.profile,
    payload: input.handoff,
    from: "post-journey",
    to: "city",
    concurrency: "reject",
    onComplete: input.onComplete,
    onFail: input.onFail,
    onCancel: input.onCancel,
  };
}

export function shouldUnlockGlobeAfterMotionResult(
  result: MotionTransitionResult
) {
  return result.status === "failed" || result.status === "cancelled";
}

export function getGlobeToCityHardFallbackMs(reducedMotion: boolean) {
  const timeline = resolveTimeline(
    globeToCityTransition,
    reducedMotion ? "reduced" : "normal"
  );
  return getFallbackTimeoutMs(timeline);
}

/** Same-route / hard navigation fallback helper. */
export function resolveCityNavigationHref(
  handoff: CityHandoffPayload,
  currentPathname?: string
) {
  const href = buildGlobeToCityHref(handoff);

  if (!currentPathname) {
    return href;
  }

  // Always navigate to the city route; if already there, hard assign still refreshes safely.
  return href;
}
