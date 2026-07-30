/**
 * Video Personalization Integration V1 — contracts.
 * Server-side only. Disabled by default. Does not change production feed order.
 */

import type { AiCandidateSourceId, AiProductSurface } from "../../personalization/types";

/** Video-domain signal allowlist (maps into Shared Personalization Foundation). */
export const VIDEO_RECOMMENDATION_SIGNAL_EVENTS = [
  "impression",
  "view_start",
  "watch_progress",
  "completion",
  "replay",
  "like",
  "comment",
  "save",
  "share",
  "follow_creator",
  "skip",
  "hide",
  "not_interested",
  "report",
] as const;

export type VideoRecommendationSignalEvent =
  (typeof VIDEO_RECOMMENDATION_SIGNAL_EVENTS)[number];

export const VIDEO_PERSONALIZATION_SURFACES = [
  "video_feed",
  "discover",
] as const satisfies readonly AiProductSurface[];

export type VideoPersonalizationSurface =
  (typeof VIDEO_PERSONALIZATION_SURFACES)[number];

/**
 * Client-safe input shape. Must NOT include userId, weights, ranking scores,
 * provider/model fields, or interest profile mutations.
 */
export type VideoRecommendationSignalClientInput = {
  event: string;
  contentId: string;
  occurredAt?: string;
  /** Watch progress 0–100 when event is watch_progress / completion. */
  progressPercent?: number | null;
  /** Observed watch duration in ms. */
  watchDurationMs?: number | null;
  /** Media duration in ms when known. */
  mediaDurationMs?: number | null;
  surface?: string | null;
  sessionId?: string | null;
};

/** Forbidden keys — rejected if present on raw payloads. */
export const VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS = [
  "userId",
  "user_id",
  "weight",
  "weights",
  "strength",
  "score",
  "finalScore",
  "interestScore",
  "providerId",
  "modelId",
  "promptVersion",
  "negativeInterest",
  "topicWeights",
  "rankingOverride",
] as const;

export type VideoRecommendationSignalAccepted = {
  event: VideoRecommendationSignalEvent;
  contentId: string;
  /** Server-resolved only. */
  userId: string;
  occurredAt: string;
  progressPercent: number | null;
  watchDurationMs: number | null;
  mediaDurationMs: number | null;
  surface: VideoPersonalizationSurface;
  sessionId: string | null;
  /** Bounded strength derived server-side (never client-supplied). */
  strength: number;
};

/**
 * Metadata actually available from video/post rows — callers pass only known fields.
 * Do not invent language/topics if absent.
 */
export type VideoContentMetadata = {
  contentId: string;
  creatorId: string | null;
  createdAt: string | null;
  mediaDurationMs: number | null;
  mediaStatus: string | null;
  /** Hashtags/tags if already extracted by caller; otherwise omit/empty. */
  topicIds?: string[] | null;
  language?: string | null;
  visibility?: string | null;
};

export type VideoCandidateInput = {
  contentId: string;
  /** Optional caller hint in [0,1]; ignored when integration disabled. */
  baseScore?: number | null;
  sourceId?: AiCandidateSourceId | null;
};

export type VideoRankRequest = {
  /** Server-resolved user id; required when ranking is enabled. */
  userId: string | null;
  surface: VideoPersonalizationSurface;
  candidates: VideoCandidateInput[];
  /** Preserve this order when disabled / fallback. */
  originalOrder: string[];
  limit?: number;
};

export type VideoRankResult = {
  contentIds: string[];
  mode: "passthrough" | "personalized";
  reason: string;
};
