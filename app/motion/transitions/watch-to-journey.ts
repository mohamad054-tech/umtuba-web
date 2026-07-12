import { createPrimitive } from "../../lib/motion/primitives";
import type { MotionTransitionDefinition } from "../../lib/motion/types";

/**
 * Live Watch → Post Journey motion definition.
 * Phase IDs/durations match the existing overlay for visual parity.
 * Production UI is driven by JourneyTransitionDirector as a Motion Engine adapter.
 */
export const WATCH_TO_JOURNEY_TRANSITION_ID = "watch-to-journey";

export const watchToJourneyTransition: MotionTransitionDefinition = {
  id: WATCH_TO_JOURNEY_TRANSITION_ID,
  description:
    "Cinematic handoff from Watch into Post Journey (engine-timed).",
  phases: [
    {
      id: "pause_video",
      durationMs: 80,
      reducedDurationMs: 40,
      primitives: [],
    },
    {
      id: "fade_ui",
      durationMs: 320,
      reducedDurationMs: 180,
      primitives: [createPrimitive("fade", { intensity: 0.85 })],
    },
    {
      id: "zoom_out_stage",
      durationMs: 520,
      skipInReduced: true,
      primitives: [
        createPrimitive("zoom", { intensity: 0.7 }),
        createPrimitive("blur", { intensity: 0.6 }),
      ],
    },
    {
      id: "morph_to_globe",
      durationMs: 480,
      skipInReduced: true,
      primitives: [
        createPrimitive("morph", { intensity: 0.8 }),
        createPrimitive("portal", { intensity: 0.75 }),
      ],
    },
    {
      id: "navigate_handoff",
      durationMs: 40,
      reducedDurationMs: 40,
      primitives: [],
    },
  ],
};

export function registerWatchToJourneyTransition(
  registry: { register: (definition: MotionTransitionDefinition) => void }
) {
  registry.register(watchToJourneyTransition);
}
