/**
 * Learning AI Tutor — Learner UI Integration helpers (V1).
 *
 * Pure/orchestration helpers for wiring the lesson AI Tutor page to the
 * official lifecycle + server-action contracts. No provider calls here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ensureMyAiTutorActiveThread,
  isAiTutorUuid,
  resumeMyAiTutorThread,
  sanitizeAiTutorError,
} from "./aiTutorFoundation";

export const AI_TUTOR_LEARNER_CAPABILITIES = [
  "ask_question",
  "explain_lesson",
  "summarize_lesson",
  "generate_practice",
  "give_hint",
  "explain_again",
  "explain_wrong_answer",
] as const;

export type AiTutorLearnerCapabilityId =
  (typeof AI_TUTOR_LEARNER_CAPABILITIES)[number];

/** Actions that may pass threadId (persistence bridge allowlist). */
export const AI_TUTOR_PERSISTABLE_UI_CAPABILITIES = [
  "ask_question",
  "give_hint",
  "explain_again",
] as const;

export type AiTutorPersistableUiCapabilityId =
  (typeof AI_TUTOR_PERSISTABLE_UI_CAPABILITIES)[number];

export type AiTutorWrongAnswerContext = {
  attemptId: string;
  questionId: string;
};

export type AiTutorLearnerMessageView = {
  id: string;
  role: string;
  kind: string;
  content: string;
};

export type AiTutorLearnerSessionOk = {
  ok: true;
  threadId: string;
  courseId: string;
  lessonId: string;
  created: boolean;
  lifecycleStatus: string | null;
  messages: AiTutorLearnerMessageView[];
  emptyHistory: boolean;
};

export type AiTutorLearnerSessionErr = {
  ok: false;
  code:
    | "invalid_ids"
    | "ensure_failed"
    | "resume_failed"
    | "access_denied"
    | "missing_lesson";
  message: string;
};

export type AiTutorLearnerSessionResult =
  | AiTutorLearnerSessionOk
  | AiTutorLearnerSessionErr;

export type AiTutorLearnerSessionDeps = {
  supabase: SupabaseClient;
  ensureThread?: typeof ensureMyAiTutorActiveThread;
  resumeThread?: typeof resumeMyAiTutorThread;
};

