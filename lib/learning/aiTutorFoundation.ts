/**
 * UM Learning OS — AI Tutor integration layer (First Course Readiness V1).
 * DB-authoritative stubs via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * No external AI provider. Messages are stored; assistant replies are stubs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_AI_TUTOR_MESSAGE_KINDS = [
  "ask_question",
  "explain_again",
  "code_review",
  "hint",
  "other",
] as const;
export type LearningAiTutorMessageKind =
  (typeof LEARNING_AI_TUTOR_MESSAGE_KINDS)[number];

export const LEARNING_AI_TUTOR_RPCS = {
  createThread: "create_my_learning_ai_tutor_thread",
  appendMessage: "append_my_learning_ai_tutor_message",
  /** Real Core assistant text (Thread Persistence Bridge). Stub append remains. */
  appendExchange: "append_my_learning_ai_tutor_exchange",
  listThreads: "list_my_learning_ai_tutor_threads",
  getMessages: "get_my_learning_ai_tutor_thread_messages",
} as const;

/** Kinds accepted by append_my_learning_ai_tutor_exchange (narrower than message table). */
export const LEARNING_AI_TUTOR_EXCHANGE_KINDS = [
  "ask_question",
  "explain_again",
  "hint",
] as const;
export type LearningAiTutorExchangeKind =
  (typeof LEARNING_AI_TUTOR_EXCHANGE_KINDS)[number];

export const LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX = 20000;

export const LEARNING_AI_TUTOR_ROUTES = {
  lesson: (lessonId: string) => `/learning/lessons/${lessonId}/ai-tutor`,
} as const;

export type AiTutorResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAiTutorUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function sanitizeAiTutorError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "AI Tutor could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to use AI Tutor for this course.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "AI Tutor data is unavailable or invalid.";
  }
  if (raw.length > 180) return "AI Tutor could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<AiTutorResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeAiTutorError(error.message) };
  }
  return { ok: true, data };
}

export async function createMyAiTutorThread(
  supabase: AnyClient,
  input: {
    courseId: string;
    lessonId?: string | null;
    title?: string | null;
  }
): Promise<AiTutorResult<Record<string, unknown>>> {
  if (!isAiTutorUuid(input.courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  if (input.lessonId && !isAiTutorUuid(input.lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_AI_TUTOR_RPCS.createThread, {
    p_course_id: input.courseId,
    p_lesson_id: input.lessonId ?? null,
    p_title: input.title ?? "AI Tutor",
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function appendMyAiTutorMessage(
  supabase: AnyClient,
  input: {
    threadId: string;
    kind: LearningAiTutorMessageKind;
    content: string;
  }
): Promise<AiTutorResult<Record<string, unknown>>> {
  if (!isAiTutorUuid(input.threadId)) {
    return { ok: false, message: "thread_id must be a valid UUID" };
  }
  if (
    !(LEARNING_AI_TUTOR_MESSAGE_KINDS as readonly string[]).includes(input.kind)
  ) {
    return { ok: false, message: "Invalid message_kind" };
  }
  const result = await callRpc(supabase, LEARNING_AI_TUTOR_RPCS.appendMessage, {
    p_thread_id: input.threadId,
    p_kind: input.kind,
    p_content: input.content,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

/**
 * Persist one learner + one real assistant exchange (Core bridge).
 * Does not use the stub append RPC.
 */
export async function appendMyAiTutorExchange(
  supabase: AnyClient,
  input: {
    threadId: string;
    kind: LearningAiTutorExchangeKind;
    userContent: string;
    assistantContent: string;
  }
): Promise<AiTutorResult<Record<string, unknown>>> {
  if (!isAiTutorUuid(input.threadId)) {
    return { ok: false, message: "thread_id must be a valid UUID" };
  }
  if (
    !(LEARNING_AI_TUTOR_EXCHANGE_KINDS as readonly string[]).includes(input.kind)
  ) {
    return { ok: false, message: "Invalid message_kind" };
  }
  const userContent = input.userContent.trim();
  const assistantContent = input.assistantContent.trim();
  if (
    !userContent ||
    userContent.length > LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX
  ) {
    return { ok: false, message: "user content must be 1..20000 chars" };
  }
  if (
    !assistantContent ||
    assistantContent.length > LEARNING_AI_TUTOR_EXCHANGE_CONTENT_MAX
  ) {
    return { ok: false, message: "assistant content must be 1..20000 chars" };
  }
  const result = await callRpc(supabase, LEARNING_AI_TUTOR_RPCS.appendExchange, {
    p_thread_id: input.threadId,
    p_kind: input.kind,
    p_user_content: userContent,
    p_assistant_content: assistantContent,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listMyAiTutorThreads(
  supabase: AnyClient,
  courseId?: string | null
): Promise<AiTutorResult<Record<string, unknown>>> {
  if (courseId && !isAiTutorUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_AI_TUTOR_RPCS.listThreads, {
    p_course_id: courseId ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function getMyAiTutorThreadMessages(
  supabase: AnyClient,
  threadId: string
): Promise<AiTutorResult<Record<string, unknown>>> {
  if (!isAiTutorUuid(threadId)) {
    return { ok: false, message: "thread_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_AI_TUTOR_RPCS.getMessages, {
    p_thread_id: threadId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}
