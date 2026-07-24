/**
 * UM Learning OS — Assessment Attempt Foundation V1.
 *
 * Assessment-scoped start / read / cancel over existing `learning_attempts`.
 * Reuses Assessment Delivery for entitlement gates. No answer save, submit,
 * scoring, progress mutation, or answer-key exposure.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_ASSESSMENT_DELIVERY_RPCS,
  LEARNING_ASSESSMENT_DELIVERY_ROUTES,
  toLearnerSafeAssessmentQuestion,
  type AssessmentDeliveryQuestion,
} from "./assessmentDelivery";
import {
  LEARNING_ATTEMPT_RPCS,
  LEARNING_ATTEMPT_STATUSES,
  type LearningAttemptStatus,
} from "./attemptsFoundation";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_ATTEMPT_RPCS = {
  start: "start_my_learning_assessment_attempt",
  getMine: "get_my_learning_assessment_attempt",
  cancel: "cancel_my_learning_assessment_attempt",
} as const;

export const LEARNING_ASSESSMENT_ATTEMPT_ROUTES = {
  attempt: (activityId: string, attemptId: string) =>
    `/learning/activities/${activityId}/assessment-attempts/${attemptId}`,
  assessment: LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment,
  activity: LEARNING_LEARNER_ROUTES.activity,
} as const;

/** Explicitly out of Assessment Attempt Foundation V1. */
export const LEARNING_ASSESSMENT_ATTEMPT_FORBIDDEN = {
  saveAnswer: LEARNING_ATTEMPT_RPCS.saveAnswer,
  submit: LEARNING_ATTEMPT_RPCS.submit,
  score: LEARNING_SCORING_RPCS.score,
  deliveryOnlyRead: LEARNING_ASSESSMENT_DELIVERY_RPCS.getMyActivityAssessment,
} as const;

export const LEARNING_ASSESSMENT_ATTEMPT_STATUSES = LEARNING_ATTEMPT_STATUSES;

export type AssessmentAttemptStartView = {
  attempt_id: string;
  activity_id: string;
  status: string;
  attempt_number: number;
  started_at: string;
  resumed: boolean;
  question_count: number;
};

export type AssessmentAttemptView = {
  attempt_id: string;
  activity_id: string;
  lesson_id: string;
  course_id: string;
  status: LearningAttemptStatus;
  attempt_number: number;
  started_at: string;
  last_activity_at: string;
  submitted_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  time_limit_seconds: number | null;
  max_attempts: number | null;
  /** Expiration metadata only — not a background job. */
  expires_at: string | null;
  remaining_seconds: number | null;
  questions: AssessmentDeliveryQuestion[];
  question_count: number;
};

export type AssessmentAttemptResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentAttemptUuid(value: string): boolean {
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

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function sanitizeAssessmentAttemptError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Assessment attempt request failed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to access this assessment attempt.";
  }
  if (lower.includes("maximum attempts")) {
    return "Maximum attempts reached for this assessment.";
  }
  if (lower.includes("no published questions")) {
    return "This assessment has no published questions yet.";
  }
  if (lower.includes("not found")) {
    return "Assessment attempt not found or unavailable.";
  }
  if (
    lower.includes("must be published") ||
    lower.includes("must be active")
  ) {
    return "This assessment is not available yet.";
  }
  if (
    lower.includes("cannot be cancelled") ||
    lower.includes("and cannot be cancelled")
  ) {
    return "This attempt can no longer be cancelled.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("policy") ||
    lower.includes("violates")
  ) {
    return "Assessment attempt request failed.";
  }
  if (raw.length > 180) return "Assessment attempt request failed.";
  return raw;
}

export function parseAssessmentAttemptStartView(
  raw: unknown
): AssessmentAttemptStartView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const status = asString(row.status);
  const started_at = asString(row.started_at);
  const attempt_number = asNumberOrNull(row.attempt_number);
  const question_count = asNumberOrNull(row.question_count);
  if (
    !attempt_id ||
    !activity_id ||
    !status ||
    !started_at ||
    attempt_number == null ||
    question_count == null
  ) {
    return null;
  }
  return {
    attempt_id,
    activity_id,
    status,
    attempt_number,
    started_at,
    resumed: asBool(row.resumed, false),
    question_count,
  };
}

export function parseAssessmentAttemptView(
  raw: unknown
): AssessmentAttemptView | null {
  const row = asRecord(raw);
  if (!row) return null;

  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const lesson_id = asString(row.lesson_id);
  const course_id = asString(row.course_id);
  const status = asString(row.status);
  const started_at = asString(row.started_at);
  const last_activity_at = asString(row.last_activity_at);
  const attempt_number = asNumberOrNull(row.attempt_number);
  if (
    !attempt_id ||
    !activity_id ||
    !lesson_id ||
    !course_id ||
    !status ||
    !started_at ||
    !last_activity_at ||
    attempt_number == null
  ) {
    return null;
  }
  if (!(LEARNING_ASSESSMENT_ATTEMPT_STATUSES as readonly string[]).includes(status)) {
    return null;
  }

  const questionsRaw = Array.isArray(row.questions) ? row.questions : null;
  if (!questionsRaw) return null;
  const questions: AssessmentDeliveryQuestion[] = [];
  for (const q of questionsRaw) {
    const safe = toLearnerSafeAssessmentQuestion(q);
    if (!safe) return null;
    questions.push(safe);
  }
  questions.sort(
    (a, b) => a.position - b.position || a.question_id.localeCompare(b.question_id)
  );

  return {
    attempt_id,
    activity_id,
    lesson_id,
    course_id,
    status: status as LearningAttemptStatus,
    attempt_number,
    started_at,
    last_activity_at,
    submitted_at: asString(row.submitted_at),
    expired_at: asString(row.expired_at),
    cancelled_at: asString(row.cancelled_at),
    time_limit_seconds: asNumberOrNull(row.time_limit_seconds),
    max_attempts: asNumberOrNull(row.max_attempts),
    expires_at: asString(row.expires_at),
    remaining_seconds: asNumberOrNull(row.remaining_seconds),
    questions,
    question_count: asNumberOrNull(row.question_count) ?? questions.length,
  };
}

export async function startAssessmentAttempt(
  supabase: AnyClient,
  activityId: string
): Promise<AssessmentAttemptResult<AssessmentAttemptStartView>> {
  if (!isAssessmentAttemptUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_ATTEMPT_RPCS.start,
    { p_activity_id: activityId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentAttemptError(error.message) };
  }
  const parsed = parseAssessmentAttemptStartView(data);
  if (!parsed || parsed.activity_id !== activityId) {
    return { ok: false, message: "Assessment attempt start payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadAssessmentAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentAttemptResult<AssessmentAttemptView>> {
  if (!isAssessmentAttemptUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_ATTEMPT_RPCS.getMine,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentAttemptError(error.message) };
  }
  const parsed = parseAssessmentAttemptView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Assessment attempt payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function cancelAssessmentAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentAttemptResult<{ attempt_id: string; status: string; cancelled_at: string | null }>> {
  if (!isAssessmentAttemptUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_ATTEMPT_RPCS.cancel,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentAttemptError(error.message) };
  }
  const row = asRecord(data);
  const attempt_id = asString(row?.attempt_id);
  const status = asString(row?.status);
  if (!attempt_id || !status) {
    return { ok: false, message: "Assessment attempt cancel payload is malformed." };
  }
  return {
    ok: true,
    data: {
      attempt_id,
      status,
      cancelled_at: asString(row?.cancelled_at),
    },
  };
}
