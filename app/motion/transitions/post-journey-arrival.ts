import { createPrimitive } from "../../lib/motion/primitives";
import type { MotionTransitionDefinition } from "../../lib/motion/types";

export const POST_JOURNEY_ARRIVAL_TRANSITION_ID = "post-journey-arrival";
export const POST_JOURNEY_ARRIVAL_SAME_ORIGIN_TRANSITION_ID =
  "post-journey-arrival-same-origin";

const fadePhase = {
  id: "fade",
  durationMs: 420,
  reducedDurationMs: 160,
  primitives: [createPrimitive("fade", { intensity: 0.9 })],
};

const cameraPhase = {
  id: "camera",
  durationMs: 1600,
  reducedDurationMs: 80,
  primitives: [createPrimitive("camera", { intensity: 0.85 })],
};

const pathPhase = {
  id: "path",
  durationMs: 900,
  skipInReduced: true,
  primitives: [createPrimitive("morph", { intensity: 0.7 })],
};

const pulsePhase = {
  id: "pulse",
  durationMs: 1100,
  reducedDurationMs: 360,
  primitives: [createPrimitive("zoom", { intensity: 0.4 })],
};

const cardPhase = {
  id: "card",
  durationMs: 220,
  reducedDurationMs: 120,
  primitives: [createPrimitive("fade", { intensity: 0.5 })],
};

const focusHoldPhase = {
  id: "focus_hold",
  durationMs: 2800,
  reducedDurationMs: 900,
  primitives: [] as ReturnType<typeof createPrimitive>[],
};

/**
 * Orchestrates globe arrival cinema: fade → camera → path → pulse → card → focus hold.
 * Timing only — JourneyGlobe reacts to Motion Engine events.
 */
export const postJourneyArrivalTransition: MotionTransitionDefinition = {
  id: POST_JOURNEY_ARRIVAL_TRANSITION_ID,
  description: "Handoff-driven arrival on the Post Journey globe.",
  phases: [
    fadePhase,
    cameraPhase,
    pathPhase,
    pulsePhase,
    cardPhase,
    focusHoldPhase,
  ],
};

/** Same-origin: no travel path phase — camera focus + pulse only. */
export const postJourneyArrivalSameOriginTransition: MotionTransitionDefinition =
  {
    id: POST_JOURNEY_ARRIVAL_SAME_ORIGIN_TRANSITION_ID,
    description:
      "Handoff arrival when destination equals origin (no fake travel path).",
    phases: [fadePhase, cameraPhase, pulsePhase, cardPhase, focusHoldPhase],
  };

export function resolvePostJourneyArrivalTransitionId(sameOrigin: boolean) {
  return sameOrigin
    ? POST_JOURNEY_ARRIVAL_SAME_ORIGIN_TRANSITION_ID
    : POST_JOURNEY_ARRIVAL_TRANSITION_ID;
}

export function registerPostJourneyArrivalTransition(registry: {
  register: (definition: MotionTransitionDefinition) => void;
}) {
  registry.register(postJourneyArrivalTransition);
  registry.register(postJourneyArrivalSameOriginTransition);
}
