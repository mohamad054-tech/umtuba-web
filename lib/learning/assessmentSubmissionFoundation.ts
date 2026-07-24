/**
 * UM Learning OS — Assessment Submission Foundation V1.
 *
 * Submit / read submission lifecycle for the caller's own assessment attempt.
 * Reuses `learning_attempts` status + submitted_at. No scoring, keys, or
 * progress mutation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "./assessmentAttemptFoundation";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_SUBMISSION_RPCS = {
  submit: "submit_my_learning_assessment_attempt",
  getMine: "get_my_learning_assessment_submission",
} as const;

/** Explicitly out of Assessment Submission Foundation V1. */
export const LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN = {
  legacySubmit: LEARNING_ATTEMPT_RPCS.submit,
  score: LEARNING_SCORING_RPCS.score,
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
  completeLesson: LEARNING_PROGRESS_RPCS.completeLesson,
} as const;

/**
 * Completeness policy (DB-authoritative; mirrored here for docs/tests):
 * - Every snapshotted question is required by default.
 * - Optional only when snapshot sets boolean `is_required` or `required` to false.
 * - Optional unanswered does not block submission.
 * - Never validated against answer keys.
 */
export const LEARNING_ASSESSMENT_SUBMISSION_COMPLETENESS = {
  defaultRequired: true,
  optionalFlags: ["is_required", "required"] as const,
  unansweredRequiredError: "Required question is unanswered",
  malformedSnapshotError: "Attempt questions snapshot is malformed",
} as const;

export const LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN_INPUT_KEYS = [
  "user_id",
  "learner_id",
  "status",
  "submitted_at",
  "score",
  "points",
  "correct",
  "is_correct",
  "answer_key",
  "grading",
  "graded",
  "progress",
  "certificate",
] as const;

export type AssessmentSubmissionView = {
  attempt_id: string;
  activity_id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  last_activity_at: string | null;
  question_count: number;
  answer_count: number;
  is_submitted: boolean;
};

export type AssessmentSubmitResultView = {
  attempt_id: string;
  activity_id: string;
  status: "submitted";
  submitted_at: string;
  started_at: string;
  question_count: number;
  answer_count: number;
  is_submitted: true;
  idempotent: boolean;
};

export type AssessmentSubmissionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentSubmissionUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asInt(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : fallback;
}

export function sanitizeAssessmentSubmissionError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Submission could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to submit this attempt.";
  }
  if (lower.includes("required question is unanswered")) {
    return "Answer all required questions before submitting.";
  }
  if (lower.includes("questions snapshot is malformed")) {
    return "This attempt cannot be submitted because its question snapshot is invalid.";
  }
  if (
    lower.includes("cannot be submitted") ||
    lower.includes("no longer active") ||
    lower.includes("attempt is")
  ) {
    return "This attempt can no longer be submitted.";
  }
  if (lower.includes("not found")) {
    return "Attempt not found or unavailable.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("policy") ||
    lower.includes("violates")
  ) {
    return "Submission could not be completed.";
  }
  if (raw.length > 180) return "Submission could not be completed.";
  return raw;
}

/**
 * Reject client-injected authoritative fields. Submit accepts attempt_id only.
 */
export function assertAssessmentSubmitInputSafe(
  raw: unknown
): AssessmentSubmissionResult<{ attempt_id: string }> {
  const row = asRecord(raw);
  if (!row) {
    return { ok: false, message: "Invalid submission input." };
  }
  for (const key of Object.keys(row)) {
    if (key === "attempt_id" || key === "p_attempt_id") continue;
    if (
      (LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN_INPUT_KEYS as readonly string[]).includes(
        key
      )
    ) {
      return {
        ok: false,
        message: "Submission input contains forbidden authoritative fields.",
      };
    }
    if (key !== "activity_id") {
      return { ok: false, message: "Unexpected submission field." };
    }
  }
  const attemptId = asString(row.attempt_id) ?? asString(row.p_attempt_id);
  if (!attemptId || !isAssessmentSubmissionUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  return { ok: true, data: { attempt_id: attemptId } };
}

export function parseAssessmentSubmitResultView(
  raw: unknown
): AssessmentSubmitResultView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const status = asString(row.status);
  const submitted_at = asString(row.submitted_at);
  const started_at = asString(row.started_at);
  if (
    !attempt_id ||
    !activity_id ||
    status !== "submitted" ||
    !submitted_at ||
    !started_at
  ) {
    return null;
  }
  if (!asBool(row.is_submitted, false)) return null;
  for (const key of LEARNING_ASSESSMENT_SUBMISSION_FORBIDDEN_INPUT_KEYS) {
    if (key === "submitted_at" || key === "status") continue;
    if (key in row) return null;
  }
  return {
    attempt_id,
    activity_id,
    status: "submitted",
    submitted_at,
    started_at,
    question_count: asInt(row.question_count, 0),
    answer_count: asInt(row.answer_count, 0),
    is_submitted: true,
    idempotent: asBool(row.idempotent, false),
  };
}

export function parseAssessmentSubmissionView(
  raw: unknown
): AssessmentSubmissionView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const status = asString(row.status);
  const started_at = asString(row.started_at);
  if (!attempt_id || !activity_id || !status || !started_at) return null;

  for (const key of [
    "score",
    "points",
    "correct",
    "is_correct",
    "answer_key",
    "answers",
    "grading",
    "certificate",
  ] as const) {
    if (key in row) return null;
  }

  return {
    attempt_id,
    activity_id,
    status,
    started_at,
    submitted_at: asString(row.submitted_at),
    expired_at: asString(row.expired_at),
    cancelled_at: asString(row.cancelled_at),
    last_activity_at: asString(row.last_activity_at),
    question_count: asInt(row.question_count, 0),
    answer_count: asInt(row.answer_count, 0),
    is_submitted: asBool(row.is_submitted, status === "submitted"),
  };
}

export async function submitAssessmentAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentSubmissionResult<AssessmentSubmitResultView>> {
  if (!isAssessmentSubmissionUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_SUBMISSION_RPCS.submit,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return {
      ok: false,
      message: sanitizeAssessmentSubmissionError(error.message),
    };
  }
  const parsed = parseAssessmentSubmitResultView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Submission payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadAssessmentSubmission(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentSubmissionResult<AssessmentSubmissionView>> {
  if (!isAssessmentSubmissionUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_SUBMISSION_RPCS.getMine,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return {
      ok: false,
      message: sanitizeAssessmentSubmissionError(error.message),
    };
  }
  const parsed = parseAssessmentSubmissionView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Submission payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export function assessmentSubmissionRevalidatePath(
  activityId: string,
  attemptId: string
): string {
  return LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId);
}
