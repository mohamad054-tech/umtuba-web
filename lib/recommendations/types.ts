/**
 * Discover & Watch Recommendation Infrastructure V1 — shared types.
 * Deterministic only. No AI / ML inference in this layer.
 * mlFeatures / modelVersion reserved for future model swaps.
 */

export const RECOMMENDATION_MODEL_VERSION = "deterministic-v1" as const;

export type RecommendationSurface = "discover" | "watch";

/** Raw watch + engagement signals recorded per viewing session. */
export type WatchSignalInput = {
  postId: number;
  sessionId: string;
  surface: RecommendationSurface;
  watchDurationMs: number;
  watchPercent: number;
  completed: boolean;
  rewatchCount: number;
  liked: boolean;
  saved: boolean;
  shared: boolean;
  commented: boolean;
  followAfterWatch: boolean;
  /** When omitted, derived from duration/percent thresholds. */
  skippedEarly?: boolean | null;
  viewerKey?: string | null;
};

export type WatchSignalRecord = WatchSignalInput & {
  id?: number;
  creatorId?: string | null;
  userId?: string | null;
  skippedEarly: boolean;
  modelVersion: typeof RECOMMENDATION_MODEL_VERSION;
  mlFeatures: Record<string, unknown>;
};

export type UserInterestProfile = {
  userId: string;
  tagWeights: Record<string, number>;
  creatorAffinity: Record<string, number>;
  signalCounts: Record<string, number>;
  avgWatchPercent: number;
  completionRate: number;
  skipRate: number;
  positiveEngagementRate: number;
  totalSignals: number;
  freshnessScore: number;
  modelVersion: string;
  mlFeatures: Record<string, unknown>;
  lastComputedAt: string | null;
};

export type CreatorQualitySignals = {
  creatorId: string;
  videoCount: number;
  totalWatches: number;
  avgWatchPercent: number;
  completionRate: number;
  rewatchRate: number;
  likeRate: number;
  saveRate: number;
  shareRate: number;
  commentRate: number;
  followRate: number;
  skipRate: number;
  qualityScore: number;
  modelVersion: string;
  mlFeatures: Record<string, unknown>;
};

export type VideoQualitySignals = {
  postId: number;
  creatorId: string | null;
  totalWatches: number;
  avgWatchPercent: number;
  avgWatchDurationMs: number;
  completionRate: number;
  rewatchRate: number;
  likeRate: number;
  saveRate: number;
  shareRate: number;
  commentRate: number;
  followRate: number;
  skipRate: number;
  qualityScore: number;
  modelVersion: string;
  mlFeatures: Record<string, unknown>;
};

/** Candidate video for scoring (feed DTO subset — no ranking side effects). */
export type RecommendationCandidate = {
  postId: number;
  creatorId: string;
  createdAt: string;
  /** Optional caption tags / hashtags for affinity. */
  tags?: string[];
  likes?: number;
  saves?: number;
  shares?: number;
  comments?: number;
  views?: number;
  mediaDurationMs?: number | null;
};

export type ScoreBreakdown = {
  watchQuality: number;
  engagement: number;
  creatorQuality: number;
  videoQuality: number;
  interestAffinity: number;
  recency: number;
  exploration: number;
  skipPenalty: number;
  total: number;
};

export type ScoredCandidate = {
  postId: number;
  creatorId: string;
  score: number;
  breakdown: ScoreBreakdown;
  isExploration: boolean;
};

export type DiversityPolicy = {
  /** Max videos from the same creator in one page. */
  maxPerCreator: number;
  /** Fraction of page reserved for creators the viewer has never watched. */
  explorationSlotFraction: number;
  /** Minimum exploration slots (when page size allows). */
  minExplorationSlots: number;
};

export type RecommendationScoreContext = {
  viewerId: string | null;
  interest: UserInterestProfile | null;
  /** Creators the viewer has already watched (for exploration). */
  seenCreatorIds: ReadonlySet<string>;
  videoQualityByPostId: ReadonlyMap<number, VideoQualitySignals>;
  creatorQualityById: ReadonlyMap<string, CreatorQualitySignals>;
  /** Optional session-level signal for the candidate being scored. */
  sessionSignal?: WatchSignalInput | null;
  nowMs?: number;
};
