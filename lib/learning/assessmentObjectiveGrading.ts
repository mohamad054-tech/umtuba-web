/**
 * UM Learning OS — Assessment Objective Grading Foundation V1.
 *
 * Grade objective questions on the caller's own submitted assessment attempt.
 * Subjective types stay pending_manual_review. Never exposes answer keys.
 * Never mutates learner answers, progress, or certificates.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "./assessmentAttemptFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_GRADING_RPCS = {
  grade: "grade_my_learning_assessment_attempt",
  getMine: "get_my_learning_assessment_grade",
} as const;

export const LEARNING_ASSESSMENT_GRADING_FORBIDDEN = {
  staffScore: LEARNING_SCORING_RPCS.score,
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
  completeLesson: LEARNING_PROGRESS_RPCS.completeLesson,
} as const;

export const LEARNING_ASSESSMENT_OBJECTIVE_TYPES = [
  "multiple_choice_single",
  "multiple_choice_multiple",
  "true_false",
  "numeric",
] as const;

export const LEARNING_ASSESSMENT_SUBJECTIVE_TYPES = [
  "short_answer",
  "fill_blank",
] as const;

export const LEARNING_ASSESSMENT_GRADING_STATUSES = [
  "not_graded",
  "grading",
  "partially_graded",
  "graded",
  "grading_failed",
  "scored",
] as const;

export const LEARNING_ASSESSMENT_QUESTION_RESULT_STATES = [
  "correct",
  "incorrect",
  "pending_manual_review",
  "not_answered",
  "unsupported",
  "grading_error",
] as const;

export type LearningAssessmentGradingStatus =
  (typeof LEARNING_ASSESSMENT_GRADING_STATUSES)[number];

export type LearningAssessmentQuestionResultState =
  (typeof LEARNING_ASSESSMENT_QUESTION_RESULT_STATES)[number];

/**
 * Numeric policy (mirrors learning_scoring_evaluate_answer):
 * abs(learner.value - answer_key.value) <= coalesce(tolerance, 0)
 */
export const LEARNING_ASSESSMENT_NUMERIC_POLICY =
  "abs(learner.value - key.value) <= coalesce(key.tolerance, 0)" as const;

export const LEARNING_ASSESSMENT_GRADING_FORBIDDEN_INPUT_KEYS = [
  "user_id",
  "learner_id",
  "score",
  "points",
  "points_earned",
  "correct",
  "is_correct",
  "grading_status",
  "result_state",
  "graded_at",
  "scored_at",
  "answer_key",
  "passed",
] as const;

export type AssessmentQuestionGradeResult = {
  question_id: string;
  question_type: string;
  result_state: LearningAssessmentQuestionResultState;
  points_possible: number;
  points_earned: number | null;
  feedback_code: string;
};

export type AssessmentGradeView = {
  attempt_id: string;
  activity_id: string;
  grading_status: string;
  graded_at: string | null;
  objective_points_earned: number | null;
  objective_points_possible: number | null;
  pending_manual_points: number | null;
  total_points_possible: number | null;
  objective_percentage: number | null;
  has_pending_manual_review: boolean;
  is_final: boolean;
  question_results: AssessmentQuestionGradeResult[];
};

export type AssessmentGradeResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESULT_STATES = new Set<string>(LEARNING_ASSESSMENT_QUESTION_RESULT_STATES);

export function isAssessmentGradeUuid(value: string): boolean {
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

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function sanitizeAssessmentGradeError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Grading could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to grade this attempt.";
  }
  if (lower.includes("must be submitted") || lower.includes("cannot be graded")) {
    return "Only your submitted attempts can be graded.";
  }
  if (lower.includes("answer key missing") || lower.includes("answer key is malformed")) {
    return "This attempt cannot be graded because an answer key is missing or invalid.";
  }
  if (
    lower.includes("snapshot is malformed") ||
    lower.includes("answer payload is malformed")
  ) {
    return "This attempt cannot be graded because its data is invalid.";
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
    return "Grading could not be completed.";
  }
  if (raw.length > 180) return "Grading could not be completed.";
  return raw;
}

