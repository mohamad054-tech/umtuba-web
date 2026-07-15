import {
  ACTIVITY_SCORE_CAPS,
  ACTIVITY_TIERS,
  DEFAULT_ACTIVITY_TIER_ID,
  getActivityTierById,
} from "./tiers";
import type {
  ActivityTierDefinition,
  ActivityTierId,
  ActivityTierProgress,
} from "./types";

/** Resolve tier from authentic activity score (thresholds are inclusive). */
export function resolveTierFromScore(score: number): ActivityTierDefinition {
  const safe = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  let current = ACTIVITY_TIERS[0]!;

  for (const tier of ACTIVITY_TIERS) {
    if (safe >= tier.threshold) {
      current = tier;
    } else {
      break;
    }
  }

  return current;
}

export function getNextActivityTier(
  tierId: ActivityTierId
): ActivityTierDefinition | null {
  const current = getActivityTierById(tierId);
  return ACTIVITY_TIERS.find((tier) => tier.rank === current.rank + 1) ?? null;
}

/**
 * Progress within the current band toward the next tier threshold.
 * Uses score relative to current.threshold → next.threshold.
 */
export function computeTierProgressPercent(
  score: number,
  current: ActivityTierDefinition,
  next: ActivityTierDefinition | null
): number {
  if (!next) {
    return 100;
  }

  const safe = Number.isFinite(score) ? Math.max(0, score) : 0;
  const span = next.threshold - current.threshold;
  if (span <= 0) {
    return 100;
  }

  const progressed = safe - current.threshold;
  return Math.max(0, Math.min(100, Math.round((progressed / span) * 100)));
}

export function buildActivityTierProgress(input: {
  score: number;
  tierId?: ActivityTierId | null;
  updatedAt?: string | null;
}): ActivityTierProgress {
  const score = Number.isFinite(input.score)
    ? Math.max(0, Math.floor(input.score))
    : 0;
  const resolved = resolveTierFromScore(score);
  const tier =
    input.tierId && input.tierId === resolved.id
      ? getActivityTierById(input.tierId)
      : resolved;
  const nextTier = getNextActivityTier(tier.id);
  const progressPercent = computeTierProgressPercent(score, tier, nextTier);
  const pointsToNext = nextTier
    ? Math.max(0, nextTier.threshold - score)
    : 0;

  return {
    score,
    tierId: tier.id,
    tier,
    nextTier,
    progressPercent,
    pointsToNext,
    updatedAt: input.updatedAt ?? null,
  };
}

export function emptyActivityTierProgress(): ActivityTierProgress {
  return buildActivityTierProgress({
    score: 0,
    tierId: DEFAULT_ACTIVITY_TIER_ID,
    updatedAt: null,
  });
}

/** Accent classes for badge chrome — keep in sync with ActivityTierAccent. */
export function activityTierAccentClasses(accent: ActivityTierDefinition["accent"]): {
  border: string;
  bg: string;
  text: string;
} {
  switch (accent) {
    case "sky":
      return {
        border: "border-sky-400/35",
        bg: "bg-sky-500/15",
        text: "text-sky-100",
      };
    case "emerald":
      return {
        border: "border-emerald-400/35",
        bg: "bg-emerald-500/15",
        text: "text-emerald-100",
      };
    case "amber":
      return {
        border: "border-amber-400/35",
        bg: "bg-amber-500/15",
        text: "text-amber-100",
      };
    case "violet":
      return {
        border: "border-violet-400/35",
        bg: "bg-violet-500/15",
        text: "text-violet-100",
      };
    case "rose":
      return {
        border: "border-rose-400/35",
        bg: "bg-rose-500/15",
        text: "text-rose-100",
      };
    case "slate":
    default:
      return {
        border: "border-white/15",
        bg: "bg-white/5",
        text: "text-white/70",
      };
  }
}

export { ACTIVITY_SCORE_CAPS };
