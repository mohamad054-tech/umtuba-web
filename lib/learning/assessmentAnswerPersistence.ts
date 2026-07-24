/**
 * UM Learning OS — Assessment Answer Persistence Foundation V1.
 *
 * Save/restore learner answers for the caller's own assessment attempt via
 * assessment-scoped RPCs over existing `learning_attempt_answers`.
 * Persistence only — no submit, score, correctness, or progress mutation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS,
  LEARNING_ATTEMPT_ANSWERABLE_TYPES,
  LEARNING_ATTEMPT_LIMITS,
  LEARNING_ATTEMPT_RPCS,
  type LearningAttemptAnswerableType,
} from "./attemptsFoundation";
import { LEARNING_ASSESSMENT_ATTEMPT_ROUTES } from "./assessmentAttemptFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";
import { LEARNING_QUESTION_RPCS } from "./questionsFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_ANSWER_RPCS = {
  save: "save_my_learning_assessment_answer",
  getMine: "get_my_learning_assessment_answers",
} as const;

export const LEARNING_ASSESSMENT_ANSWER_FORBIDDEN = {
  submit: LEARNING_ATTEMPT_RPCS.submit,
  score: LEARNING_SCORING_RPCS.score,
  setAnswerKey: LEARNING_QUESTION_RPCS.setAnswerKey,
  /** Prefer assessment-scoped save; underlying Attempts save remains DB-only path. */
  legacySave: LEARNING_ATTEMPT_RPCS.saveAnswer,
} as const;

export const LEARNING_ASSESSMENT_ANSWER_FORBIDDEN_PAYLOAD_KEYS = [
  "user_id",
  "learner_id",
  "attempt_id",
  "question_id",
  "status",
  "score",
  "points",
  "points_earned",
  "correct",
  "correct_key",
  "correct_keys",
  "is_correct",
  "answer_key",
  "grading",
  "graded",
  "created_by",
  "owner_id",
] as const;

const ANSWERABLE = new Set<string>(LEARNING_ATTEMPT_ANSWERABLE_TYPES);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentAnswerUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type AssessmentSavedAnswer = {
  question_id: string;
  answer_payload: Record<string, unknown>;
  first_answered_at: string;
  last_saved_at: string;
};

export type AssessmentAnswersView = {
  attempt_id: string;
  activity_id: string;
  status: string;
  answers: AssessmentSavedAnswer[];
  answer_count: number;
};

export type AssessmentAnswerSaveView = {
  attempt_id: string;
  question_id: string;
  saved: boolean;
  first_answered_at: string;
  last_saved_at: string;
};

export type AssessmentAnswerResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

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

export function sanitizeAssessmentAnswerError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Answer could not be saved.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled") ||
    lower.includes("permission")
  ) {
    return "You are not allowed to access these answers.";
  }
  if (lower.includes("can no longer be modified") || lower.includes("attempt is")) {
    return "This attempt can no longer accept answers.";
  }
  if (lower.includes("not part of this attempt")) {
    return "That question is not part of this attempt.";
  }
  if (
    lower.includes("forbidden authoritative") ||
    lower.includes("unexpected key") ||
    lower.includes("must be a json object") ||
    lower.includes("answer_payload")
  ) {
    return "Answer payload is invalid.";
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
    return "Answer could not be saved.";
  }
  if (raw.length > 180) return "Answer could not be saved.";
  return raw;
}

/**
 * Client-side structural allowlist before RPC. DB remains final authority.
 */
