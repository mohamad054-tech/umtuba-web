/**
 * Learner-safe wrong-answer contract for Learning AI Tutor.
 *
 * Assembles ONLY released, owner-scoped material needed to explain a mistake.
 * Fail-closed: never loads answer keys, stored correct answers, secret grading
 * internals, unreleased results, or another learner's attempts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAssessmentAnswers } from "../../../learning/assessmentAnswerPersistence";
import { loadAssessmentAttempt } from "../../../learning/assessmentAttemptFoundation";
import { loadAssessmentGrade } from "../../../learning/assessmentObjectiveGrading";
import { getMyLearningAttemptResultView } from "../../../learning/learnerResultDelivery";
import type { AiErrorCode, AiResult } from "../../contracts/types";
import { assertLearningCourseAccess } from "./contextAdapter";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Keys that must never appear in contract payloads. */
export const LEARNER_SAFE_WRONG_ANSWER_FORBIDDEN_KEYS = [
  "answer_key",
  "correct_key",
  "correct_keys",
  "correct",
  "accepted",
  "expected",
  "answers",
  "tolerance",
  "normalization",
  "grading",
  "score",
  "scored_by",
  "evaluation_mode_snapshot",
  "staff_notes",
  "rubric_key",
  "key",
] as const;

export type LearnerSafeWrongAnswerReleasedFeedback = {
  resultState: "incorrect";
  feedbackCode: string;
  learnerFeedback: string | null;
  pointsPossible: number | null;
  pointsEarned: number | null;
};

export type LearnerSafeWrongAnswerAggregate = {
  scoreEarned: number;
  scoreMax: number;
  percentage: number;
  passed: boolean | null;
  scoredAt: string;
};

/**
 * Authorized explanation envelope. Contains no answer keys and no stored
 * correct answers — only learner-visible stem, own wrong answer, and released
 * feedback/result fields.
 */
export type LearnerSafeWrongAnswerContract = {
  userId: string;
  attemptId: string;
  activityId: string;
  courseId: string;
  lessonId: string;
  questionId: string;
  questionType: string;
  questionPosition: number;
  /** Sanitized learner-visible question stem/context. */
  questionContext: Record<string, unknown>;
  /** Caller's own submitted answer payload. */
  learnerAnswer: Record<string, unknown>;
  releasedFeedback: LearnerSafeWrongAnswerReleasedFeedback;
  aggregateResult: LearnerSafeWrongAnswerAggregate;
  dataClassification: "confidential";
  containsAnswerKey: false;
  containsCorrectAnswer: false;
  mutatesProgress: false;
  mutatesGrades: false;
};

