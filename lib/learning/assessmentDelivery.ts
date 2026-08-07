/**
 * UM Learning OS — Assessment Delivery Minimal V1.
 *
 * Read-only learner delivery of a published activity's published questions via
 * `get_my_learning_activity_assessment`. No attempts, submissions, scoring,
 * answer persistence, or progress mutation. JWT client only — no service role.
 *
 * Answer-key firewall: RPC never returns keys; this adapter never SELECTs
 * question/answer-key tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_ATTEMPT_ANSWERABLE_TYPES,
  LEARNING_ATTEMPT_HELPERS,
  LEARNING_ATTEMPT_RPCS,
  type LearningAttemptAnswerableType,
} from "./attemptsFoundation";
import {
  LEARNING_LEARNER_FORBIDDEN,
  LEARNING_LEARNER_ROUTES,
  toLearnerActivityHints,
  type LearningLearnerActivityHints,
  type LearningLearnerSnapshotQuestion,
} from "./learnerDelivery";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_DELIVERY_RPCS = {
  getMyActivityAssessment: "get_my_learning_activity_assessment",
} as const;

export const LEARNING_ASSESSMENT_DELIVERY_ROUTES = {
  assessment: (activityId: string) =>
    `/learning/activities/${activityId}/assessment`,
  activityGate: LEARNING_LEARNER_ROUTES.activity,
} as const;

/** Surfaces / tables / RPCs this slice must never use. */
export const LEARNING_ASSESSMENT_DELIVERY_FORBIDDEN = {
  questionTables: LEARNING_LEARNER_FORBIDDEN.questionTables,
  resultTables: LEARNING_LEARNER_FORBIDDEN.resultTables,
  scoringRpc: LEARNING_SCORING_RPCS.score,
  internalSnapshotBuilder: LEARNING_ATTEMPT_HELPERS.buildSnapshot,
  startAttempt: LEARNING_ATTEMPT_RPCS.start,
  saveAnswer: LEARNING_ATTEMPT_RPCS.saveAnswer,
  submitAttempt: LEARNING_ATTEMPT_RPCS.submit,
  cancelAttempt: LEARNING_ATTEMPT_RPCS.cancel,
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
} as const;

const ANSWERABLE = new Set<string>(LEARNING_ATTEMPT_ANSWERABLE_TYPES);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentDeliveryUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type AssessmentDeliveryQuestion = LearningLearnerSnapshotQuestion;

export type AssessmentDeliveryView = {
  activity_id: string;
  lesson_id: string;
  course_id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  /** Nullable ISO timestamptz from settings.due_at; absent/null => null. */
  due_at: string | null;
  hints: LearningLearnerActivityHints;
  questions: AssessmentDeliveryQuestion[];
  question_count: number;
};

export type AssessmentDeliveryOk = {
  ok: true;
  data: AssessmentDeliveryView;
};

export type AssessmentDeliveryErr = {
  ok: false;
  message: string;
};

export type AssessmentDeliveryResult =
  | AssessmentDeliveryOk
  | AssessmentDeliveryErr;

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

export function sanitizeAssessmentDeliveryError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Assessment could not be loaded.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to view this assessment.";
  }
  if (lower.includes("not found")) {
    return "Assessment not found or unavailable.";
  }
  if (
    lower.includes("must be published") ||
    lower.includes("must be active")
  ) {
    return "This assessment is not available yet.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("policy") ||
    lower.includes("violates")
  ) {
    return "Assessment could not be loaded.";
  }
  if (raw.length > 180) return "Assessment could not be loaded.";
  return raw;
}

/** Strip any correctness material that must never reach learner UI props. */
export function toLearnerSafeAssessmentQuestion(
  raw: unknown
): AssessmentDeliveryQuestion | null {
  const row = asRecord(raw);
  if (!row) return null;
  const question_id = asString(row.question_id);
  const question_type = asString(row.question_type);
  const position = asNumberOrNull(row.position);
  if (!question_id || !question_type || position == null) return null;
  if (!ANSWERABLE.has(question_type)) return null;

  const contentRaw = asRecord(row.content) ?? {};
  const content: Record<string, unknown> = { ...contentRaw };
  delete content.correct;
  delete content.correct_key;
  delete content.correct_keys;
  delete content.accepted;
  delete content.answers;
  delete content.value;
  delete content.tolerance;
  delete content.answer_key;
  delete content.normalization;
  delete content.grading;
  delete content.score;

  const out: AssessmentDeliveryQuestion = {
    question_id,
    question_type: question_type as LearningAttemptAnswerableType,
    position,
    content,
  };
  if ("points" in row) {
    out.points = asNumberOrNull(row.points);
  }
  return out;
}

export function parseAssessmentDeliveryView(
  raw: unknown
): AssessmentDeliveryView | null {
  const row = asRecord(raw);
  if (!row) return null;

  const activity_id = asString(row.activity_id);
  const lesson_id = asString(row.lesson_id);
  const course_id = asString(row.course_id);
  const name = asString(row.name);
  const slug = asString(row.slug);
  const type = asString(row.type);
  if (!activity_id || !lesson_id || !course_id || !name || !slug || !type) {
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
  questions.sort((a, b) => a.position - b.position || a.question_id.localeCompare(b.question_id));

  const question_count =
    asNumberOrNull(row.question_count) ?? questions.length;

  let due_at: string | null = null;
  if ("due_at" in row) {
    const dueRaw = row.due_at;
    if (dueRaw === null) {
      due_at = null;
    } else if (typeof dueRaw === "string") {
      due_at = dueRaw.length > 0 ? dueRaw : null;
    } else {
      return null;
    }
  }

  return {
    activity_id,
    lesson_id,
    course_id,
    name,
    slug,
    type,
    description: asString(row.description),
    due_at,
    hints: toLearnerActivityHints(asRecord(row.hints)),
    questions,
    question_count,
  };
}

/**
 * Load a learner-safe assessment via the trusted RPC only.
 * Never SELECTs learning_questions / answer keys; never starts an attempt.
 */
export async function loadAssessmentDelivery(
  supabase: AnyClient,
  activityId: string
): Promise<AssessmentDeliveryResult> {
  if (!isAssessmentDeliveryUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_DELIVERY_RPCS.getMyActivityAssessment,
    { p_activity_id: activityId }
  );

  if (error) {
    return {
      ok: false,
      message: sanitizeAssessmentDeliveryError(error.message),
    };
  }

  const parsed = parseAssessmentDeliveryView(data);
  if (!parsed) {
    return { ok: false, message: "Assessment payload is malformed." };
  }
  if (parsed.activity_id !== activityId) {
    return { ok: false, message: "Assessment payload is malformed." };
  }

  return { ok: true, data: parsed };
}
