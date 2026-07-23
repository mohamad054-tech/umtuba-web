/**
 * UM Learning OS — Learner Result Delivery V1.
 *
 * Learner-safe aggregate results only. Calls get_my_learning_attempt_result.
 * Never SELECTs result tables, never calls score_learning_attempt, never
 * exposes per-question correctness, keys, or scored_by.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LEARNER_RESULT_RPCS = {
  getMyResult: "get_my_learning_attempt_result",
} as const;

/** Internal helpers — learners must never EXECUTE these. */
export const LEARNING_LEARNER_RESULT_INTERNAL_HELPERS = {
  applyAttemptResult: "learning_scoring_apply_attempt_result",
  tryAutoScore: "learning_scoring_try_auto_score_submitted_attempt",
} as const;

export const LEARNING_LEARNER_RESULT_VISIBILITIES = [
  "hidden",
  "pending_score",
  "available",
] as const;
export type LearningLearnerResultVisibility =
  (typeof LEARNING_LEARNER_RESULT_VISIBILITIES)[number];

/** Policies that can surface aggregate results in V1. */
export const LEARNING_LEARNER_RESULT_ACTIVE_POLICIES = [
  "immediately",
  "after_submit",
] as const;

/** Policies that remain fail-closed in V1. */
export const LEARNING_LEARNER_RESULT_FAIL_CLOSED_POLICIES = [
  "never",
  "after_close",
  "manual",
] as const;

export const LEARNING_LEARNER_RESULT_MESSAGES = {
  hidden: "Results are not available.",
  pending: "Submitted — your result is being prepared.",
  available: "Your result is ready.",
} as const;

export type LearningLearnerAggregateResult = {
  status: "scored";
  score_earned: number;
  score_max: number;
  percentage: number;
  passed: boolean | null;
  scored_at: string;
};

export type LearningLearnerAttemptResultView = {
  attempt_id: string;
  activity_id: string;
  attempt_status: "active" | "submitted" | "expired" | "cancelled";
  visibility: LearningLearnerResultVisibility;
  result: LearningLearnerAggregateResult | null;
  message: string;
};

export type LearningResultDeliveryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const SAFE_DENY_MESSAGE = "Unable to load result.";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolOrNull(value: unknown): boolean | null {
  if (value === null) return null;
  return typeof value === "boolean" ? value : null;
}

/** Safe percentage when score_max is 0 → 0. */
export function computeLearnerResultPercentage(
  scoreEarned: number,
  scoreMax: number
): number {
  if (!Number.isFinite(scoreEarned) || !Number.isFinite(scoreMax)) return 0;
  if (scoreMax === 0) return 0;
  return Math.round((scoreEarned / scoreMax) * 10000) / 100;
}

export function parseLearnerAttemptResultView(
  raw: unknown
): LearningLearnerAttemptResultView | null {
  const row = asRecord(raw);
  if (!row) return null;

  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const attempt_status = asString(row.attempt_status);
  const visibility = asString(row.visibility);
  const message = asString(row.message) ?? LEARNING_LEARNER_RESULT_MESSAGES.hidden;

  if (!attempt_id || !activity_id || !attempt_status || !visibility) return null;
  if (
    attempt_status !== "active" &&
    attempt_status !== "submitted" &&
    attempt_status !== "expired" &&
    attempt_status !== "cancelled"
  ) {
    return null;
  }
  if (
    visibility !== "hidden" &&
    visibility !== "pending_score" &&
    visibility !== "available"
  ) {
    return null;
  }

  let result: LearningLearnerAggregateResult | null = null;
  if (visibility === "available") {
    const r = asRecord(row.result);
    if (!r) return null;
    const score_earned = asNumber(r.score_earned);
    const score_max = asNumber(r.score_max);
    const percentage = asNumber(r.percentage);
    const scored_at = asString(r.scored_at);
    const status = asString(r.status);
    if (
      score_earned === null ||
      score_max === null ||
      percentage === null ||
      !scored_at ||
      status !== "scored"
    ) {
      return null;
    }
    // Reject unexpected per-question / staff fields if present in payload.
    if (
      "answer_results" in r ||
      "is_correct" in r ||
      "points_earned" in r ||
      "scored_by" in r ||
      "evaluation_mode_snapshot" in r ||
      "answer_key" in r ||
      "answer_payload" in r
    ) {
      return null;
    }
    result = {
      status: "scored",
      score_earned,
      score_max,
      percentage,
      passed: asBoolOrNull(r.passed),
      scored_at,
    };
  }

  return {
    attempt_id,
    activity_id,
    attempt_status,
    visibility,
    result: visibility === "available" ? result : null,
    message,
  };
}

/** Banner / status copy from result visibility (submitted path). */
export function learnerResultStatusMessage(
  visibility: LearningLearnerResultVisibility,
  fallbackHidden: string = LEARNING_LEARNER_RESULT_MESSAGES.hidden
): string {
  switch (visibility) {
    case "pending_score":
      return LEARNING_LEARNER_RESULT_MESSAGES.pending;
    case "available":
      return LEARNING_LEARNER_RESULT_MESSAGES.available;
    case "hidden":
    default:
      return fallbackHidden;
  }
}

export async function getMyLearningAttemptResultView(
  supabase: AnyClient,
  attemptId: string
): Promise<LearningResultDeliveryResult<LearningLearnerAttemptResultView>> {
  const { data, error } = await supabase.rpc(
    LEARNING_LEARNER_RESULT_RPCS.getMyResult,
    { p_attempt_id: attemptId }
  );

  if (error) {
    return { ok: false, message: SAFE_DENY_MESSAGE };
  }

  const parsed = parseLearnerAttemptResultView(data);
  if (!parsed) {
    return { ok: false, message: SAFE_DENY_MESSAGE };
  }
  return { ok: true, data: parsed };
}
