import type { MotionRegistry } from "../../lib/motion/registry";
import { createMotionRegistry } from "../../lib/motion/registry";
import { registerGlobeToCityTransition } from "./globe-to-city";
import { registerPostJourneyArrivalTransition } from "./post-journey-arrival";
import { registerWatchToJourneyTransition } from "./watch-to-journey";

/**
 * Explicit, deterministic registration of known transitions.
 * Call this when constructing the app registry — no hidden import side effects.
 */
export function registerDefaultMotionTransitions(
  registry: MotionRegistry = createMotionRegistry()
): MotionRegistry {
  registerWatchToJourneyTransition(registry);
  registerPostJourneyArrivalTransition(registry);
  registerGlobeToCityTransition(registry);
  return registry;
}

export {
  watchToJourneyTransition,
  WATCH_TO_JOURNEY_TRANSITION_ID,
  registerWatchToJourneyTransition,
} from "./watch-to-journey";

export {
  postJourneyArrivalTransition,
  postJourneyArrivalSameOriginTransition,
  POST_JOURNEY_ARRIVAL_TRANSITION_ID,
  POST_JOURNEY_ARRIVAL_SAME_ORIGIN_TRANSITION_ID,
  resolvePostJourneyArrivalTransitionId,
  registerPostJourneyArrivalTransition,
} from "./post-journey-arrival";

export {
  globeToCityTransition,
  GLOBE_TO_CITY_TRANSITION_ID,
  registerGlobeToCityTransition,
} from "./globe-to-city";
