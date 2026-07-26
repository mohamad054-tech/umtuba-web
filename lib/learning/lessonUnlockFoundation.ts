/**
 * UM Learning OS — Lesson Unlock via UM Points (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * Does NOT alter um_points_ledger_points_positive / ledger CHECK constraints.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LESSON_UNLOCK_RPCS = {
  setPointCost: "set_learning_lesson_point_cost",
  getUnlockState: "get_my_learning_lesson_unlock_state",
  unlockWithUmPoints: "unlock_my_learning_lesson_with_um_points",
} as const;

export const LEARNING_LESSON_UNLOCK_ROUTES = {
  lesson: (lessonId: string) => `/learning/lessons/${lessonId}`,
} as const;

export type LessonUnlockResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningLessonUnlockState = {
  lesson_id: string;
  locked: boolean;
  cost: number | null;
  balance: number;
  unlocked: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLessonUnlockUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeLessonUnlockError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Lesson unlock could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to unlock this lesson.";
  }
  if (lower.includes("insufficient")) {
    return "Insufficient UM Points balance.";
  }
  if (raw.length > 180) return "Lesson unlock could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LessonUnlockResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLessonUnlockError(error.message) };
  }
  return { ok: true, data };
}

export function parseLearningLessonUnlockState(
  raw: unknown
): LearningLessonUnlockState | null {
  const row = asRecord(raw);
  if (!row) return null;
  const lesson_id = asString(row.lesson_id);
  if (!lesson_id) return null;
  return {
    lesson_id,
    locked: row.locked === true,
    cost: typeof row.cost === "number" ? row.cost : null,
    balance: typeof row.balance === "number" ? row.balance : 0,
    unlocked: row.unlocked === true,
  };
}

export async function loadMyLessonUnlockState(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<LearningLessonUnlockState>> {
  if (!isLessonUnlockUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_UNLOCK_RPCS.getUnlockState,
    { p_lesson_id: lessonId }
  );
  if (!result.ok) return result;
  const parsed = parseLearningLessonUnlockState(result.data);
  if (!parsed || parsed.lesson_id !== lessonId) {
    return { ok: false, message: "Unlock state payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function setLessonPointCost(
  supabase: AnyClient,
  input: {
    lessonId: string;
    unlockCost: number;
    enabled?: boolean;
  }
): Promise<LessonUnlockResult<Record<string, unknown>>> {
  if (!isLessonUnlockUuid(input.lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  if (
    typeof input.unlockCost !== "number" ||
    !Number.isFinite(input.unlockCost) ||
    input.unlockCost <= 0
  ) {
    return { ok: false, message: "unlock_cost must be > 0" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_UNLOCK_RPCS.setPointCost,
    {
      p_lesson_id: input.lessonId,
      p_unlock_cost: Math.floor(input.unlockCost),
      p_enabled: input.enabled ?? true,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function unlockMyLessonWithUmPoints(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<Record<string, unknown>>> {
  if (!isLessonUnlockUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_LESSON_UNLOCK_RPCS.unlockWithUmPoints,
    { p_lesson_id: lessonId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}
