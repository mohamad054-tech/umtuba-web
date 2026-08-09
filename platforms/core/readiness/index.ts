/**
 * UM Core platform lifecycle readiness foundation (P23) — local barrel.
 *
 * Intentionally not re-exported from platforms/core/index.ts.
 * Accepted architecture: not root-public until a separate Central magnet GO.
 */

export * from "./codes";
export * from "./types";
export {
  createPlatformReadinessEvaluator,
  derivePlatformReadiness,
} from "./platformReadiness";
