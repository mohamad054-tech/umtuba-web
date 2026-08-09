/**
 * UM Core platform lifecycle readiness foundation (P23) — local barrel.
 *
 * Not re-exported from platforms/core/index.ts in this milestone
 * (shared barrel wiring deferred to avoid export collisions).
 */

export * from "./codes";
export * from "./types";
export {
  createPlatformReadinessEvaluator,
  derivePlatformReadiness,
} from "./platformReadiness";
