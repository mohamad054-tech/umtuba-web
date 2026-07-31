/**
 * Learning AI Tutor — Thread Persistence Bridge V1.
 *
 * Maps allowlisted Core actions → DB message_kind, validates thread/lesson,
 * serializes bounded learner-facing text, and persists via
 * append_my_learning_ai_tutor_exchange (never stub append).
 *
 * Does not invent tables. Does not use elevated DB credentials from app code.
 * Does not mutate grades.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiErrorCode } from "../../contracts/types";
import type { LearningTutorIntegrationAction } from "../../contracts/learningTutorIntegration";
import {
  LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX,
  appendMyAiTutorExchange,
  getMyAiTutorThread,
  isAiTutorUuid,
  resumeMyAiTutorThread,
  type LearningAiTutorExchangeKind,
} from "../../../learning/aiTutorFoundation";

export const LEARNING_TUTOR_PERSISTABLE_ACTIONS = [
  "answer_question",
  "explain_again",
  "give_hint",
] as const;

export type LearningTutorPersistableAction =
  (typeof LEARNING_TUTOR_PERSISTABLE_ACTIONS)[number];

export const LEARNING_TUTOR_ACTION_TO_MESSAGE_KIND = {
  answer_question: "ask_question",
  explain_again: "explain_again",
  give_hint: "hint",
} as const satisfies Record<
  LearningTutorPersistableAction,
  LearningAiTutorExchangeKind
>;

const EXCLUDED_ASSISTANT_KEYS = new Set([
  "sourceReferences",
  "groundingStatus",
  "limitations",
  "confidence",
  "labeledAiGenerated",
  "officialCourseContent",
  "revealsAnswerKey",
  "mutatesProgress",
  "mutatesGrades",
  "officialAssessment",
  "modelId",
  "promptVersion",
  "providerId",
  "provider",
  "runId",
  "capability",
  "capabilityId",
  "prompt",
  "systemPrompt",
  "systemInstructions",
  "raw",
  "trace",
  "usage",
  "tokens",
  "grounding",
  "groundingPack",
  "hidden",
  "internal",
  "metadata",
]);

export type ThreadPersistenceBridgeError = {
  code: AiErrorCode;
  message: string;
};

export type ThreadPersistenceBridgeResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: ThreadPersistenceBridgeError };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clampContent(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX) {
    return trimmed;
  }
  return trimmed.slice(0, LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX);
}

/**
 * Encode a plain object as JSON that always stays within the exchange content
 * bound. Never mid-slices JSON (which would produce invalid transcripts).
 * Shrinks/drops secondary fields first; fail-closed with null if it cannot fit.
 */
export function serializeJsonObjectWithinLimit(
  value: Record<string, unknown>,
  maxChars: number = LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX
): string | null {
  if (maxChars < 2) return null;

  const current: Record<string, unknown> = { ...value };

  const encode = (): string | null => {
    if (Object.keys(current).length === 0) return null;
    const json = JSON.stringify(current);
    if (!json || json === "{}") return null;
    return json;
  };

  let json = encode();
  if (!json) return null;
  if (json.length <= maxChars) return json;

  // Drop optional / secondary keys before shrinking primary text.
  const dropOrder = [
    "checkUnderstanding",
    "keyPoints",
    "analogy",
    "title",
    "focusRestated",
    "hintLevel",
    "nextStep",
  ] as const;
  for (const key of dropOrder) {
    if (!(key in current)) continue;
    delete current[key];
    json = encode();
    if (!json) return null;
    if (json.length <= maxChars) return json;
  }

  // Shrink remaining string fields until the payload fits.
  for (let guard = 0; guard < 64; guard += 1) {
    if (!json || json.length <= maxChars) break;
    const stringKeys = Object.keys(current).filter(
      (k) => typeof current[k] === "string" && (current[k] as string).length > 1
    );
    if (stringKeys.length === 0) break;

    const overflow = json.length - maxChars;
    const perField = Math.max(1, Math.ceil(overflow / stringKeys.length));
    for (const key of stringKeys) {
      const text = current[key] as string;
      current[key] = text.slice(0, Math.max(1, text.length - perField));
    }
    json = encode();
    if (!json) return null;
  }

  if (!json || json.length > maxChars) return null;

  try {
    JSON.parse(json);
  } catch {
    return null;
  }
  return json;
}

