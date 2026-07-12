import { createPrimitive } from "../../lib/motion/primitives";
import type { MotionTransitionDefinition } from "../../lib/motion/types";

export const GLOBE_TO_CITY_TRANSITION_ID = "globe-to-city";

/**
 * Globe Explore → City entry. Timing only — JourneyGlobe reacts; director navigates.
 */
export const globeToCityTransition: MotionTransitionDefinition = {
  id: GLOBE_TO_CITY_TRANSITION_ID,
  description: "Camera push and portal entry from Post Journey globe into a city.",
  phases: [
    {
      id: "pause_globe",
      durationMs: 80,
      reducedDurationMs: 40,
      primitives: [],
    },
    {
      id: "camera_push",
      durationMs: 900,
      skipInReduced: true,
      primitives: [createPrimitive("camera", { intensity: 0.9 })],
    },
    {
      id: "portal_expand",
      durationMs: 700,
      skipInReduced: true,
      primitives: [
        createPrimitive("portal", { intensity: 0.85 }),
        createPrimitive("zoom", { intensity: 0.6 }),
      ],
    },
    {
      id: "fade_route",
      durationMs: 280,
      reducedDurationMs: 160,
      primitives: [createPrimitive("fade", { intensity: 0.9 })],
    },
    {
      id: "navigate_city",
      durationMs: 40,
      reducedDurationMs: 40,
      primitives: [],
    },
  ],
};

export function registerGlobeToCityTransition(registry: {
  register: (definition: MotionTransitionDefinition) => void;
}) {
  registry.register(globeToCityTransition);
}
