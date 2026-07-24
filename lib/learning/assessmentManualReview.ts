/**
 * UM Learning OS — Assessment Manual Review Foundation V1.
 *
 * Staff manual review of pending subjective answers. Reuses result tables and
 * can_manage_learning_course authorization. Never exposes answer keys or
 * mutates learner answers / progress / certificates.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_SUBJECTIVE_TYPES } from "./assessmentObjectiveGrading";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS = {
  queue: "get_learning_assessment_manual_review_queue",
  getAttempt: "get_learning_assessment_attempt_for_review",
  review: "review_learning_assessment_answer",
} as const;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES = {
  queue: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/manual-review`,
  attempt: (courseId: string, attemptId: string) =>
    `/learning/instructor/courses/${courseId}/manual-review/${attemptId}`,
} as const;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_TYPES =
  LEARNING_ASSESSMENT_SUBJECTIVE_TYPES;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_FEEDBACK_MAX_CHARS = 2000;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN = {
  staffScore: LEARNING_SCORING_RPCS.score,
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
  completeLesson: LEARNING_PROGRESS_RPCS.completeLesson,
} as const;

export const LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN_INPUT_KEYS = [
  "user_id",
  "reviewer_user_id",
  "reviewer_id",
  "points_possible",
  "grading_status",
  "total_points_earned",
  "total_points_possible",
  "final_percentage",
  "passed",
  "scored_at",
  "graded_at",
  "reviewed_at",
  "answer_key",
  "score",
] as const;

export type ManualReviewQueueItem = {
  attempt_id: string;
  activity_id: string;
  learner_user_id: string;
  submitted_at: string | null;
  grading_status: string;
  pending_question_count: number;
  pending_manual_points: number | null;
};

export type ManualReviewQueueView = {
  course_id: string;
  items: ManualReviewQueueItem[];
  item_count: number;
};

export type ManualReviewQuestion = {
  question_id: string;
  question_type: string;
  prompt: string | null;
  points_possible: number;
  result_state: string;
  points_earned: number | null;
  learner_feedback: string | null;
  reviewed_at: string | null;
  learner_answer: Record<string, unknown> | null;
};

export type ManualReviewAttemptView = {
  attempt_id: string;
  activity_id: string;
  course_id: string;
  learner_user_id: string;
  attempt_status: string;
  submitted_at: string | null;
  grading_status: string;
  has_pending_manual_review: boolean;
  objective_points_earned: number | null;
  objective_points_possible: number | null;
  manual_points_earned: number | null;
  pending_manual_points: number | null;
  total_points_earned: number | null;
  total_points_possible: number | null;
  questions: ManualReviewQuestion[];
};

export type ManualReviewSubmitView = {
  attempt_id: string;
  question_id: string;
  result_state: string;
  points_earned: number;
  points_possible: number;
  learner_feedback: string | null;
  reviewed_at: string | null;
  idempotent: boolean;
  grading_status: string;
};

export type ManualReviewResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isManualReviewUuid(value: string): boolean {
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

export function sanitizeManualReviewError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Manual review could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to review this assessment.";
  }
  if (lower.includes("cannot be reviewed") || lower.includes("must be submitted")) {
    return "Only submitted attempts can be reviewed.";
  }
  if (lower.includes("objective questions cannot")) {
    return "Objective questions cannot be manually reviewed.";
  }
  if (lower.includes("not pending manual review")) {
    return "That question is not pending manual review.";
  }
  if (lower.includes("finalized")) {
    return "This attempt is fully graded and cannot be changed.";
  }
  if (lower.includes("cannot be negative") || lower.includes("exceed")) {
    return "Points must be between 0 and the question maximum.";
  }
  if (lower.includes("feedback exceeds")) {
    return "Feedback is too long.";
  }
  if (lower.includes("not found") || lower.includes("malformed")) {
    return "Review data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Manual review could not be completed.";
  return raw;
}

export function assertManualReviewInputSafe(
  raw: unknown
): ManualReviewResult<{
  attempt_id: string;
  question_id: string;
  points_earned: number;
  feedback: string | null;
}> {
  const row = asRecord(raw);
  if (!row) return { ok: false, message: "Invalid review input." };

  for (const key of Object.keys(row)) {
    if (
      [
        "attempt_id",
        "question_id",
        "points_earned",
        "feedback",
        "activity_id",
        "course_id",
      ].includes(key)
    ) {
      continue;
    }
    if (
      (
        LEARNING_ASSESSMENT_MANUAL_REVIEW_FORBIDDEN_INPUT_KEYS as readonly string[]
      ).includes(key)
    ) {
      return {
        ok: false,
        message: "Review input contains forbidden authoritative fields.",
      };
    }
    return { ok: false, message: "Unexpected review field." };
  }

  const attemptId = asString(row.attempt_id);
  const questionId = asString(row.question_id);
  const points = asNumberOrNull(row.points_earned);
  if (!attemptId || !isManualReviewUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  if (!questionId || !isManualReviewUuid(questionId)) {
    return { ok: false, message: "question_id must be a valid UUID" };
  }
  if (points == null || points < 0) {
    return { ok: false, message: "points_earned must be a non-negative number" };
  }

  let feedback: string | null = null;
  if (row.feedback != null && row.feedback !== "") {
    if (typeof row.feedback !== "string") {
      return { ok: false, message: "feedback must be text." };
    }
    if (row.feedback.length > LEARNING_ASSESSMENT_MANUAL_REVIEW_FEEDBACK_MAX_CHARS) {
      return { ok: false, message: "Feedback is too long." };
    }
    feedback = row.feedback;
  }

  return {
    ok: true,
    data: {
      attempt_id: attemptId,
      question_id: questionId,
      points_earned: points,
      feedback,
    },
  };
}

export function parseManualReviewQueueView(
  raw: unknown
): ManualReviewQueueView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const course_id = asString(row.course_id);
  if (!course_id || !Array.isArray(row.items)) return null;
  const items: ManualReviewQueueItem[] = [];
  for (const item of row.items) {
    const it = asRecord(item);
    if (!it) return null;
    const attempt_id = asString(it.attempt_id);
    const activity_id = asString(it.activity_id);
    const learner_user_id = asString(it.learner_user_id);
    const grading_status = asString(it.grading_status);
    if (!attempt_id || !activity_id || !learner_user_id || !grading_status) {
      return null;
    }
    items.push({
      attempt_id,
      activity_id,
      learner_user_id,
      submitted_at: asString(it.submitted_at),
      grading_status,
      pending_question_count: asNumberOrNull(it.pending_question_count) ?? 0,
      pending_manual_points: asNumberOrNull(it.pending_manual_points),
    });
  }
  return {
    course_id,
    items,
    item_count: asNumberOrNull(row.item_count) ?? items.length,
  };
}

export function parseManualReviewAttemptView(
  raw: unknown
): ManualReviewAttemptView | null {
  const row = asRecord(raw);
  if (!row) return null;
  if ("answer_key" in row || "correct_key" in row || "accepted" in row) {
    return null;
  }
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const course_id = asString(row.course_id);
  const learner_user_id = asString(row.learner_user_id);
  const attempt_status = asString(row.attempt_status);
  const grading_status = asString(row.grading_status);
  if (
    !attempt_id ||
    !activity_id ||
    !course_id ||
    !learner_user_id ||
    !attempt_status ||
    !grading_status ||
    !Array.isArray(row.questions)
  ) {
    return null;
  }

  const questions: ManualReviewQuestion[] = [];
  for (const q of row.questions) {
    const qr = asRecord(q);
    if (!qr) return null;
    if ("answer_key" in qr || "correct_key" in qr || "expected" in qr) {
      return null;
    }
    const question_id = asString(qr.question_id);
    const question_type = asString(qr.question_type);
    const result_state = asString(qr.result_state);
    const points_possible = asNumberOrNull(qr.points_possible);
    if (!question_id || !question_type || !result_state || points_possible == null) {
      return null;
    }
    const answer = asRecord(qr.learner_answer);
    questions.push({
      question_id,
      question_type,
      prompt: typeof qr.prompt === "string" ? qr.prompt : null,
      points_possible,
      result_state,
      points_earned: asNumberOrNull(qr.points_earned),
      learner_feedback:
        typeof qr.learner_feedback === "string" ? qr.learner_feedback : null,
      reviewed_at: asString(qr.reviewed_at),
      learner_answer: answer,
    });
  }

  return {
    attempt_id,
    activity_id,
    course_id,
    learner_user_id,
    attempt_status,
    submitted_at: asString(row.submitted_at),
    grading_status,
    has_pending_manual_review: asBool(row.has_pending_manual_review, false),
    objective_points_earned: asNumberOrNull(row.objective_points_earned),
    objective_points_possible: asNumberOrNull(row.objective_points_possible),
    manual_points_earned: asNumberOrNull(row.manual_points_earned),
    pending_manual_points: asNumberOrNull(row.pending_manual_points),
    total_points_earned: asNumberOrNull(row.total_points_earned),
    total_points_possible: asNumberOrNull(row.total_points_possible),
    questions,
  };
}

export function parseManualReviewSubmitView(
  raw: unknown
): ManualReviewSubmitView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const question_id = asString(row.question_id);
  const result_state = asString(row.result_state);
  const grading_status = asString(row.grading_status);
  const points_earned = asNumberOrNull(row.points_earned);
  const points_possible = asNumberOrNull(row.points_possible);
  if (
    !attempt_id ||
    !question_id ||
    !result_state ||
    !grading_status ||
    points_earned == null ||
    points_possible == null
  ) {
    return null;
  }
  return {
    attempt_id,
    question_id,
    result_state,
    points_earned,
    points_possible,
    learner_feedback:
      typeof row.learner_feedback === "string" ? row.learner_feedback : null,
    reviewed_at: asString(row.reviewed_at),
    idempotent: asBool(row.idempotent, false),
    grading_status,
  };
}

export async function loadManualReviewQueue(
  supabase: AnyClient,
  courseId: string
): Promise<ManualReviewResult<ManualReviewQueueView>> {
  if (!isManualReviewUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.queue,
    { p_course_id: courseId }
  );
  if (error) {
    return { ok: false, message: sanitizeManualReviewError(error.message) };
  }
  const parsed = parseManualReviewQueueView(data);
  if (!parsed || parsed.course_id !== courseId) {
    return { ok: false, message: "Review queue payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadManualReviewAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<ManualReviewResult<ManualReviewAttemptView>> {
  if (!isManualReviewUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.getAttempt,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeManualReviewError(error.message) };
  }
  const parsed = parseManualReviewAttemptView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Review attempt payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function reviewManualAssessmentAnswer(
  supabase: AnyClient,
  attemptId: string,
  questionId: string,
  pointsEarned: number,
  feedback: string | null
): Promise<ManualReviewResult<ManualReviewSubmitView>> {
  const safe = assertManualReviewInputSafe({
    attempt_id: attemptId,
    question_id: questionId,
    points_earned: pointsEarned,
    feedback,
  });
  if (!safe.ok) return safe;

  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_MANUAL_REVIEW_RPCS.review,
    {
      p_attempt_id: safe.data.attempt_id,
      p_question_id: safe.data.question_id,
      p_points_earned: safe.data.points_earned,
      p_feedback: safe.data.feedback,
    }
  );
  if (error) {
    return { ok: false, message: sanitizeManualReviewError(error.message) };
  }
  const parsed = parseManualReviewSubmitView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Review result payload is malformed." };
  }
  return { ok: true, data: parsed };
}
