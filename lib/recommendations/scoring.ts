import {
  creatorAffinityScore,
  tagAffinityScore,
} from "./interestProfile";
import {
  normalizeCreatorQualityScore,
  normalizeVideoQualityScore,
} from "./quality";
import { clamp01, scoreWatchSignalQuality } from "./signals";
import {
  ENGAGEMENT_COUNTER_WEIGHTS,
  RECENCY_HALF_LIFE_DAYS,
  RECOMMENDATION_SCORE_WEIGHTS,
} from "./weights";
import type {
  RecommendationCandidate,
  RecommendationScoreContext,
  ScoreBreakdown,
  ScoredCandidate,
} from "./types";

function engagementFromCounters(
  candidate: RecommendationCandidate
): number {
  const views = Math.max(1, candidate.views ?? 0);
  const likeRate = clamp01((candidate.likes ?? 0) / views);
  const saveRate = clamp01((candidate.saves ?? 0) / views);
  const shareRate = clamp01((candidate.shares ?? 0) / views);
  const commentRate = clamp01((candidate.comments ?? 0) / views);
  const viewPrior = clamp01(Math.log10(views + 1) / 5);

  return clamp01(
    likeRate * ENGAGEMENT_COUNTER_WEIGHTS.likeRate +
      saveRate * ENGAGEMENT_COUNTER_WEIGHTS.saveRate +
      shareRate * ENGAGEMENT_COUNTER_WEIGHTS.shareRate +
      commentRate * ENGAGEMENT_COUNTER_WEIGHTS.commentRate +
      viewPrior * ENGAGEMENT_COUNTER_WEIGHTS.viewPrior
  );
}

function recencyScore(createdAt: string, nowMs: number): number {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return 0.5;
  const ageDays = Math.max(0, (nowMs - created) / (1000 * 60 * 60 * 24));
  const halfLife = RECENCY_HALF_LIFE_DAYS;
  return clamp01(Math.pow(0.5, ageDays / halfLife));
}

/**
 * Score one candidate with deterministic weighted mix.
 * Does not mutate feed APIs — pure function for ranking assemblers.
 */
export function scoreRecommendationCandidate(
  candidate: RecommendationCandidate,
  context: RecommendationScoreContext
): ScoredCandidate {
  const nowMs = context.nowMs ?? Date.now();
  const videoQuality = context.videoQualityByPostId.get(candidate.postId);
  const creatorQuality = context.creatorQualityById.get(candidate.creatorId);
  const isExploration =
    Boolean(context.viewerId) &&
    !context.seenCreatorIds.has(candidate.creatorId);

  const watchQuality = context.sessionSignal
    ? scoreWatchSignalQuality(context.sessionSignal)
    : normalizeVideoQualityScore(videoQuality);

  const engagement = engagementFromCounters(candidate);
  const creatorQ = normalizeCreatorQualityScore(creatorQuality);
  const videoQ = normalizeVideoQualityScore(videoQuality);

  const interest =
    clamp01(
      creatorAffinityScore(context.interest, candidate.creatorId) * 0.7 +
        tagAffinityScore(context.interest, candidate.tags) * 0.3
    ) || 0.5;

  const recency = recencyScore(candidate.createdAt, nowMs);
  const exploration = isExploration ? 1 : 0;

  const skipRate =
    context.sessionSignal?.skippedEarly
      ? 1
      : videoQuality?.skipRate ?? context.interest?.skipRate ?? 0;
  const skipPenalty = clamp01(skipRate);

  const total = clamp01(
    watchQuality * RECOMMENDATION_SCORE_WEIGHTS.watchQuality +
      engagement * RECOMMENDATION_SCORE_WEIGHTS.engagement +
      creatorQ * RECOMMENDATION_SCORE_WEIGHTS.creatorQuality +
      videoQ * RECOMMENDATION_SCORE_WEIGHTS.videoQuality +
      interest * RECOMMENDATION_SCORE_WEIGHTS.interestAffinity +
      recency * RECOMMENDATION_SCORE_WEIGHTS.recency +
      exploration * RECOMMENDATION_SCORE_WEIGHTS.exploration -
      skipPenalty * RECOMMENDATION_SCORE_WEIGHTS.skipPenalty
  );

  const breakdown: ScoreBreakdown = {
    watchQuality: Number(watchQuality.toFixed(4)),
    engagement: Number(engagement.toFixed(4)),
    creatorQuality: Number(creatorQ.toFixed(4)),
    videoQuality: Number(videoQ.toFixed(4)),
    interestAffinity: Number(interest.toFixed(4)),
    recency: Number(recency.toFixed(4)),
    exploration: Number(exploration.toFixed(4)),
    skipPenalty: Number(skipPenalty.toFixed(4)),
    total: Number(total.toFixed(4)),
  };

  return {
    postId: candidate.postId,
    creatorId: candidate.creatorId,
    score: breakdown.total,
    breakdown,
    isExploration,
  };
}

export function scoreRecommendationCandidates(
  candidates: RecommendationCandidate[],
  context: RecommendationScoreContext
): ScoredCandidate[] {
  return candidates
    .map((c) => scoreRecommendationCandidate(c, context))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.postId - a.postId;
    });
}
