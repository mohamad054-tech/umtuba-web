import type {
  ActivityScoreCaps,
  ActivityScoreWeights,
  ActivityTierDefinition,
  ActivityTierId,
} from "./types";

/**
 * Configurable progressive tiers. Change thresholds / labels here (or via
 * future DB overrides) without rewriting profile or nav UI.
 */
export const ACTIVITY_TIERS: readonly ActivityTierDefinition[] = [
  {
    id: "spark",
    rank: 0,
    threshold: 0,
    name: "spark",
    displayLabel: "Spark",
    displayTitle: "Spark",
    icon: "◇",
    accent: "slate",
    description: "Getting started on UMTUBA.",
  },
  {
    id: "rising",
    rank: 1,
    threshold: 250,
    name: "rising",
    displayLabel: "Rising",
    displayTitle: "Rising Creator",
    icon: "△",
    accent: "sky",
    description: "Building authentic posting and community habits.",
  },
  {
    id: "creator",
    rank: 2,
    threshold: 1000,
    name: "creator",
    displayLabel: "Creator",
    displayTitle: "Creator",
    icon: "✦",
    accent: "emerald",
    description: "Consistent quality posts and helpful engagement.",
  },
  {
    id: "pathfinder",
    rank: 3,
    threshold: 3500,
    name: "pathfinder",
    displayLabel: "Pathfinder",
    displayTitle: "Pathfinder",
    icon: "◈",
    accent: "amber",
    description: "Live participation and community contributions.",
  },
  {
    id: "luminary",
    rank: 4,
    threshold: 10_000,
    name: "luminary",
    displayLabel: "Luminary",
    displayTitle: "Luminary",
    icon: "☀",
    accent: "violet",
    description: "Trusted presence with verified referrals and tenure.",
  },
  {
    id: "icon",
    rank: 5,
    threshold: 25_000,
    name: "icon",
    displayLabel: "Icon",
    displayTitle: "Icon",
    icon: "★",
    accent: "rose",
    description: "Top-tier authentic activity across UMTUBA.",
  },
] as const;

export const DEFAULT_ACTIVITY_TIER_ID: ActivityTierId = "spark";

/** Relative weights for primary scoring categories (points per event unit). */
export const ACTIVITY_SCORE_WEIGHTS: ActivityScoreWeights = {
  quality_posts: 40,
  helpful_comments: 8,
  engagement_received: 3,
  live_participation: 25,
  community_contributions: 20,
  verified_referrals: 75,
  consistency_tenure: 15,
  /** Intentionally tiny — capped and gated by real activity. */
  screen_time_secondary: 1,
};

export const ACTIVITY_SCORE_CAPS: ActivityScoreCaps = {
  dailyTotal: 400,
  perCategoryDaily: {
    quality_posts: 120,
    helpful_comments: 80,
    engagement_received: 100,
    live_participation: 100,
    community_contributions: 80,
    verified_referrals: 150,
    consistency_tenure: 30,
    screen_time_secondary: 20,
  },
  screenTimeDailyMax: 20,
  screenTimeRequiresPrimaryPoints: 10,
};

const TIER_BY_ID = Object.fromEntries(
  ACTIVITY_TIERS.map((tier) => [tier.id, tier])
) as Record<ActivityTierId, ActivityTierDefinition>;

export function getActivityTier(): readonly ActivityTierDefinition[] {
  return ACTIVITY_TIERS;
}

export function getActivityTierById(
  id: ActivityTierId
): ActivityTierDefinition {
  return TIER_BY_ID[id] ?? TIER_BY_ID[DEFAULT_ACTIVITY_TIER_ID];
}

export function isActivityTierId(value: unknown): value is ActivityTierId {
  return typeof value === "string" && value in TIER_BY_ID;
}