export function assertAssessmentGradeInputSafe(
  raw: unknown
): AssessmentGradeResult<{ attempt_id: string }> {
  const row = asRecord(raw);
  if (!row) return { ok: false, message: "Invalid grading input." };
  for (const key of Object.keys(row)) {
    if (key === "attempt_id" || key === "p_attempt_id" || key === "activity_id") {
      continue;
    }
    if (
      (LEARNING_ASSESSMENT_GRADING_FORBIDDEN_INPUT_KEYS as readonly string[]).includes(
        key
      )
    ) {
      return {
        ok: false,
        message: "Grading input contains forbidden authoritative fields.",
      };
    }
    return { ok: false, message: "Unexpected grading field." };
  }
  const attemptId = asString(row.attempt_id) ?? asString(row.p_attempt_id);
  if (!attemptId || !isAssessmentGradeUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  return { ok: true, data: { attempt_id: attemptId } };
}

export function assessmentGradeStatusMessage(status: string): string {
  switch (status) {
    case "not_graded":
      return "Not graded yet.";
    case "partially_graded":
      return "Objective questions graded. Some answers still need manual review — this is not a final result.";
    case "graded":
      return "Objective grading complete.";
    case "grading_failed":
      return "Grading failed. No trusted final score is available.";
    case "scored":
      return "Scored (legacy staff path).";
    default:
      return `Grading status: ${status}`;
  }
}

export function parseAssessmentGradeView(
  raw: unknown
): AssessmentGradeView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const grading_status = asString(row.grading_status);
  if (!attempt_id || !activity_id || !grading_status) return null;

  for (const key of [
    "answer_key",
    "correct_key",
    "correct_keys",
    "accepted",
    "expected",
    "staff_notes",
    "answers",
  ] as const) {
    if (key in row) return null;
  }

  if (!Array.isArray(row.question_results)) return null;
  const question_results: AssessmentQuestionGradeResult[] = [];
  for (const item of row.question_results) {
    const q = asRecord(item);
    if (!q) return null;
    const question_id = asString(q.question_id);
    const question_type = asString(q.question_type);
    const result_state = asString(q.result_state);
    const feedback_code = asString(q.feedback_code);
    const points_possible = asNumberOrNull(q.points_possible);
    if (
      !question_id ||
      !question_type ||
      !result_state ||
      !RESULT_STATES.has(result_state) ||
      !feedback_code ||
      points_possible == null
    ) {
      return null;
    }
    for (const forbidden of ["answer_key", "correct_key", "expected", "accepted"]) {
      if (forbidden in q) return null;
    }
    question_results.push({
      question_id,
      question_type,
      result_state: result_state as LearningAssessmentQuestionResultState,
      points_possible,
      points_earned: asNumberOrNull(q.points_earned),
      feedback_code,
    });
  }

  return {
    attempt_id,
    activity_id,
    grading_status,
    graded_at: asString(row.graded_at),
    objective_points_earned: asNumberOrNull(row.objective_points_earned),
    objective_points_possible: asNumberOrNull(row.objective_points_possible),
    pending_manual_points: asNumberOrNull(row.pending_manual_points),
    total_points_possible: asNumberOrNull(row.total_points_possible),
    objective_percentage: asNumberOrNull(row.objective_percentage),
    has_pending_manual_review: asBool(row.has_pending_manual_review, false),
    is_final: asBool(row.is_final, false),
    question_results,
  };
}

export async function gradeAssessmentAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentGradeResult<AssessmentGradeView>> {
  if (!isAssessmentGradeUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_GRADING_RPCS.grade,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentGradeError(error.message) };
  }
  const parsed = parseAssessmentGradeView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Grade payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadAssessmentGrade(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentGradeResult<AssessmentGradeView>> {
  if (!isAssessmentGradeUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_GRADING_RPCS.getMine,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentGradeError(error.message) };
  }
  const parsed = parseAssessmentGradeView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Grade payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export function assessmentGradeRevalidatePath(
  activityId: string,
  attemptId: string
): string {
  return LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId);
}
