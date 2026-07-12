import { createPrimitive } from "../../lib/motion/primitives";
import type { MotionTransitionDefinition } from "../../lib/motion/types";

/**
 * First registered consumer definition for the Motion Engine.
 * This does NOT drive the live Watch → Journey UI yet.
 * JourneyTransitionDirector remains the production path until migration.
 */
export const WATCH_TO_JOURNEY_TRANSITION_ID = "watch-to-journey";

export const watchToJourneyTransition: MotionTransitionDefinition = {
  id: WATCH_TO_JOURNEY_TRANSITION_ID,
  description:
    "Cinematic handoff from Watch into Post Journey (definition only in this slice).",
  phases: [
    {
      id: "pause",
      durationMs: 80,
      primitives: [],
    },
    {
      id: "fade-ui",
      durationMs: 320,
      primitives: [createPrimitive("fade", { intensity: 0.85 })],
    },
    {
      id: "zoom-out",
      durationMs: 520,
      primitives: [
        createPrimitive("zoom", { intensity: 0.7 }),
        createPrimitive("blur", { intensity: 0.6 }),
      ],
    },
    {
      id: "morph",
      durationMs: 480,
      primitives: [
        createPrimitive("morph", { intensity: 0.8 }),
        createPrimitive("portal", { intensity: 0.75 }),
      ],
    },
    {
      id: "handoff",
      durationMs: 40,
      primitives: [],
    },
  ],
};

export function registerWatchToJourneyTransition(
  registry: { register: (definition: MotionTransitionDefinition) => void }
) {
  registry.register(watchToJourneyTransition);
}
