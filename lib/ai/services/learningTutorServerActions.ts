/**
 * Learning AI Tutor Server Actions Foundation V1 — testable core.
 *
 * Named entrypoints only. Always executes through learningTutorIntegration.
 * Does not call the shared multi-domain service, gateway, providers, or
 * tutorRunner directly.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LearningTutorAnswerQuestionActionInput,
  LearningTutorExplainLessonActionInput,
  LearningTutorExplainWrongAnswerActionInput,
  LearningTutorGeneratePracticeActionInput,
  LearningTutorServerActionResult,
  LearningTutorSummarizeLessonActionInput,
} from "../contracts/learningTutorServerActions";
import type { LearningTutorIntegrationResult } from "../contracts/learningTutorIntegration";
import {
  runLearningTutorIntegration,
  type LearningTutorIntegrationDeps,
} from "./learningTutorIntegration";

const SURFACE = "learning.tutor.server_action";

/** Response keys that must never reach future UI clients. */
const STRIP_RESULT_KEYS = [
  "modelId",
  "promptVersion",
  "providerId",
  "provider",
] as const;

export type LearningTutorServerActionRuntime = {
  getUserId: () => Promise<string | null>;
  getSupabase: () => Promise<SupabaseClient>;
  /** Test-only. Never from client input. */
  forceStub?: boolean;
  /** Test seam — defaults to learningTutorIntegration.run */
  runIntegration?: (
    request: unknown,
    deps: LearningTutorIntegrationDeps
  ) => Promise<LearningTutorIntegrationResult>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function rejectExtraKeys(
  input: unknown,
  allowed: ReadonlySet<string>
): LearningTutorServerActionResult | null {
  const row = asRecord(input);
  if (!row) {
    return {
      ok: false,
      error: {
        runId: null,
        code: "invalid_input",
        message: "Request must be an object.",
        retryable: false,
      },
    };
  }
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        error: {
          runId: null,
          code: "invalid_input",
          message: "Request contains unsupported fields.",
          retryable: false,
        },
      };
    }
  }
  return null;
}

function sanitizeResultPayload(
  result: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...result };
  for (const key of STRIP_RESULT_KEYS) {
    delete out[key];
  }
  return out;
}

function mapIntegrationResult(
  integration: LearningTutorIntegrationResult
): LearningTutorServerActionResult {
  if (!integration.ok) {
    return {
      ok: false,
      error: {
        runId: integration.error.runId,
        code: integration.error.code,
        message: integration.error.message,
        retryable: integration.error.retryable,
        requiresAuth: integration.error.code === "unauthenticated",
      },
    };
  }

  return {
    ok: true,
    data: {
      runId: integration.data.runId,
      action: integration.data.action,
      result: sanitizeResultPayload(integration.data.result),
      labeledAiGenerated: true,
      officialCourseContent: false,
      mutatesProgress: false,
      mutatesGrades: false,
      retryable: false,
    },
  };
}

async function executeNamedIntegration(
  runtime: LearningTutorServerActionRuntime,
  request: Record<string, unknown>
): Promise<LearningTutorServerActionResult> {
  const userId = await runtime.getUserId();
  if (!userId) {
    return {
      ok: false,
      error: {
        runId: null,
        code: "unauthenticated",
        message: "Authentication required.",
        retryable: false,
        requiresAuth: true,
      },
    };
  }

  const supabase = await runtime.getSupabase();
  const run = runtime.runIntegration ?? runLearningTutorIntegration;
  const integration = await run(request, {
    supabase,
    userId,
    forceStub: runtime.forceStub,
  });
  return mapIntegrationResult(integration);
}

const LESSON_KEYS = new Set(["lessonId", "locale"]);
const ANSWER_KEYS = new Set(["lessonId", "question", "locale"]);
const WRONG_KEYS = new Set(["attemptId", "questionId", "locale"]);

export async function explainLessonLearningTutor(
  input: LearningTutorExplainLessonActionInput,
  runtime: LearningTutorServerActionRuntime
): Promise<LearningTutorServerActionResult> {
  const rejected = rejectExtraKeys(input, LESSON_KEYS);
  if (rejected) return rejected;
  return executeNamedIntegration(runtime, {
    action: "explain_lesson",
    lessonId: input.lessonId,
    locale: input.locale,
    surface: SURFACE,
  });
}

export async function summarizeLessonLearningTutor(
  input: LearningTutorSummarizeLessonActionInput,
  runtime: LearningTutorServerActionRuntime
): Promise<LearningTutorServerActionResult> {
  const rejected = rejectExtraKeys(input, LESSON_KEYS);
  if (rejected) return rejected;
  return executeNamedIntegration(runtime, {
    action: "summarize_lesson",
    lessonId: input.lessonId,
    locale: input.locale,
    surface: SURFACE,
  });
}

export async function answerQuestionLearningTutor(
  input: LearningTutorAnswerQuestionActionInput,
  runtime: LearningTutorServerActionRuntime
): Promise<LearningTutorServerActionResult> {
  const rejected = rejectExtraKeys(input, ANSWER_KEYS);
  if (rejected) return rejected;
  return executeNamedIntegration(runtime, {
    action: "answer_question",
    lessonId: input.lessonId,
    question: input.question,
    locale: input.locale,
    surface: SURFACE,
  });
}

export async function generatePracticeLearningTutor(
  input: LearningTutorGeneratePracticeActionInput,
  runtime: LearningTutorServerActionRuntime
): Promise<LearningTutorServerActionResult> {
  const rejected = rejectExtraKeys(input, LESSON_KEYS);
  if (rejected) return rejected;
  return executeNamedIntegration(runtime, {
    action: "generate_practice",
    lessonId: input.lessonId,
    locale: input.locale,
    surface: SURFACE,
  });
}

export async function explainWrongAnswerLearningTutor(
  input: LearningTutorExplainWrongAnswerActionInput,
  runtime: LearningTutorServerActionRuntime
): Promise<LearningTutorServerActionResult> {
  const rejected = rejectExtraKeys(input, WRONG_KEYS);
  if (rejected) return rejected;
  return executeNamedIntegration(runtime, {
    action: "explain_wrong_answer",
    attemptId: input.attemptId,
    questionId: input.questionId,
    locale: input.locale,
    surface: SURFACE,
  });
}
