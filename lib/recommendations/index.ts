export {
  RECOMMENDATION_MODEL_VERSION,
  type CreatorQualitySignals,
  type DiversityPolicy,
  type RecommendationCandidate,
  type RecommendationScoreContext,
  type RecommendationSurface,
  type ScoreBreakdown,
  type ScoredCandidate,
  type UserInterestProfile,
  type VideoQualitySignals,
  type WatchSignalInput,
  type WatchSignalRecord,
} from "./types";

export {
  DEFAULT_DIVERSITY_POLICY,
  EARLY_SKIP_DURATION_MS,
  EARLY_SKIP_WATCH_PERCENT,
  ENGAGEMENT_COUNTER_WEIGHTS,
  RECENCY_HALF_LIFE_DAYS,
  RECOMMENDATION_SCORE_WEIGHTS,
  REWATCH_COUNT_CAP,
  WATCH_SIGNAL_WEIGHTS,
} from "./weights";

export {
  clamp01,
  clampPercent,
  deriveSkippedEarly,
  isValidWatchSessionId,
  normalizeWatchSignal,
  scoreWatchSignalQuality,
} from "./signals";

export {
  buildUserInterestProfile,
  creatorAffinityScore,
  emptyUserInterestProfile,
  tagAffinityScore,
} from "./interestProfile";

export {
  buildCreatorQualityFromVideos,
  computeDeterministicQualityScore,
  emptyCreatorQuality,
  emptyVideoQuality,
  normalizeCreatorQualityScore,
  normalizeVideoQualityScore,
} from "./quality";

export {
  scoreRecommendationCandidate,
  scoreRecommendationCandidates,
} from "./scoring";

export {
  applyDiversityAndExploration,
  assertCreatorDiversity,
  explorationSlotCount,
} from "./diversity";

export {
  assembleRecommendationPage,
  type AssembledRecommendationPage,
} from "./assemble";
