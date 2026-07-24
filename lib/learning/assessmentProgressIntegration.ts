/**
 * UM Learning OS — Assessment Result → Progress Integration V1.
 *
 * Owner applies lesson completion when attempt is fully graded and passed=true,
 * via existing progress applications ledger. No certificates/rewards/analytics.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "./assessmentAttemptFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_PROGRESS_RPCS = {
  apply: "apply_my_learning_assessment_progress",
  getStatus: "get_my_learning_assessment_progress_status",
} as const;

export const LEARNING_ASSESSMENT_PROGRESS_INTERNAL = {
  tryApply:
    "learning_progress_try_apply_from_graded_assessment",
} as const;

export const LEARNING_ASSESSMENT_PROGRESS_FORBIDDEN = {
  completeLesson: LEARNING_PROGRESS_RPCS.completeLesson,
} as const;

export type AssessmentProgressStatusView = {
  attempt_id: string;
  activity_id: string;
  grading_status: string;
  passed: boolean | null;
  completion_recorded: boolean;
  applied_at: string | null;
  can_apply: boolean;
};

export type AssessmentProgressApplyView = {
  attempt_id: string;
  activity_id: string;
  status: string;
  reason: string | null;
  completion_recorded: boolean;
  applied_at: string | null;
  lesson_id: string | null;
};

export type AssessmentProgressResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentProgressUuid(value: string): boolean {
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

export function sanitizeAssessmentProgressError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Progress could not be updated.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to update progress for this attempt.";
  }
  if (lower.includes("malformed")) {
    return "This attempt cannot update progress because its data is invalid.";
  }
  if (lower.includes("not found")) {
    return "Attempt not found or unavailable.";
  }
  if (raw.length > 180) return "Progress could not be updated.";
  return raw;
}

export function parseAssessmentProgressStatusView(
  raw: unknown
): AssessmentProgressStatusView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const grading_status = asString(row.grading_status);
  if (!attempt_id || !activity_id || !grading_status) return null;
  return {
    attempt_id,
    activity_id,
    grading_status,
    passed: typeof row.passed === "boolean" ? row.passed : null,
    completion_recorded: asBool(row.completion_recorded, false),
    applied_at: asString(row.applied_at),
    can_apply: asBool(row.can_apply, false),
  };
}

export function parseAssessmentProgressApplyView(
  raw: unknown
): AssessmentProgressApplyView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const status = asString(row.status);
  if (!attempt_id || !activity_id || !status) return null;
  return {
    attempt_id,
    activity_id,
    status,
    reason: asString(row.reason),
    completion_recorded: asBool(row.completion_recorded, false),
    applied_at: asString(row.applied_at),
    lesson_id: asString(row.lesson_id),
  };
}

export async function loadAssessmentProgressStatus(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentProgressResult<AssessmentProgressStatusView>> {
  if (!isAssessmentProgressUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_PROGRESS_RPCS.getStatus,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentProgressError(error.message) };
  }
  const parsed = parseAssessmentProgressStatusView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Progress status payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function applyAssessmentProgress(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentProgressResult<AssessmentProgressApplyView>> {
  if (!isAssessmentProgressUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_PROGRESS_RPCS.apply,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentProgressError(error.message) };
  }
  const parsed = parseAssessmentProgressApplyView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Progress apply payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export function assessmentProgressRevalidatePath(
  activityId: string,
  attemptId: string
): string {
  return LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId);
}
