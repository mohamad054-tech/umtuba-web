import { clamp01, clampPercent } from "./signals";
import {
  RECOMMENDATION_MODEL_VERSION,
  type UserInterestProfile,
  type WatchSignalInput,
} from "./types";

export function emptyUserInterestProfile(
  userId: string
): UserInterestProfile {
  return {
    userId,
    tagWeights: {},
    creatorAffinity: {},
    signalCounts: {},
    avgWatchPercent: 0,
    completionRate: 0,
    skipRate: 0,
    positiveEngagementRate: 0,
    totalSignals: 0,
    freshnessScore: 0,
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    mlFeatures: {},
    lastComputedAt: null,
  };
}

function isPositiveEngagement(signal: WatchSignalInput): boolean {
  return (
    signal.liked ||
    signal.saved ||
    signal.shared ||
    signal.commented ||
    signal.followAfterWatch
  );
}

/**
 * Pure incremental interest-profile update from a batch of signals.
 * Mirrors SQL refresh_user_interest_profile semantics for app-side tests.
 */
export function buildUserInterestProfile(input: {
  userId: string;
  signals: Array<
    WatchSignalInput & {
      creatorId?: string | null;
      skippedEarly?: boolean;
    }
  >;
  existing?: UserInterestProfile | null;
  nowIso?: string;
}): UserInterestProfile {
  const base = input.existing ?? emptyUserInterestProfile(input.userId);
  if (input.signals.length === 0) {
    return base;
  }

  const affinityAcc = new Map<string, { sum: number; n: number }>();
  let watchSum = 0;
  let completed = 0;
  let skipped = 0;
  let positive = 0;
  const counts: Record<string, number> = {
    total: input.signals.length,
    completed: 0,
    skipped_early: 0,
    liked: 0,
    saved: 0,
    shared: 0,
    commented: 0,
    follow_after_watch: 0,
  };

  for (const raw of input.signals) {
    const watchPercent = clampPercent(raw.watchPercent);
    const skippedEarly = Boolean(raw.skippedEarly);
    watchSum += watchPercent;
    if (raw.completed) {
      completed += 1;
      counts.completed += 1;
    }
    if (skippedEarly) {
      skipped += 1;
      counts.skipped_early += 1;
    }
    if (raw.liked) counts.liked += 1;
    if (raw.saved) counts.saved += 1;
    if (raw.shared) counts.shared += 1;
    if (raw.commented) counts.commented += 1;
    if (raw.followAfterWatch) counts.follow_after_watch += 1;
    if (isPositiveEngagement(raw)) positive += 1;

    if (raw.creatorId) {
      const engagement = isPositiveEngagement(raw) ? 1 : 0;
      const affinity =
        (watchPercent / 100) * 0.4 +
        (raw.completed ? 1 : 0) * 0.2 +
        engagement * 0.4 -
        (skippedEarly ? 1 : 0) * 0.3;
      const prev = affinityAcc.get(raw.creatorId) ?? { sum: 0, n: 0 };
      affinityAcc.set(raw.creatorId, {
        sum: prev.sum + affinity,
        n: prev.n + 1,
      });
    }
  }

  const n = input.signals.length;
  const creatorAffinity: Record<string, number> = {
    ...base.creatorAffinity,
  };
  for (const [creatorId, acc] of affinityAcc) {
    creatorAffinity[creatorId] = Number(
      Math.max(-1, Math.min(1, acc.sum / acc.n)).toFixed(4)
    );
  }

  return {
    userId: input.userId,
    tagWeights: { ...base.tagWeights },
    creatorAffinity,
    signalCounts: counts,
    avgWatchPercent: Number((watchSum / n).toFixed(2)),
    completionRate: Number((completed / n).toFixed(4)),
    skipRate: Number((skipped / n).toFixed(4)),
    positiveEngagementRate: Number((positive / n).toFixed(4)),
    totalSignals: n,
    freshnessScore: clamp01(1),
    modelVersion: RECOMMENDATION_MODEL_VERSION,
    mlFeatures: {},
    lastComputedAt: input.nowIso ?? new Date().toISOString(),
  };
}

export function creatorAffinityScore(
  profile: UserInterestProfile | null | undefined,
  creatorId: string
): number {
  if (!profile) return 0;
  const raw = profile.creatorAffinity[creatorId];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  // Map [-1, 1] → [0, 1] for mixers that expect unit scores.
  return clamp01((raw + 1) / 2);
}

export function tagAffinityScore(
  profile: UserInterestProfile | null | undefined,
  tags: string[] | undefined
): number {
  if (!profile || !tags || tags.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const tag of tags) {
    const key = tag.trim().toLowerCase();
    if (!key) continue;
    const weight = profile.tagWeights[key];
    if (typeof weight === "number" && Number.isFinite(weight)) {
      sum += clamp01(weight);
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}
