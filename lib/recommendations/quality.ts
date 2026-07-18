import { clamp01, clampPercent } from "./signals";
import {
  RECOMMENDATION_MODEL_VERSION,
  type CreatorQualitySignals,
  type VideoQualitySignals,
} from "./types";

/**
 * Deterministic quality score — mirrors SQL compute_deterministic_quality_score.
 */
export function computeDeterministicQualityScore(input: {
  avgWatchPercent: number;
  completionRate: number;
  rewatchRate: number;
  likeRate: number;
  saveRate: number;
  shareRate: number;
  commentRate: number;
  followRate: number;
  skipRate: number;
}): number {
  const score =
    clamp01(clampPercent(input.avgWatchPercent) / 100) * 0.22 +
    clamp01(input.completionRate) * 0.18 +
    clamp01(input.rewatchRate) * 0.06 +
    clamp01(input.likeRate) * 0.12 +
    clamp01(input.saveRate) * 0.12 +
    clamp01(input.shareRate) * 0.08 +
    clamp01(input.commentRate) * 0.08 +
    clamp01(input.followRate) * 0.1 -
    clamp01(input.skipRate) * 0.16;

  return Number(score.toFixed(4));
}

export function emptyCreatorQuality(
  creatorId: string
): CreatorQualitySignals {
  return {
    creatorId,
    videoCount: 0,
    totalWatches: 0,
    avgWatchPercent: 0,
    completionRate: 0,
    rewatchRate: 0,
    likeRate: 0,
    saveRate: 0,
    shareRate: 0,
    commentRate: 0,
    followRate: 0,
    skipRate: 0,
    qualityScore: 0,
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    mlFeatures: {},
  };
}

export function emptyVideoQuality(
  postId: number,
  creatorId: string | null = null
): VideoQualitySignals {
  return {
    postId,
    creatorId,
    totalWatches: 0,
    avgWatchPercent: 0,
    avgWatchDurationMs: 0,
    completionRate: 0,
    rewatchRate: 0,
    likeRate: 0,
    saveRate: 0,
    shareRate: 0,
    commentRate: 0,
    followRate: 0,
    skipRate: 0,
    qualityScore: 0,
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    mlFeatures: {},
  };
}

export function buildCreatorQualityFromVideos(
  creatorId: string,
  videos: VideoQualitySignals[]
): CreatorQualitySignals {
  if (videos.length === 0) {
    return emptyCreatorQuality(creatorId);
  }

  const n = videos.length;
  const avg = (pick: (v: VideoQualitySignals) => number) =>
    videos.reduce((sum, v) => sum + pick(v), 0) / n;

  const rates = {
    avgWatchPercent: avg((v) => v.avgWatchPercent),
    completionRate: avg((v) => v.completionRate),
    rewatchRate: avg((v) => v.rewatchRate),
    likeRate: avg((v) => v.likeRate),
    saveRate: avg((v) => v.saveRate),
    shareRate: avg((v) => v.shareRate),
    commentRate: avg((v) => v.commentRate),
    followRate: avg((v) => v.followRate),
    skipRate: avg((v) => v.skipRate),
  };

  return {
    creatorId,
    videoCount: n,
    totalWatches: videos.reduce((sum, v) => sum + v.totalWatches, 0),
    avgWatchPercent: Number(rates.avgWatchPercent.toFixed(2)),
    completionRate: Number(rates.completionRate.toFixed(4)),
    rewatchRate: Number(rates.rewatchRate.toFixed(4)),
    likeRate: Number(rates.likeRate.toFixed(4)),
    saveRate: Number(rates.saveRate.toFixed(4)),
    shareRate: Number(rates.shareRate.toFixed(4)),
    commentRate: Number(rates.commentRate.toFixed(4)),
    followRate: Number(rates.followRate.toFixed(4)),
    skipRate: Number(rates.skipRate.toFixed(4)),
    qualityScore: computeDeterministicQualityScore(rates),
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    mlFeatures: {},
  };
}

export function normalizeCreatorQualityScore(
  quality: CreatorQualitySignals | null | undefined
): number {
  if (!quality) return 0.35; // mild prior for unknown creators
  return clamp01((quality.qualityScore + 0.16) / 1.16);
}

export function normalizeVideoQualityScore(
  quality: VideoQualitySignals | null | undefined
): number {
  if (!quality) return 0.35;
  return clamp01((quality.qualityScore + 0.16) / 1.16);
}