const EXCLUDED_DISPLAY_KEYS = new Set([
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseWrongAnswerContext(input: {
  attemptId?: string | null;
  questionId?: string | null;
}): AiTutorWrongAnswerContext | null {
  const attemptId = (input.attemptId ?? "").trim();
  const questionId = (input.questionId ?? "").trim();
  if (!attemptId || !questionId) return null;
  if (!isAiTutorUuid(attemptId) || !isAiTutorUuid(questionId)) return null;
  return { attemptId, questionId };
}

export function capabilityPersistsToThread(
  capability: AiTutorLearnerCapabilityId
): capability is AiTutorPersistableUiCapabilityId {
  return (AI_TUTOR_PERSISTABLE_UI_CAPABILITIES as readonly string[]).includes(
    capability
  );
}

export function resolveAvailableCapabilities(input: {
  wrongAnswer: AiTutorWrongAnswerContext | null;
}): {
  available: AiTutorLearnerCapabilityId[];
  deferred: Array<{ id: AiTutorLearnerCapabilityId; reason: string }>;
} {
  const available: AiTutorLearnerCapabilityId[] = [
    "ask_question",
    "explain_lesson",
    "summarize_lesson",
    "generate_practice",
    "give_hint",
    "explain_again",
  ];
  const deferred: Array<{ id: AiTutorLearnerCapabilityId; reason: string }> =
    [];

  if (input.wrongAnswer) {
    available.push("explain_wrong_answer");
  } else {
    deferred.push({
      id: "explain_wrong_answer",
      reason:
        "attemptId and questionId are not safely available on this lesson path.",
    });
  }

  return { available, deferred };
}

export function isCapabilityEnabled(
  capability: AiTutorLearnerCapabilityId,
  available: readonly AiTutorLearnerCapabilityId[]
): boolean {
  return available.includes(capability);
}

/**
 * Stable key for in-flight / duplicate submit guards (client).
 */
export function buildTutorSubmitKey(
  capability: AiTutorLearnerCapabilityId,
  payload: {
    lessonId: string;
    threadId: string;
    question?: string;
    focus?: string;
    attemptId?: string;
    questionId?: string;
  }
): string {
  return [
    capability,
    payload.lessonId,
    payload.threadId,
    (payload.question ?? "").trim(),
    (payload.focus ?? "").trim(),
    payload.attemptId ?? "",
    payload.questionId ?? "",
  ].join("|");
}

export function shouldBlockDuplicateSubmit(input: {
  inFlight: boolean;
  lastAcceptedKey: string | null;
  nextKey: string;
}): boolean {
  if (input.inFlight) return true;
  if (input.lastAcceptedKey != null && input.lastAcceptedKey === input.nextKey) {
    return true;
  }
  return false;
}

function pushLine(lines: string[], label: string, value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    lines.push(`${label}: ${value.trim()}`);
    return;
  }
  if (Array.isArray(value)) {
    const items = value
      .filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
      .map((x) => x.trim());
    if (items.length === 0) return;
    lines.push(`${label}:`);
    for (const item of items) lines.push(`- ${item}`);
  }
}

export function formatTutorResultForDisplay(
  result: Record<string, unknown>
): string {
  const lines: string[] = [];

  pushLine(lines, "Title", result.title);
  pushLine(lines, "Explanation", result.explanation);
  pushLine(lines, "Answer", result.answer);
  pushLine(lines, "Simpler explanation", result.simplerExplanation);
  pushLine(lines, "Hint", result.hint);
  pushLine(lines, "Hint level", result.hintLevel);
  pushLine(lines, "Focus", result.focusRestated);
  pushLine(lines, "Next step", result.nextStep);
  pushLine(lines, "Misconception", result.misconception);
  pushLine(lines, "Better approach", result.betterApproach);
  pushLine(lines, "Practice hint", result.practiceHint);
  pushLine(lines, "Analogy", result.analogy);
  pushLine(lines, "Suggested next step", result.suggestedNextStep);
  pushLine(lines, "Key points", result.keyPoints);
  pushLine(lines, "Key ideas", result.keyIdeas);
  pushLine(lines, "Definitions", result.definitions);
  pushLine(lines, "Main examples", result.mainExamples);
  pushLine(lines, "Review points", result.reviewPoints);
  pushLine(lines, "Examples", result.examples);
  pushLine(lines, "Check understanding", result.checkUnderstanding);

  if (Array.isArray(result.items)) {
    const practiceLines: string[] = [];
    result.items.forEach((item, index) => {
      const row = asRecord(item);
      if (!row) return;
      const prompt =
        (typeof row.prompt === "string" && row.prompt.trim()) ||
        (typeof row.question === "string" && row.question.trim()) ||
        (typeof row.text === "string" && row.text.trim()) ||
        "";
      if (!prompt) return;
      practiceLines.push(`${index + 1}. ${prompt}`);
    });
    if (practiceLines.length > 0) {
      lines.push("Practice:");
      lines.push(...practiceLines);
    }
  }

  if (lines.length > 0) return lines.join("\n");

  // Fallback: surface remaining string fields (never excluded keys / answer keys).
  const fallback: string[] = [];
  for (const [key, value] of Object.entries(result)) {
    if (EXCLUDED_DISPLAY_KEYS.has(key)) continue;
    if (/answer[_]?key/i.test(key)) continue;
    if (typeof value === "string" && value.trim()) {
      fallback.push(`${key}: ${value.trim()}`);
    }
  }
  return fallback.join("\n");
}

export function formatStoredMessageContent(content: unknown): string {
  if (typeof content !== "string") return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const row = asRecord(parsed);
    if (row) {
      const formatted = formatTutorResultForDisplay(row);
      if (formatted) return formatted;
    }
  } catch {
    // plain text message
  }
  return trimmed;
}

