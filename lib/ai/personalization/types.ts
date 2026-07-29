/**
 * AI Personalization & Recommendation Foundation V1 — shared contracts.
 * Domain-agnostic. No DB. No UI. Not video-specific.
 */

export const AI_PRODUCT_SURFACES = [
  "video_feed",
  "discover",
  "learning",
  "commerce",
  "creator",
  "ads",
  "world",
  "search",
  "platform",
] as const;
export type AiProductSurface = (typeof AI_PRODUCT_SURFACES)[number];

export const AI_RECOMMENDATION_SIGNAL_TYPES = [
  "impression",
  "view",
  "completion",
  "replay",
  "like",
  "comment",
  "save",
  "share",
  "follow",
  "hide",
  "not_interested",
  "report",
] as const;
export type AiRecommendationSignalType =
  (typeof AI_RECOMMENDATION_SIGNAL_TYPES)[number];

export const AI_CANDIDATE_SOURCE_IDS = [
  "following",
  "interests",
  "trending",
  "new",
  "similar",
  "sponsored",
] as const;
export type AiCandidateSourceId = (typeof AI_CANDIDATE_SOURCE_IDS)[number];

export type AiInterestTopic = {
  topicId: string;
  /** Relative interest weight in [0, 1]. */
  weight: number;
};

export type AiUserInterestProfile = {
  userId: string;
  surfaces: AiProductSurface[];
  interests: AiInterestTopic[];
  negativeInterests: AiInterestTopic[];
  updatedAt: string;
};

export type AiContentProfile = {
  contentId: string;
  /** Generic content type label (lesson, product, post, …) — not domain-locked. */
  contentType: string;
  topicIds: string[];
  creatorId: string | null;
  /** Contract scores in [0, 1]. */
  freshnessScore: number;
  qualityScore: number;
  metadata: Record<string, string | number | boolean | null>;
  updatedAt: string;
};

export type AiRecommendationSignal = {
  signalId: string;
  userId: string;
  contentId: string;
  signalType: AiRecommendationSignalType;
  /** Signal strength in [0, 1]. */
  strength: number;
  occurredAt: string;
  surface: AiProductSurface;
};

export type AiRecommendationCandidate = {
  contentId: string;
  sourceId: AiCandidateSourceId;
  /** Source-provided base score in [0, 1]. */
  baseScore: number;
};

export type AiRecommendationScore = {
  contentId: string;
  sourceId: AiCandidateSourceId;
  baseScore: number;
  interestScore: number;
  freshnessScore: number;
  qualityScore: number;
  diversityPenalty: number;
  finalScore: number;
  reasons: string[];
};

export type AiRankedRecommendation = {
  contentId: string;
  sourceId: AiCandidateSourceId;
  score: AiRecommendationScore;
  rank: number;
};

export type AiPersonalizationContext = {
  userId: string;
  surface: AiProductSurface;
  limit: number;
  nowIso?: string;
};

/**
 * Reserved future hooks — noop in V1.
 */
export type AiPersonalizationExtensionHooks = {
  embedContent?: (profile: AiContentProfile) => number[] | null;
  embedUser?: (profile: AiUserInterestProfile) => number[] | null;
  vectorSearch?: (
    queryEmbedding: number[],
    limit: number
  ) => AiRecommendationCandidate[] | null;
  semanticSimilarity?: (
    a: AiContentProfile,
    b: AiContentProfile
  ) => number | null;
  recommendationModelScore?: (
    user: AiUserInterestProfile,
    content: AiContentProfile
  ) => number | null;
  reinforcementUpdate?: (signal: AiRecommendationSignal) => void;
};

export function createNoopPersonalizationExtensionHooks(): AiPersonalizationExtensionHooks {
  return {
    embedContent: () => null,
    embedUser: () => null,
    vectorSearch: () => null,
    semanticSimilarity: () => null,
    recommendationModelScore: () => null,
    reinforcementUpdate: () => undefined,
  };
}
