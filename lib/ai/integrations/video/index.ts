/**
 * Video Personalization & Recommendation Integration V1 — public surface.
 * Server-side only. Disabled by default. Does not alter production feed order.
 */

export {
  VIDEO_RECOMMENDATION_SIGNAL_EVENTS,
  VIDEO_PERSONALIZATION_SURFACES,
  VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS,
} from "./types";
export type {
  VideoRecommendationSignalEvent,
  VideoPersonalizationSurface,
  VideoRecommendationSignalClientInput,
  VideoRecommendationSignalAccepted,
  VideoContentMetadata,
  VideoCandidateInput,
  VideoRankRequest,
  VideoRankResult,
} from "./types";

export { isVideoPersonalizationIntegrationEnabled } from "./featureFlag";
export {
  validateVideoRecommendationSignalInput,
  deriveVideoSignalStrength,
  mapVideoEventToFoundationSignalType,
} from "./signalContract";
export { toVideoContentProfile } from "./contentProfileAdapter";
export { toVideoRecommendationCandidates } from "./candidateAdapter";
export {
  rankVideoCandidatesForPersonalization,
  createIsolatedVideoRankStores,
} from "./rankingBoundary";
export {
  ingestVideoRecommendationSignal,
  type VideoSignalIngestResult,
} from "./ingest";