export function buildAssessmentAnswerPayload(
  questionType: string,
  raw: unknown
): AssessmentAnswerResult<Record<string, unknown>> {
  if (!ANSWERABLE.has(questionType)) {
    return { ok: false, message: "Unsupported question type." };
  }
  const type = questionType as LearningAttemptAnswerableType;
  const input = asRecord(raw);
  if (!input) {
    return { ok: false, message: "Answer payload is invalid." };
  }

  for (const key of Object.keys(input)) {
    if (
      (LEARNING_ASSESSMENT_ANSWER_FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(
        key
      )
    ) {
      return { ok: false, message: "Answer contains forbidden fields." };
    }
  }

  const allowed = LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS[type];
  for (const key of Object.keys(input)) {
    if (!(allowed as readonly string[]).includes(key)) {
      return { ok: false, message: `Unknown answer field: ${key}` };
    }
  }

  const serialized = JSON.stringify(input);
  if (serialized.length > LEARNING_ATTEMPT_LIMITS.answerPayloadMaxBytes) {
    return { ok: false, message: "Answer payload exceeds size limit." };
  }

  switch (type) {
    case "multiple_choice_single": {
      if (typeof input.selected_key !== "string" || !input.selected_key) {
        return { ok: false, message: "selected_key is required." };
      }
      return { ok: true, data: { selected_key: input.selected_key } };
    }
    case "multiple_choice_multiple": {
      if (
        !Array.isArray(input.selected_keys) ||
        input.selected_keys.some((k) => typeof k !== "string")
      ) {
        return { ok: false, message: "selected_keys must be a string array." };
      }
      return {
        ok: true,
        data: { selected_keys: input.selected_keys as string[] },
      };
    }
    case "true_false": {
      if (typeof input.value !== "boolean") {
        return { ok: false, message: "value must be a boolean." };
      }
      return { ok: true, data: { value: input.value } };
    }
    case "short_answer": {
      if (typeof input.text !== "string") {
        return { ok: false, message: "text is required." };
      }
      if (input.text.length > LEARNING_ATTEMPT_LIMITS.shortAnswerTextMaxChars) {
        return { ok: false, message: "text exceeds maximum length." };
      }
      return { ok: true, data: { text: input.text } };
    }
    case "fill_blank": {
      if (!asRecord(input.blanks)) {
        return { ok: false, message: "blanks must be an object." };
      }
      const blanks: Record<string, string> = {};
      for (const [k, v] of Object.entries(input.blanks as Record<string, unknown>)) {
        if (typeof v !== "string") {
          return { ok: false, message: "blank values must be strings." };
        }
        if (v.length > LEARNING_ATTEMPT_LIMITS.fillBlankTextMaxChars) {
          return { ok: false, message: "blank text exceeds maximum length." };
        }
        blanks[k] = v;
      }
      return { ok: true, data: { blanks } };
    }
    case "numeric": {
      if (typeof input.value !== "number" || !Number.isFinite(input.value)) {
        return { ok: false, message: "value must be a number." };
      }
      return { ok: true, data: { value: input.value } };
    }
    default:
      return { ok: false, message: "Unsupported question type." };
  }
}

export function parseAssessmentAnswersView(
  raw: unknown
): AssessmentAnswersView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const activity_id = asString(row.activity_id);
  const status = asString(row.status);
  if (!attempt_id || !activity_id || !status) return null;
  if (!Array.isArray(row.answers)) return null;

  const answers: AssessmentSavedAnswer[] = [];
  for (const item of row.answers) {
    const a = asRecord(item);
    if (!a) return null;
    const question_id = asString(a.question_id);
    const payload = asRecord(a.answer_payload);
    const first = asString(a.first_answered_at);
    const last = asString(a.last_saved_at);
    if (!question_id || !payload || !first || !last) return null;
    for (const key of Object.keys(payload)) {
      if (
        (LEARNING_ASSESSMENT_ANSWER_FORBIDDEN_PAYLOAD_KEYS as readonly string[]).includes(
          key
        )
      ) {
        return null;
      }
    }
    answers.push({
      question_id,
      answer_payload: payload,
      first_answered_at: first,
      last_saved_at: last,
    });
  }

  return {
    attempt_id,
    activity_id,
    status,
    answers,
    answer_count: answers.length,
  };
}

export function parseAssessmentAnswerSaveView(
  raw: unknown
): AssessmentAnswerSaveView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attempt_id = asString(row.attempt_id);
  const question_id = asString(row.question_id);
  const first = asString(row.first_answered_at);
  const last = asString(row.last_saved_at);
  if (!attempt_id || !question_id || !first || !last) return null;
  return {
    attempt_id,
    question_id,
    saved: asBool(row.saved, true),
    first_answered_at: first,
    last_saved_at: last,
  };
}

export async function saveAssessmentAnswer(
  supabase: AnyClient,
  attemptId: string,
  questionId: string,
  questionType: string,
  rawAnswer: unknown
): Promise<AssessmentAnswerResult<AssessmentAnswerSaveView>> {
  if (!isAssessmentAnswerUuid(attemptId) || !isAssessmentAnswerUuid(questionId)) {
    return { ok: false, message: "attempt_id and question_id must be valid UUIDs" };
  }
  const built = buildAssessmentAnswerPayload(questionType, rawAnswer);
  if (!built.ok) return built;

  const { data, error } = await supabase.rpc(LEARNING_ASSESSMENT_ANSWER_RPCS.save, {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer: built.data,
  });
  if (error) {
    return { ok: false, message: sanitizeAssessmentAnswerError(error.message) };
  }
  const parsed = parseAssessmentAnswerSaveView(data);
  if (!parsed) {
    return { ok: false, message: "Answer save payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadAssessmentAnswers(
  supabase: AnyClient,
  attemptId: string
): Promise<AssessmentAnswerResult<AssessmentAnswersView>> {
  if (!isAssessmentAnswerUuid(attemptId)) {
    return { ok: false, message: "attempt_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_ASSESSMENT_ANSWER_RPCS.getMine,
    { p_attempt_id: attemptId }
  );
  if (error) {
    return { ok: false, message: sanitizeAssessmentAnswerError(error.message) };
  }
  const parsed = parseAssessmentAnswersView(data);
  if (!parsed || parsed.attempt_id !== attemptId) {
    return { ok: false, message: "Answers payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export function answersByQuestionId(
  view: AssessmentAnswersView
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const a of view.answers) {
    out[a.question_id] = a.answer_payload;
  }
  return out;
}

export function assessmentAnswerRevalidatePath(
  activityId: string,
  attemptId: string
): string {
  return LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId);
}
