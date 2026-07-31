/**
 * Learning AI Tutor Backend Integration Foundation V1.
 *
 * Learning-only server boundary for future UI / server actions.
 * Parses an action-discriminated request, validates inputs at runtime,
 * maps action → allowlisted capability, then executes exclusively via
 * aiService.runCapability (does not re-implement auth, tutorRunner, prompts,
 * safety, wrong-answer contracts, or provider selection).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AI_RETRYABLE_CODES,
  type AiServiceResult,
} from "../contracts/public";
import type { AiErrorCode } from "../contracts/types";
import {
  LEARNING_TUTOR_ACTION_TO_CAPABILITY,
  LEARNING_TUTOR_INTEGRATION_ACTIONS,
  LEARNING_TUTOR_INTEGRATION_CAPABILITIES,
  type LearningTutorIntegrationAction,
  type LearningTutorIntegrationCapabilityId,
  type LearningTutorIntegrationRequest,
  type LearningTutorIntegrationResult,
} from "../contracts/learningTutorIntegration";
import { LEARNING_TUTOR_CAPABILITIES } from "../capabilities/learning/tutorRunner";
import {
  mapLearningTutorActionToMessageKind,
  persistLearningTutorExchange,
  serializeAssistantContentForPersistence,
  serializeLearnerContentForPersistence,
  validateThreadForPersistence,
  type LearningTutorPersistableAction,
} from "../capabilities/learning/threadPersistenceBridge";
import { aiService } from "./aiService";

export type LearningTutorIntegrationDeps = {
  supabase: SupabaseClient;
  userId: string | null;
  /**
   * Test-only stub force. Injected by trusted server/test code only —
   * never accepted from a client request body.
   */
  forceStub?: boolean;
};

const ACTION_SET = new Set<string>(LEARNING_TUTOR_INTEGRATION_ACTIONS);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Shared optional keys allowed on every action. */
const COMMON_OPTIONAL_KEYS = new Set(["locale", "surface"]);

/** Allowed keys per action (fail-closed on any other key). */
const ACTION_ALLOWED_KEYS: Record<
  LearningTutorIntegrationAction,
  ReadonlySet<string>
> = {
  explain_lesson: new Set(["action", "lessonId", ...COMMON_OPTIONAL_KEYS]),
  summarize_lesson: new Set(["action", "lessonId", ...COMMON_OPTIONAL_KEYS]),
  answer_question: new Set([
    "action",
    "lessonId",
    "question",
    "threadId",
    ...COMMON_OPTIONAL_KEYS,
  ]),
  generate_practice: new Set(["action", "lessonId", ...COMMON_OPTIONAL_KEYS]),
  explain_wrong_answer: new Set([
    "action",
    "attemptId",
    "questionId",
    ...COMMON_OPTIONAL_KEYS,
  ]),
  give_hint: new Set([
    "action",
    "lessonId",
    "focus",
    "threadId",
    ...COMMON_OPTIONAL_KEYS,
  ]),
  explain_again: new Set([
    "action",
    "lessonId",
    "focus",
    "threadId",
    ...COMMON_OPTIONAL_KEYS,
  ]),
};

/**
 * Fields that must never appear on an untrusted request body.
 * Kept in the service module (not the public contract file) so UI-facing
 * contracts stay free of secret/provider token names.
 */
const FORBIDDEN_REQUEST_KEYS = new Set([
  "model",
  "modelId",
  "provider",
  "providerId",
  "prompt",
  "promptId",
  "systemInstructions",
  "systemPrompt",
  "apiKey",
  "OPENAI_API_KEY",
  "preferredModelHint",
  "forceStub",
  "tools",
  "allowedTools",
  "allowedToolIds",
  "_test",
  "capability",
  "capabilityId",
  "productDomain",
  "version",
  "capabilityVersion",
  "promptVersion",
  "safety",
  "safetyConfig",
  "metadata",
  "internal",
]);