export function isLearningTutorPersistableAction(
  action: LearningTutorIntegrationAction
): action is LearningTutorPersistableAction {
  return (LEARNING_TUTOR_PERSISTABLE_ACTIONS as readonly string[]).includes(
    action
  );
}

/**
 * Fail-closed mapping. Unknown / unsupported actions return null (do not guess).
 */
export function mapLearningTutorActionToMessageKind(
  action: string
): LearningAiTutorExchangeKind | null {
  if (
    !(LEARNING_TUTOR_PERSISTABLE_ACTIONS as readonly string[]).includes(action)
  ) {
    return null;
  }
  return LEARNING_TUTOR_ACTION_TO_MESSAGE_KIND[
    action as LearningTutorPersistableAction
  ];
}

/**
 * Bounded learner-facing request text for the user message row.
 */
export function serializeLearnerContentForPersistence(
  action: LearningTutorPersistableAction,
  request: {
    question?: string;
    focus?: string;
  }
): string | null {
  if (action === "answer_question") {
    const q = request.question?.trim() ?? "";
    return q ? clampContent(q) : null;
  }
  if (action === "give_hint") {
    const f = request.focus?.trim() ?? "";
    return f ? clampContent(f) : null;
  }
  // explain_again
  const focus = request.focus?.trim();
  if (focus) return clampContent(focus);
  return clampContent("Please explain this lesson again in a simpler way.");
}

/**
 * Serialize only learner-facing assistant fields. Never grounding packs,
 * provider routing, or internal flags.
 */
export function serializeAssistantContentForPersistence(
  action: LearningTutorPersistableAction,
  result: Record<string, unknown>
): string | null {
  const clean: Record<string, unknown> = {};

  if (action === "answer_question") {
    if (typeof result.answer === "string" && result.answer.trim()) {
      clean.answer = result.answer.trim();
    }
  } else if (action === "give_hint") {
    for (const key of ["hint", "hintLevel", "focusRestated", "nextStep"] as const) {
      const v = result[key];
      if (typeof v === "string" && v.trim()) clean[key] = v.trim();
    }
  } else if (action === "explain_again") {
    if (typeof result.title === "string" && result.title.trim()) {
      clean.title = result.title.trim();
    }
    if (
      typeof result.simplerExplanation === "string" &&
      result.simplerExplanation.trim()
    ) {
      clean.simplerExplanation = result.simplerExplanation.trim();
    }
    if (Array.isArray(result.keyPoints)) {
      clean.keyPoints = result.keyPoints
        .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
        .map((x) => x.trim())
        .slice(0, 20);
    }
    if (typeof result.analogy === "string" && result.analogy.trim()) {
      clean.analogy = result.analogy.trim();
    }
    if (Array.isArray(result.checkUnderstanding)) {
      clean.checkUnderstanding = result.checkUnderstanding
        .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
        .map((x) => x.trim())
        .slice(0, 10);
    }
  }

  // Defense-in-depth: strip any excluded keys that slipped in.
  for (const key of Object.keys(clean)) {
    if (EXCLUDED_ASSISTANT_KEYS.has(key)) delete clean[key];
  }

  if (Object.keys(clean).length === 0) return null;

  // Structured oversize serialization: keep valid JSON within the DB bound.
  // Never blindly clamp JSON mid-string (invalid transcript on resume).
  return serializeJsonObjectWithinLimit(clean);
}

/**
 * Load lean thread metadata (no messages) and verify ownership + lesson match.
 * Ownership is enforced inside get_my_learning_ai_tutor_thread.
 */
export async function validateThreadForPersistence(
  supabase: SupabaseClient,
  input: { threadId: string; lessonId: string }
): Promise<ThreadPersistenceBridgeResult> {
  if (!isAiTutorUuid(input.threadId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "threadId is required and must be a valid UUID.",
      },
    };
  }
  if (!isAiTutorUuid(input.lessonId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "lessonId is required and must be a valid UUID.",
      },
    };
  }

  const loaded = await getMyAiTutorThread(supabase, input.threadId);
  if (!loaded.ok) {
    const msg = loaded.message.toLowerCase();
    if (msg.includes("not allowed") || msg.includes("entitled")) {
      return {
        ok: false,
        error: {
          code: "permission_denied",
          message: "You are not allowed to use this Learning Tutor thread.",
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "permission_denied",
        message: "Tutor thread is unavailable or not owned by you.",
      },
    };
  }

  const thread = asRecord(loaded.data);
  if (!thread) {
    return {
      ok: false,
      error: {
        code: "permission_denied",
        message: "Tutor thread is unavailable or not owned by you.",
      },
    };
  }

  const threadLesson =
    typeof thread.lesson_id === "string" ? thread.lesson_id : null;
  if (!threadLesson || threadLesson !== input.lessonId) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "Tutor thread does not match this lesson.",
      },
    };
  }

  return { ok: true, data: thread };
}

