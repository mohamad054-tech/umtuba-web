/**
 * Learning AI Tutor Integration contracts — future UI / server-action boundary.
 *
 * UI and Learning adapters may depend on these types + learningTutorIntegration.
 * They must not import gateway, providers, prompts, routers, or tools.
 *
 * Requests are action-discriminated unions (not free-form capability strings).
 */

import type { AiErrorCode } from "./types";
import type {
  LearningTutorAnswerResult,
  LearningTutorExplainResult,
  LearningTutorExplainWrongAnswerResult,
  LearningTutorPracticeResult,
  LearningTutorSummarizeResult,
} from "./learningTutor";

/** Explicit allowlisted Learning Tutor capabilities (internal mapping targets). */
export const LEARNING_TUTOR_INTEGRATION_CAPABILITIES = [
  "learning.tutor.explain_lesson",
  "learning.tutor.summarize_lesson",
  "learning.tutor.answer_question",
  "learning.tutor.generate_practice",
  "learning.tutor.explain_wrong_answer",
] as const;

export type LearningTutorIntegrationCapabilityId =
  (typeof LEARNING_TUTOR_INTEGRATION_CAPABILITIES)[number];

/** Public action names for the Learning Tutor integration boundary. */
export const LEARNING_TUTOR_INTEGRATION_ACTIONS = [
  "explain_lesson",
  "summarize_lesson",
  "answer_question",
  "generate_practice",
  "explain_wrong_answer",
] as const;

export type LearningTutorIntegrationAction =
  (typeof LEARNING_TUTOR_INTEGRATION_ACTIONS)[number];

type LearningTutorIntegrationCommon = {
  /** Optional locale preference only. */
  locale?: string | null;
  /** Telemetry / UX surface label (not an auth boundary). */
  surface?: string;
};

/**
 * Discriminated union: each action carries only its allowed input fields.
 * External callers never pass capability ids, models, providers, or prompts.
 */
export type LearningTutorIntegrationRequest =
  | ({
      action: "explain_lesson";
      lessonId: string;
    } & LearningTutorIntegrationCommon)
  | ({
      action: "summarize_lesson";
      lessonId: string;
    } & LearningTutorIntegrationCommon)
  | ({
      action: "answer_question";
      lessonId: string;
      question: string;
    } & LearningTutorIntegrationCommon)
  | ({
      action: "generate_practice";
      lessonId: string;
    } & LearningTutorIntegrationCommon)
  | ({
      action: "explain_wrong_answer";
      attemptId: string;
      questionId: string;
    } & LearningTutorIntegrationCommon);

export const LEARNING_TUTOR_ACTION_TO_CAPABILITY = {
  explain_lesson: "learning.tutor.explain_lesson",
  summarize_lesson: "learning.tutor.summarize_lesson",
  answer_question: "learning.tutor.answer_question",
  generate_practice: "learning.tutor.generate_practice",
  explain_wrong_answer: "learning.tutor.explain_wrong_answer",
} as const satisfies Record<
  LearningTutorIntegrationAction,
  LearningTutorIntegrationCapabilityId
>;

export type LearningTutorIntegrationSuccess = {
  runId: string;
  action: LearningTutorIntegrationAction;
  capability: LearningTutorIntegrationCapabilityId;
  result: Record<string, unknown>;
  labeledAiGenerated: true;
  officialCourseContent: false;
  mutatesProgress: false;
  mutatesGrades: false;
  retryable: false;
};

export type LearningTutorIntegrationFailure = {
  runId: string | null;
  code: AiErrorCode;
  /** Safe, learner-facing message — never a stack trace. */
  message: string;
  retryable: boolean;
};

export type LearningTutorIntegrationResult =
  | { ok: true; data: LearningTutorIntegrationSuccess }
  | { ok: false; error: LearningTutorIntegrationFailure };

export type LearningTutorIntegrationResultByAction = {
  explain_lesson: LearningTutorExplainResult;
  summarize_lesson: LearningTutorSummarizeResult;
  answer_question: LearningTutorAnswerResult;
  generate_practice: LearningTutorPracticeResult;
  explain_wrong_answer: LearningTutorExplainWrongAnswerResult;
};
