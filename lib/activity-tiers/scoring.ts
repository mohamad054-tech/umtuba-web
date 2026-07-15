import { isSelfInteraction } from "../rewards/umPointsConfig";
import { ACTIVITY_SCORE_CAPS, ACTIVITY_SCORE_WEIGHTS } from "./tiers";
import type {
  ActivityScoreAwardRequest,
  ActivityScoreAwardResult,
  ActivityScoreCategory,
} from "./types";

const PRIMARY_CATEGORIES: ReadonlySet<ActivityScoreCategory> = new Set([
  "quality_posts",
  "helpful_comments",
  "engagement_received",
  "live_participation",
  "community_contributions",
  "verified_referrals",
  "consistency_tenure",
]);

export function isPrimaryActivityCategory(
  category: ActivityScoreCategory
): boolean {
  return PRIMARY_CATEGORIES.has(category);
}

export function suggestedPointsForCategory(
  category: ActivityScoreCategory,
  units: number = 1
): number {
  const weight = ACTIVITY_SCORE_WEIGHTS[category] ?? 0;
  const safeUnits = Number.isFinite(units) ? Math.max(0, units) : 0;
  return Math.floor(weight * safeUnits);
}

/**
 * Apply daily + category caps and screen-time gate.
 * Pure helper — mirrors server RPC anti-abuse rules.
 */
export function evaluateActivityScoreAward(input: {
  request: ActivityScoreAwardRequest;
  earnedTodayTotal: number;
  earnedTodayInCategory: number;
  /** Primary (non-screen) points already earned today. */
  primaryEarnedToday: number;
}): ActivityScoreAwardResult {
  const { request } = input;
  const points = Math.floor(request.points);

  if (!Number.isFinite(points) || points <= 0) {
    return { awarded: 0, blocked: true, reason: "invalid" };
  }

  if (
    !request.systemGrant &&
    isSelfInteraction(request.actorUserId, request.recipientUserId)
  ) {
    return { awarded: 0, blocked: true, reason: "self_interaction" };
  }

  if (request.category === "screen_time_secondary") {
    if (
      input.primaryEarnedToday <
      ACTIVITY_SCORE_CAPS.screenTimeRequiresPrimaryPoints
    ) {
      return { awarded: 0, blocked: true, reason: "screen_time_gate" };
    }

    const screenCap = Math.min(
      ACTIVITY_SCORE_CAPS.screenTimeDailyMax,
      ACTIVITY_SCORE_CAPS.perCategoryDaily.screen_time_secondary ??
        ACTIVITY_SCORE_CAPS.screenTimeDailyMax
    );
    const remainingScreen = Math.max(
      0,
      screenCap - input.earnedTodayInCategory
    );
    if (remainingScreen <= 0) {
      return { awarded: 0, blocked: true, reason: "category_cap" };
    }

    const dailyRemaining = Math.max(
      0,
      ACTIVITY_SCORE_CAPS.dailyTotal - input.earnedTodayTotal
    );
    const awarded = Math.min(points, remainingScreen, dailyRemaining);
    if (awarded <= 0) {
      return {
        awarded: 0,
        blocked: true,
        reason: dailyRemaining <= 0 ? "daily_cap" : "category_cap",
      };
    }
    return { awarded, blocked: false };
  }

  const categoryCap =
    ACTIVITY_SCORE_CAPS.perCategoryDaily[request.category] ??
    ACTIVITY_SCORE_CAPS.dailyTotal;
  const remainingCategory = Math.max(
    0,
    categoryCap - input.earnedTodayInCategory
  );
  if (remainingCategory <= 0) {
    return { awarded: 0, blocked: true, reason: "category_cap" };
  }

  const dailyRemaining = Math.max(
    0,
    ACTIVITY_SCORE_CAPS.dailyTotal - input.earnedTodayTotal
  );
  if (dailyRemaining <= 0) {
    return { awarded: 0, blocked: true, reason: "daily_cap" };
  }

  const awarded = Math.min(points, remainingCategory, dailyRemaining);
  if (awarded <= 0) {
    return { awarded: 0, blocked: true, reason: "invalid" };
  }

  return { awarded, blocked: false };
}

/**
 * Build a reversal ledger amount that undoes a prior award (fraud clawback).
 * Never drops total score below zero at the application layer.
 */
export function computeReversalDelta(
  originalAwarded: number,
  currentScore: number
): number {
  const original = Math.floor(originalAwarded);
  if (!Number.isFinite(original) || original <= 0) {
    return 0;
  }
  const score = Number.isFinite(currentScore) ? Math.max(0, currentScore) : 0;
  return -Math.min(original, score);
}
