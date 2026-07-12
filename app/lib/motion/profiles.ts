import type { MotionProfile } from "./types";

export type MotionProfileConfig = {
  /** Multiplier applied to base phase durations. */
  durationScale: number;
  /** When true, only keep fade-like primitives (and empty phases). */
  stripHeavyPrimitives: boolean;
};

export const MOTION_PROFILES: Record<MotionProfile, MotionProfileConfig> = {
  fast: {
    durationScale: 0.55,
    stripHeavyPrimitives: false,
  },
  normal: {
    durationScale: 1,
    stripHeavyPrimitives: false,
  },
  cinematic: {
    durationScale: 1.35,
    stripHeavyPrimitives: false,
  },
  reduced: {
    durationScale: 0.45,
    stripHeavyPrimitives: true,
  },
};

const HEAVY_PRIMITIVES = new Set([
  "zoom",
  "blur",
  "shared-element",
  "portal",
  "camera",
  "morph",
]);

export function isHeavyPrimitive(type: string) {
  return HEAVY_PRIMITIVES.has(type);
}

export function prefersReducedMotion(
  matchMedia: (query: string) => { matches: boolean } = defaultMatchMedia
) {
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function defaultMatchMedia(query: string) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return { matches: false };
  }

  return window.matchMedia(query);
}

/**
 * Resolve the effective profile.
 * Explicit "reduced" always wins.
 * Otherwise OS prefers-reduced-motion upgrades the request to "reduced".
 */
export function resolveMotionProfile(
  requested: MotionProfile | undefined,
  options?: {
    matchMedia?: (query: string) => { matches: boolean };
  }
): MotionProfile {
  if (requested === "reduced") {
    return "reduced";
  }

  const reduced = prefersReducedMotion(options?.matchMedia);

  if (reduced) {
    return "reduced";
  }

  return requested ?? "normal";
}

export function getProfileConfig(profile: MotionProfile): MotionProfileConfig {
  return MOTION_PROFILES[profile];
}