function fail(code: AiErrorCode, message: string): AiResult<never> {
  return { ok: false, code, message };
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Deep-scan for forbidden correctness / key material. Fail-closed if found.
 */
export function payloadContainsForbiddenWrongAnswerKeys(
  value: unknown,
  depth = 0
): boolean {
  if (depth > 8 || value == null) return false;
  if (Array.isArray(value)) {
    return value.some((item) =>
      payloadContainsForbiddenWrongAnswerKeys(item, depth + 1)
    );
  }
  const row = asRecord(value);
  if (!row) return false;
  for (const key of Object.keys(row)) {
    const lower = key.toLowerCase();
    if (
      (LEARNER_SAFE_WRONG_ANSWER_FORBIDDEN_KEYS as readonly string[]).includes(
        lower
      ) ||
      lower.includes("answer_key") ||
      lower === "is_correct"
    ) {
      return true;
    }
    if (payloadContainsForbiddenWrongAnswerKeys(row[key], depth + 1)) {
      return true;
    }
  }
  return false;
}

function sanitizeQuestionContext(
  content: Record<string, unknown>
): Record<string, unknown> | null {
  const out: Record<string, unknown> = { ...content };
  for (const key of [
    "correct",
    "correct_key",
    "correct_keys",
    "accepted",
    "answers",
    "value",
    "tolerance",
    "answer_key",
    "normalization",
    "grading",
    "score",
  ] as const) {
    delete out[key];
  }
  if (payloadContainsForbiddenWrongAnswerKeys(out)) return null;
  return out;
}

function mapOwnerDeniedMessage(message: string): AiResult<never> {
  const lower = message.toLowerCase();
  if (
    lower.includes("not allowed") ||
    lower.includes("not entitled") ||
    lower.includes("authentication") ||
    lower.includes("permission") ||
    lower.includes("unable to load result")
  ) {
    return fail(
      "permission_denied",
      "You are not allowed to access this attempt."
    );
  }
  return fail("invalid_input", message);
}

/**
 * Resolve a learner-safe wrong-answer contract for the authenticated owner.
 * Uses only existing owner-scoped Learning RPCs / parsers.
 */
export async function resolveLearnerSafeWrongAnswerContract(input: {
  supabase: AnyClient;
  userId: string;
  attemptId: string;
  questionId: string;
}): Promise<AiResult<LearnerSafeWrongAnswerContract>> {
  if (!input.userId) {
    return fail("unauthenticated", "Authentication required.");
  }
  if (!isUuid(input.attemptId) || !isUuid(input.questionId)) {
    return fail(
      "invalid_input",
      "attemptId and questionId must be valid UUIDs."
    );
  }

  // Gate 1: released aggregate result (owner-only RPC). Unreleased → fail closed.
  const resultView = await getMyLearningAttemptResultView(
    input.supabase,
    input.attemptId
  );
  if (!resultView.ok) {
    return mapOwnerDeniedMessage(resultView.message);
  }
  if (resultView.data.visibility !== "available" || !resultView.data.result) {
    return fail(
      "permission_denied",
      "Results are not released for wrong-answer explanation."
    );
  }

  // Gate 2: owner attempt + learner-safe question stem.
  const attempt = await loadAssessmentAttempt(
    input.supabase,
    input.attemptId
  );
  if (!attempt.ok) {
    return mapOwnerDeniedMessage(attempt.message);
  }
  if (attempt.data.attempt_id !== input.attemptId) {
    return fail("permission_denied", "Attempt ownership could not be verified.");
  }

  const access = await assertLearningCourseAccess(
    input.supabase,
    attempt.data.course_id,
    input.userId
  );
  if (!access.ok) return access;

  const question = attempt.data.questions.find(
    (q) => q.question_id === input.questionId
  );
  if (!question) {
    return fail(
      "invalid_input",
      "Question is not part of this learner attempt."
    );
  }

  const questionContext = sanitizeQuestionContext(question.content);
  if (!questionContext) {
    return fail(
      "invalid_input",
      "Safe question context is unavailable."
    );
  }

  // Gate 3: released incorrect grade row for this question (no keys).
  const grade = await loadAssessmentGrade(input.supabase, input.attemptId);
  if (!grade.ok) {
    return mapOwnerDeniedMessage(grade.message);
  }
  const questionResult = grade.data.question_results.find(
    (r) => r.question_id === input.questionId
  );
  if (!questionResult) {
    return fail(
      "invalid_input",
      "Released question result is unavailable."
    );
  }
  if (questionResult.result_state !== "incorrect") {
    return fail(
      "invalid_input",
      "Only released incorrect answers can be explained."
    );
  }
  if (
    payloadContainsForbiddenWrongAnswerKeys(questionResult as unknown as Record<
      string,
      unknown
    >)
  ) {
    return fail(
      "safety_block",
      "Grade payload contained forbidden correctness material."
    );
  }

  // Gate 4: caller's own answer payload.
  const answers = await loadAssessmentAnswers(
    input.supabase,
    input.attemptId
  );
  if (!answers.ok) {
    return mapOwnerDeniedMessage(answers.message);
  }
  const answerRow = answers.data.answers.find(
    (a) => a.question_id === input.questionId
  );
  if (!answerRow) {
    return fail(
      "invalid_input",
      "Learner answer is unavailable for explanation."
    );
  }
  if (payloadContainsForbiddenWrongAnswerKeys(answerRow.answer_payload)) {
    return fail(
      "safety_block",
      "Answer payload contained forbidden correctness material."
    );
  }

  const aggregate = resultView.data.result;
  const contract: LearnerSafeWrongAnswerContract = {
    userId: input.userId,
    attemptId: attempt.data.attempt_id,
    activityId: attempt.data.activity_id,
    courseId: attempt.data.course_id,
    lessonId: attempt.data.lesson_id,
    questionId: question.question_id,
    questionType: question.question_type,
    questionPosition: question.position,
    questionContext,
    learnerAnswer: answerRow.answer_payload,
    releasedFeedback: {
      resultState: "incorrect",
      feedbackCode: questionResult.feedback_code,
      learnerFeedback: questionResult.learner_feedback,
      pointsPossible: questionResult.points_possible,
      pointsEarned: questionResult.points_earned,
    },
    aggregateResult: {
      scoreEarned: aggregate.score_earned,
      scoreMax: aggregate.score_max,
      percentage: aggregate.percentage,
      passed: aggregate.passed,
      scoredAt: aggregate.scored_at,
    },
    dataClassification: "confidential",
    containsAnswerKey: false,
    containsCorrectAnswer: false,
    mutatesProgress: false,
    mutatesGrades: false,
  };

  if (payloadContainsForbiddenWrongAnswerKeys(contract)) {
    return fail(
      "safety_block",
      "Wrong-answer contract failed safety scan."
    );
  }

  return { ok: true, data: contract };
}

/** Bounded text pack for the model — never includes keys or stored correct answers. */
export function buildWrongAnswerGroundingPack(
  contract: LearnerSafeWrongAnswerContract,
  lessonPack: string,
  maxChars = 12000
): string {
  const feedbackBits = [
    `resultState=${contract.releasedFeedback.resultState}`,
    `feedbackCode=${contract.releasedFeedback.feedbackCode}`,
    contract.releasedFeedback.learnerFeedback
      ? `learnerFeedback=${contract.releasedFeedback.learnerFeedback}`
      : null,
    contract.releasedFeedback.pointsPossible != null
      ? `pointsPossible=${contract.releasedFeedback.pointsPossible}`
      : null,
    contract.releasedFeedback.pointsEarned != null
      ? `pointsEarned=${contract.releasedFeedback.pointsEarned}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  const lines = [
    "Learner-safe wrong-answer contract (keys excluded):",
    `attemptId=${contract.attemptId}`,
    `questionId=${contract.questionId}`,
    `questionType=${contract.questionType}`,
    `questionPosition=${contract.questionPosition}`,
    `questionContext=${JSON.stringify(contract.questionContext)}`,
    `learnerAnswer=${JSON.stringify(contract.learnerAnswer)}`,
    `releasedFeedback=${feedbackBits}`,
    `aggregateResult=score ${contract.aggregateResult.scoreEarned}/${contract.aggregateResult.scoreMax} (${contract.aggregateResult.percentage}%)`,
    "",
    "Authorized published lesson material:",
    lessonPack,
    "",
    "Explain the learner's mistake using only this contract and lesson material.",
    "Do not invent or reveal a stored official solution or hidden grading material.",
    "Teach the concept; keep teen-safe; do not claim this is an official grade.",
  ];

  let pack = lines.join("\n");
  if (pack.length > maxChars) {
    pack = `${pack.slice(0, maxChars)}\n…[truncated for context limit]`;
  }
  return pack;
}
