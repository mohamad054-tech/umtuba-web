import type { MotionRegistry } from "../../lib/motion/registry";
import { createMotionRegistry } from "../../lib/motion/registry";
import { registerWatchToJourneyTransition } from "./watch-to-journey";

/**
 * Explicit, deterministic registration of known transitions.
 * Call this when constructing the app registry — no hidden import side effects.
 */
export function registerDefaultMotionTransitions(
  registry: MotionRegistry = createMotionRegistry()
): MotionRegistry {
  registerWatchToJourneyTransition(registry);
  return registry;
}

export { watchToJourneyTransition, WATCH_TO_JOURNEY_TRANSITION_ID } from "./watch-to-journey";
export { registerWatchToJourneyTransition } from "./watch-to-journey";