export async function persistLearningTutorExchange(
  supabase: SupabaseClient,
  input: {
    threadId: string;
    lessonId: string;
    kind: LearningAiTutorExchangeKind;
    userContent: string;
    assistantContent: string;
  }
): Promise<ThreadPersistenceBridgeResult> {
  if (!isAiTutorUuid(input.threadId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "threadId is required and must be a valid UUID.",
      },
    };
  }
  if (!isAiTutorUuid(input.lessonId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "lessonId is required and must be a valid UUID.",
      },
    };
  }

  const userContent = clampContent(input.userContent);
  const assistantContent = clampContent(input.assistantContent);
  if (!userContent || !assistantContent) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "Persisted tutor content must be non-empty.",
      },
    };
  }

  const result = await appendMyAiTutorExchange(supabase, {
    threadId: input.threadId,
    lessonId: input.lessonId,
    kind: input.kind,
    userContent,
    assistantContent,
  });

  if (!result.ok) {
    const lower = result.message.toLowerCase();
    if (
      lower.includes("authentication required") ||
      lower.includes("not allowed") ||
      lower.includes("entitled")
    ) {
      return {
        ok: false,
        error: {
          code: "permission_denied",
          message: "You are not allowed to save this Learning Tutor exchange.",
        },
      };
    }
    if (
      lower.includes("lesson mismatch") ||
      lower.includes("does not match this lesson")
    ) {
      return {
        ok: false,
        error: {
          code: "invalid_input",
          message: "Tutor thread does not match this lesson.",
        },
      };
    }
    if (lower.includes("not found") || lower.includes("lesson is invalid")) {
      return {
        ok: false,
        error: {
          code: "permission_denied",
          message: "Tutor thread is unavailable or not owned by you.",
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "provider_error",
        message: "Could not save the Learning Tutor conversation.",
      },
    };
  }

  return { ok: true, data: result.data };
}

/**
 * Resume a lesson-bound tutor thread and load bounded exchange history.
 * Fail-closed: ownership, entitlement, exact course + lesson match (SQL).
 */
export async function resumeLearningTutorThread(
  supabase: SupabaseClient,
  input: {
    threadId: string;
    courseId: string;
    lessonId: string;
    limit?: number | null;
  }
): Promise<ThreadPersistenceBridgeResult> {
  if (!isAiTutorUuid(input.threadId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "threadId is required and must be a valid UUID.",
      },
    };
  }
  if (!isAiTutorUuid(input.courseId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "courseId is required and must be a valid UUID.",
      },
    };
  }
  if (!isAiTutorUuid(input.lessonId)) {
    return {
      ok: false,
      error: {
        code: "invalid_input",
        message: "lessonId is required and must be a valid UUID.",
      },
    };
  }

  const result = await resumeMyAiTutorThread(supabase, {
    threadId: input.threadId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    limit: input.limit,
  });

  if (!result.ok) {
    const lower = result.message.toLowerCase();
    if (
      lower.includes("authentication required") ||
      lower.includes("not allowed") ||
      lower.includes("entitled")
    ) {
      return {
        ok: false,
        error: {
          code: "permission_denied",
          message: "You are not allowed to resume this Learning Tutor thread.",
        },
      };
    }
    if (
      lower.includes("lesson mismatch") ||
      lower.includes("course mismatch") ||
      lower.includes("does not match this lesson")
    ) {
      return {
        ok: false,
        error: {
          code: "invalid_input",
          message: "Tutor thread does not match this lesson or course.",
        },
      };
    }
    if (
      lower.includes("not found") ||
      lower.includes("lesson is invalid") ||
      lower.includes("unavailable or invalid")
    ) {
      return {
        ok: false,
        error: {
          code: "permission_denied",
          message: "Tutor thread is unavailable or not owned by you.",
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "provider_error",
        message: "Could not resume the Learning Tutor conversation.",
      },
    };
  }

  return { ok: true, data: result.data };
}