const SAFE_ERROR_MESSAGES: Partial<Record<AiErrorCode, string>> = {
  unauthenticated: "Authentication required.",
  permission_denied: "You are not allowed to use this Learning Tutor action.",
  invalid_input: "The Learning Tutor request is invalid.",
  safety_block: "Request blocked by Learning safety policy.",
  rate_limited: "Too many requests. Please try again later.",
  timeout: "The Learning Tutor request timed out.",
  provider_unavailable: "Learning Tutor is temporarily unavailable.",
  provider_error: "Learning Tutor could not complete this request.",
  no_provider_configured: "Learning Tutor is temporarily unavailable.",
  invalid_structured_output: "Learning Tutor could not complete this request.",
};

function fail(
  code: AiErrorCode,
  message?: string,
  runId: string | null = null
): LearningTutorIntegrationResult {
  return {
    ok: false,
    error: {
      runId,
      code,
      message: SAFE_ERROR_MESSAGES[code] ?? message ?? "Request failed.",
      retryable: AI_RETRYABLE_CODES.has(code),
    },
  };
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isAction(value: unknown): value is LearningTutorIntegrationAction {
  return typeof value === "string" && ACTION_SET.has(value);
}

function readOptionalCommon(row: Record<string, unknown>): {
  ok: true;
  locale?: string | null;
  surface?: string;
} | {
  ok: false;
  code: AiErrorCode;
  message: string;
} {
  let locale: string | null | undefined;
  let surface: string | undefined;

  if ("locale" in row && row.locale != null) {
    if (typeof row.locale !== "string") {
      return {
        ok: false,
        code: "invalid_input",
        message: "locale must be a string.",
      };
    }
    locale = row.locale.trim() || null;
  }
  if ("surface" in row && row.surface != null) {
    if (typeof row.surface !== "string") {
      return {
        ok: false,
        code: "invalid_input",
        message: "surface must be a string.",
      };
    }
    surface = row.surface.trim().slice(0, 120) || undefined;
  }
  return { ok: true, locale, surface };
}

function readOptionalThreadId(row: Record<string, unknown>):
  | { ok: true; threadId?: string }
  | { ok: false; code: AiErrorCode; message: string } {
  if (!("threadId" in row) || row.threadId == null) {
    return { ok: true };
  }
  if (typeof row.threadId !== "string" || !isUuid(row.threadId.trim())) {
    return {
      ok: false,
      code: "invalid_input",
      message: "threadId must be a valid UUID.",
    };
  }
  return { ok: true, threadId: row.threadId.trim() };
}

/**
 * Runtime parse + validation of an untrusted request into the action union.
 * Unknown actions, unknown keys, and forbidden control fields fail closed.
 */
export function parseLearningTutorIntegrationRequest(
  raw: unknown
):
  | { ok: true; data: LearningTutorIntegrationRequest }
  | { ok: false; code: AiErrorCode; message: string } {
  const row = asRecord(raw);
  if (!row) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Request must be an object.",
    };
  }

  for (const key of Object.keys(row)) {
    if (FORBIDDEN_REQUEST_KEYS.has(key)) {
      return {
        ok: false,
        code: "invalid_input",
        message: "Request contains forbidden fields.",
      };
    }
  }

  if (!isAction(row.action)) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Unknown Learning Tutor action.",
    };
  }

  const allowed = ACTION_ALLOWED_KEYS[row.action];
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        code: "invalid_input",
        message: "Request contains unsupported fields for this action.",
      };
    }
  }

  const common = readOptionalCommon(row);
  if (!common.ok) return common;

  switch (row.action) {
    case "explain_lesson":
    case "summarize_lesson":
    case "generate_practice": {
      if (typeof row.lessonId !== "string" || !isUuid(row.lessonId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "lessonId is required and must be a valid UUID.",
        };
      }
      return {
        ok: true,
        data: {
          action: row.action,
          lessonId: row.lessonId.trim(),
          locale: common.locale,
          surface: common.surface,
        },
      };
    }
    case "answer_question": {
      if (typeof row.lessonId !== "string" || !isUuid(row.lessonId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "lessonId is required and must be a valid UUID.",
        };
      }
      if (typeof row.question !== "string" || !row.question.trim()) {
        return {
          ok: false,
          code: "invalid_input",
          message: "question is required.",
        };
      }
      const threadId = readOptionalThreadId(row);
      if (threadId && !threadId.ok) return threadId;
      return {
        ok: true,
        data: {
          action: "answer_question",
          lessonId: row.lessonId.trim(),
          question: row.question.trim(),
          threadId: threadId && threadId.ok ? threadId.threadId : undefined,
          locale: common.locale,
          surface: common.surface,
        },
      };
    }
    case "explain_wrong_answer": {
      if (typeof row.attemptId !== "string" || !isUuid(row.attemptId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "attemptId is required and must be a valid UUID.",
        };
      }
      if (typeof row.questionId !== "string" || !isUuid(row.questionId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "questionId is required and must be a valid UUID.",
        };
      }
      return {
        ok: true,
        data: {
          action: "explain_wrong_answer",
          attemptId: row.attemptId.trim(),
          questionId: row.questionId.trim(),
          locale: common.locale,
          surface: common.surface,
        },
      };
    }
    case "give_hint": {
      if (typeof row.lessonId !== "string" || !isUuid(row.lessonId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "lessonId is required and must be a valid UUID.",
        };
      }
      if (typeof row.focus !== "string" || !row.focus.trim()) {
        return {
          ok: false,
          code: "invalid_input",
          message: "focus is required.",
        };
      }
      const threadId = readOptionalThreadId(row);
      if (threadId && !threadId.ok) return threadId;
      return {
        ok: true,
        data: {
          action: "give_hint",
          lessonId: row.lessonId.trim(),
          focus: row.focus.trim(),
          threadId: threadId && threadId.ok ? threadId.threadId : undefined,
          locale: common.locale,
          surface: common.surface,
        },
      };
    }
    case "explain_again": {
      if (typeof row.lessonId !== "string" || !isUuid(row.lessonId.trim())) {
        return {
          ok: false,
          code: "invalid_input",
          message: "lessonId is required and must be a valid UUID.",
        };
      }
      let focus: string | undefined;
      if ("focus" in row && row.focus != null) {
        if (typeof row.focus !== "string" || !row.focus.trim()) {
          return {
            ok: false,
            code: "invalid_input",
            message: "focus must be a non-empty string when provided.",
          };
        }
        focus = row.focus.trim();
      }
      const threadId = readOptionalThreadId(row);
      if (threadId && !threadId.ok) return threadId;
      return {
        ok: true,
        data: {
          action: "explain_again",
          lessonId: row.lessonId.trim(),
          focus,
          threadId: threadId && threadId.ok ? threadId.threadId : undefined,
          locale: common.locale,
          surface: common.surface,
        },
      };
    }
    default: {
      return {
        ok: false,
        code: "invalid_input",
        message: "Unknown Learning Tutor action.",
      };
    }
  }
}