export function mapResumeHistoryMessages(
  messages: unknown
): AiTutorLearnerMessageView[] {
  if (!Array.isArray(messages)) return [];
  const out: AiTutorLearnerMessageView[] = [];
  for (const raw of messages) {
    const row = asRecord(raw);
    if (!row) continue;
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id
        : typeof row.message_id === "string" && row.message_id.trim()
          ? row.message_id
          : "";
    if (!id) continue;
    const role =
      typeof row.role === "string" && row.role.trim()
        ? row.role.trim()
        : "user";
    const kind =
      (typeof row.message_kind === "string" && row.message_kind) ||
      (typeof row.kind === "string" && row.kind) ||
      "";
    out.push({
      id,
      role,
      kind,
      content: formatStoredMessageContent(row.content),
    });
  }
  return out;
}

/**
 * Ensure active lesson-bound thread, then resume bounded history.
 * Never creates a second active thread on refresh (ensure is get-or-create).
 */
export async function loadAiTutorLearnerSession(
  deps: AiTutorLearnerSessionDeps,
  input: {
    courseId: string;
    lessonId: string;
    title?: string | null;
    historyLimit?: number | null;
  }
): Promise<AiTutorLearnerSessionResult> {
  if (!isAiTutorUuid(input.courseId) || !isAiTutorUuid(input.lessonId)) {
    return {
      ok: false,
      code: "invalid_ids",
      message: "Lesson or course is invalid.",
    };
  }

  const ensure = deps.ensureThread ?? ensureMyAiTutorActiveThread;
  const resume = deps.resumeThread ?? resumeMyAiTutorThread;

  const ensured = await ensure(deps.supabase, {
    courseId: input.courseId,
    lessonId: input.lessonId,
    title: input.title ?? "AI Tutor",
  });

  if (!ensured.ok) {
    const lower = ensured.message.toLowerCase();
    if (
      lower.includes("not allowed") ||
      lower.includes("entitled") ||
      lower.includes("authentication")
    ) {
      return {
        ok: false,
        code: "access_denied",
        message: sanitizeAiTutorError(ensured.message),
      };
    }
    return {
      ok: false,
      code: "ensure_failed",
      message: sanitizeAiTutorError(ensured.message),
    };
  }

  const threadId =
    typeof ensured.data.thread_id === "string" ? ensured.data.thread_id : "";
  if (!threadId || !isAiTutorUuid(threadId)) {
    return {
      ok: false,
      code: "ensure_failed",
      message: "AI Tutor thread is unavailable or invalid.",
    };
  }

  const resumed = await resume(deps.supabase, {
    threadId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    limit: input.historyLimit,
  });

  if (!resumed.ok) {
    const lower = resumed.message.toLowerCase();
    if (
      lower.includes("not allowed") ||
      lower.includes("entitled") ||
      lower.includes("authentication")
    ) {
      return {
        ok: false,
        code: "access_denied",
        message: sanitizeAiTutorError(resumed.message),
      };
    }
    if (
      lower.includes("not found") ||
      lower.includes("mismatch") ||
      lower.includes("invalid")
    ) {
      return {
        ok: false,
        code: "resume_failed",
        message: sanitizeAiTutorError(resumed.message),
      };
    }
    return {
      ok: false,
      code: "resume_failed",
      message: sanitizeAiTutorError(resumed.message),
    };
  }

  const messages = mapResumeHistoryMessages(resumed.data.messages);
  const lifecycleStatus =
    typeof ensured.data.lifecycle_status === "string"
      ? ensured.data.lifecycle_status
      : typeof resumed.data.lifecycle_status === "string"
        ? resumed.data.lifecycle_status
        : null;

  return {
    ok: true,
    threadId,
    courseId: input.courseId,
    lessonId: input.lessonId,
    created: ensured.data.created === true,
    lifecycleStatus,
    messages,
    emptyHistory: messages.length === 0,
  };
}
