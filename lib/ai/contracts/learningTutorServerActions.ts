/**
 * Learning AI Tutor Server Actions contracts — future UI entry types.
 *
 * Named actions only. No free-form capability/action strings.
 * UI may import these types + app/actions/learningTutor.
 */

import type { AiErrorCode } from "./types";
import type { LearningTutorIntegrationAction } from "./learningTutorIntegration";

export type LearningTutorServerActionLocaleInput = {
  locale?: string | null;
};

export type LearningTutorExplainLessonActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
  };

export type LearningTutorSummarizeLessonActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
  };

export type LearningTutorAnswerQuestionActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
    question: string;
    /** Optional: persist exchange after success (Thread Persistence Bridge). */
    threadId?: string;
  };

export type LearningTutorGeneratePracticeActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
  };

export type LearningTutorExplainWrongAnswerActionInput =
  LearningTutorServerActionLocaleInput & {
    attemptId: string;
    questionId: string;
  };

export type LearningTutorGiveHintActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
    focus: string;
    /** Optional: persist exchange after success (Thread Persistence Bridge). */
    threadId?: string;
  };

export type LearningTutorExplainAgainActionInput =
  LearningTutorServerActionLocaleInput & {
    lessonId: string;
    focus?: string;
    /** Optional: persist exchange after success (Thread Persistence Bridge). */
    threadId?: string;
  };

export type LearningTutorServerActionSuccess = {
  runId: string;
  action: LearningTutorIntegrationAction;
  result: Record<string, unknown>;
  labeledAiGenerated: true;
  officialCourseContent: false;
  mutatesProgress: false;
  mutatesGrades: false;
  retryable: false;
};

export type LearningTutorServerActionFailure = {
  runId: string | null;
  code: AiErrorCode;
  message: string;
  retryable: boolean;
  requiresAuth?: boolean;
};

export type LearningTutorServerActionResult =
  | { ok: true; data: LearningTutorServerActionSuccess }
  | { ok: false; error: LearningTutorServerActionFailure };