export function mapLearningTutorActionToCapability(
  action: LearningTutorIntegrationAction
): LearningTutorIntegrationCapabilityId {
  return LEARNING_TUTOR_ACTION_TO_CAPABILITY[action];
}

function mapAiServiceResult(
  action: LearningTutorIntegrationAction,
  capability: LearningTutorIntegrationCapabilityId,
  result: AiServiceResult
): LearningTutorIntegrationResult {
  if (!result.ok) {
    return fail(result.error.code, result.error.message, result.error.runId);
  }

  return {
    ok: true,
    data: {
      runId: result.data.runId,
      action,
      capability,
      result: result.data.result ?? {},
      labeledAiGenerated: true,
      officialCourseContent: false,
      mutatesProgress: false,
      mutatesGrades: false,
      retryable: false,
    },
  };
}

/**
 * Canonical Learning Tutor integration entry for future UI wiring.
 */
export async function runLearningTutorIntegration(
  rawRequest: unknown,
  deps: LearningTutorIntegrationDeps
): Promise<LearningTutorIntegrationResult> {
  if (!deps.userId) {
    return fail("unauthenticated");
  }

  // Drift guard: capability allowlist must match tutor runner.
  const runnerSet = new Set<string>(LEARNING_TUTOR_CAPABILITIES);
  if (
    LEARNING_TUTOR_INTEGRATION_CAPABILITIES.length !==
      LEARNING_TUTOR_CAPABILITIES.length ||
    LEARNING_TUTOR_INTEGRATION_CAPABILITIES.some((id) => !runnerSet.has(id))
  ) {
    return fail("provider_error");
  }

  const parsed = parseLearningTutorIntegrationRequest(rawRequest);
  if (!parsed.ok) {
    return fail(parsed.code, parsed.message);
  }

  const request = parsed.data;
  const capability = mapLearningTutorActionToCapability(request.action);
  const surface = request.surface?.trim() || "learning.tutor.integration";

  const threadId =
    "threadId" in request && typeof request.threadId === "string"
      ? request.threadId
      : undefined;

  let persistKind: ReturnType<typeof mapLearningTutorActionToMessageKind> =
    null;
  let persistAction: LearningTutorPersistableAction | null = null;

  if (threadId) {
    persistKind = mapLearningTutorActionToMessageKind(request.action);
    if (!persistKind) {
      return fail(
        "invalid_input",
        "This Learning Tutor action cannot be persisted to a thread."
      );
    }
    if (!("lessonId" in request) || typeof request.lessonId !== "string") {
      return fail(
        "invalid_input",
        "lessonId is required to persist a Tutor thread exchange."
      );
    }
    persistAction = request.action as LearningTutorPersistableAction;
    const threadCheck = await validateThreadForPersistence(deps.supabase, {
      threadId,
      lessonId: request.lessonId,
    });
    if (!threadCheck.ok) {
      return fail(threadCheck.error.code, threadCheck.error.message);
    }
  }

  const input =
    request.action === "explain_wrong_answer"
      ? {
          attemptId: request.attemptId,
          questionId: request.questionId,
        }
      : request.action === "answer_question"
        ? {
            lessonId: request.lessonId,
            question: request.question,
          }
        : request.action === "give_hint"
          ? {
              lessonId: request.lessonId,
              focus: request.focus,
              question: request.focus,
            }
          : request.action === "explain_again"
            ? {
                lessonId: request.lessonId,
                focus: request.focus,
                question: request.focus,
              }
            : {
                lessonId: request.lessonId,
              };

  // Execute only through the shared AI service — never call tutorRunner directly.
  const serviceResult = await aiService.runCapability(
    {
      capabilityId: capability,
      input,
      context: {
        productDomain: "learning",
        surface,
        lessonId:
          request.action === "explain_wrong_answer"
            ? undefined
            : request.lessonId,
        locale: request.locale ?? undefined,
      },
    },
    {
      supabase: deps.supabase,
      userId: deps.userId,
      forceStub: deps.forceStub,
    }
  );

  const mapped = mapAiServiceResult(request.action, capability, serviceResult);
  if (!mapped.ok || !threadId || !persistKind || !persistAction) {
    return mapped;
  }

  const learnerText = serializeLearnerContentForPersistence(persistAction, {
    question:
      request.action === "answer_question" ? request.question : undefined,
    focus:
      request.action === "give_hint" || request.action === "explain_again"
        ? request.focus
        : undefined,
  });
  const assistantText = serializeAssistantContentForPersistence(
    persistAction,
    mapped.data.result
  );
  if (!learnerText || !assistantText) {
    return fail(
      "invalid_input",
      "Could not prepare tutor conversation for persistence."
    );
  }

  const persisted = await persistLearningTutorExchange(deps.supabase, {
    threadId,
    kind: persistKind,
    userContent: learnerText,
    assistantContent: assistantText,
  });
  if (!persisted.ok) {
    return fail(persisted.error.code, persisted.error.message, mapped.data.runId);
  }

  return mapped;
}

export const learningTutorIntegration = {
  run: runLearningTutorIntegration,
  actions: LEARNING_TUTOR_INTEGRATION_ACTIONS,
  capabilities: LEARNING_TUTOR_INTEGRATION_CAPABILITIES,
  mapActionToCapability: mapLearningTutorActionToCapability,
};
