/**
 * Deterministic weighted scoring config for Recommendation V1.
 * Tunable constants — not learned weights.
 */

import type { DiversityPolicy } from "./types";

/** Early-skip heuristic mirrored by SQL record_watch_signal. */
export const EARLY_SKIP_WATCH_PERCENT = 15;
export const EARLY_SKIP_DURATION_MS = 3000;

/** Weights for a single session watch-signal quality component (sum ≈ 1). */
export const WATCH_SIGNAL_WEIGHTS = {
  watchPercent: 0.35,
  completed: 0.25,
  rewatchCount: 0.1,
  liked: 0.08,
  saved: 0.08,
  shared: 0.05,
  commented: 0.05,
  followAfterWatch: 0.09,
  skippedEarly: -0.25,
} as const;

/**
 * Top-level recommendation score mix.
 * Positive terms + skipPenalty (negative contribution handled separately).
 */
export const RECOMMENDATION_SCORE_WEIGHTS = {
  watchQuality: 0.22,
  engagement: 0.18,
  creatorQuality: 0.16,
  videoQuality: 0.16,
  interestAffinity: 0.14,
  recency: 0.06,
  exploration: 0.08,
  skipPenalty: 0.12,
} as const;

/** Engagement prior from denormalized post counters when session signal missing. */
export const ENGAGEMENT_COUNTER_WEIGHTS = {
  likeRate: 0.28,
  saveRate: 0.28,
  shareRate: 0.18,
  commentRate: 0.18,
  viewPrior: 0.08,
} as const;

export const DEFAULT_DIVERSITY_POLICY: DiversityPolicy = {
  maxPerCreator: 2,
  explorationSlotFraction: 0.2,
  minExplorationSlots: 1,
};

/** Recency half-life in days (score halves each half-life). */
export const RECENCY_HALF_LIFE_DAYS = 7;

/** Clamp rewatch contribution (matches SQL /5.0 normalization). */
export const REWATCH_COUNT_CAP = 5;
