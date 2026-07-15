/**
 * Application-layer activity tier / badge model.
 * Separate from the wallet — UM Points conversion must never change rank.
 */

export type ActivityTierId =
  | "spark"
  | "rising"
  | "creator"
  | "pathfinder"
  | "luminary"
  | "icon";

/** Meaningful activity categories used for progression. */
export type ActivityScoreCategory =
  | "quality_posts"
  | "helpful_comments"
  | "engagement_received"
  | "live_participation"
  | "community_contributions"
  | "verified_referrals"
  | "consistency_tenure"
  /** Capped secondary signal — only when paired with real activity. */
  | "screen_time_secondary";

export type ActivityTierAccent =
  | "slate"
  | "sky"
  | "emerald"
  | "amber"
  | "violet"
  | "rose";

export type ActivityTierDefinition = {
  id: ActivityTierId;
  /** Sort / progress order (0 = entry). */
  rank: number;
  /** Minimum authentic activity score required. */
  threshold: number;
  /** Internal config name. */
  name: string;
  /** Short UI label (header / chip). */
  displayLabel: string;
  /** Longer profile-facing title. */
  displayTitle: string;
  /** Compact icon glyph (not emoji-heavy UI — simple mark). */
  icon: string;
  accent: ActivityTierAccent;
  description: string;
};

export type ActivityScoreWeights = Record<ActivityScoreCategory, number>;

export type ActivityScoreCaps = {
  dailyTotal: number;
  perCategoryDaily: Partial<Record<ActivityScoreCategory, number>>;
  /** Absolute max screen-time secondary points per day. */
  screenTimeDailyMax: number;
  /**
   * Screen-time awards require at least this many primary (non-screen) points
   * earned the same day — passive watch alone never progresses tiers.
   */
  screenTimeRequiresPrimaryPoints: number;
};

export type ActivityProgressStatus =
  | "loading"
  | "signed_out"
  | "ready"
  | "error";

export type ActivityTierProgress = {
  score: number;
  tierId: ActivityTierId;
  tier: ActivityTierDefinition;
  nextTier: ActivityTierDefinition | null;
  /** 0–100 progress from current tier threshold toward next (100 if maxed). */
  progressPercent: number;
  /** Points still needed for next tier (0 if maxed). */
  pointsToNext: number;
  updatedAt: string | null;
};

export type ActivityScoreAwardRequest = {
  category: ActivityScoreCategory;
  points: number;
  reason: string;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
  /** When true, ignore self-interaction checks (system grants). */
  systemGrant?: boolean;
  actorUserId?: string | null;
  recipientUserId: string;
};

export type ActivityScoreAwardResult = {
  awarded: number;
  blocked: boolean;
  reason?:
    | "daily_cap"
    | "category_cap"
    | "screen_time_gate"
    | "self_interaction"
    | "invalid"
    | "duplicate";
  score?: number;
  tierId?: ActivityTierId;
};
