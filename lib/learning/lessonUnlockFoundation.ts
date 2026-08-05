/**
 * UM Learning OS — Lesson Unlock via UM Points (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * Does NOT alter um_points_ledger_points_positive / ledger CHECK constraints.
 * Does NOT implement platform Single Ledger spends.
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

/** Persisted instructor point-cost row (`learning_lesson_point_costs`). */
export type LearningLessonPointCostConfig = {
  lesson_id: string;
  unlock_cost: number;
  enabled: boolean;
  updated_at: string | null;
};

/** Successful unlock RPC body (JSON success path, not PostgREST error). */
export type LearningLessonUnlockRpcSuccess = {
  success: true;
  unlocked: true;
  reason?: string;
  points_spent?: number;
  balance?: number;
};

export type SetLessonPointCostInput = {
  lessonId: string;
  unlockCost: number;
  enabled?: boolean;
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
    lower.includes("authentication_required") ||
    lower.includes("not entitled") ||
    lower.includes("not_entitled") ||
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

export function sanitizeLessonPointCostError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Lesson point cost could not be saved.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to manage this lesson point cost.";
  }
  if (lower.includes("unlock_cost must be")) {
    return "Unlock cost must be a positive whole number.";
  }
  if (raw.length > 180) return "Lesson point cost could not be saved.";
  return raw;
}

/**
 * Fail-closed unlock RPC JSON contract.
 * Trust only success === true AND unlocked === true.
 */
export function parseLearningLessonUnlockRpcResult(
  raw: unknown
): LessonUnlockResult<LearningLessonUnlockRpcSuccess> {
  if (raw == null) {
    return { ok: false, message: "Unlock response was empty." };
  }
  const row = asRecord(raw);
  if (!row) {
    return { ok: false, message: "Unlock response was malformed." };
  }
  if (row.success !== true) {
    const code =
      typeof row.error === "string" && row.error.trim()
        ? row.error.trim()
        : "unlock_failed";
    return { ok: false, message: sanitizeLessonUnlockError(code) };
  }
  if (row.unlocked !== true) {
    return {
      ok: false,
      message: "Lesson unlock could not be confirmed.",
    };
  }
  return {
    ok: true,
    data: {
      success: true,
      unlocked: true,
      reason: typeof row.reason === "string" ? row.reason : undefined,
      points_spent:
        typeof row.points_spent === "number" && Number.isFinite(row.points_spent)
          ? row.points_spent
          : undefined,
      balance:
        typeof row.balance === "number" && Number.isFinite(row.balance)
          ? row.balance
          : undefined,
    },
  };
}

export function parseLearningLessonPointCostConfig(
  raw: unknown,
  expectedLessonId?: string
): LearningLessonPointCostConfig | null {
  const row = asRecord(raw);
  if (!row) return null;
  const lesson_id = asString(row.lesson_id);
  if (!lesson_id) return null;
  if (expectedLessonId && lesson_id !== expectedLessonId) return null;
  if (
    typeof row.unlock_cost !== "number" ||
    !Number.isFinite(row.unlock_cost) ||
    row.unlock_cost <= 0
  ) {
    return null;
  }
  if (typeof row.enabled !== "boolean") return null;
  return {
    lesson_id,
    unlock_cost: Math.floor(row.unlock_cost),
    enabled: row.enabled,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
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

/**
 * Load persisted point-cost config for instructor UI.
 * Relies on RLS (entitled readers / managers). No row → free lesson.
 */
export async function loadLessonPointCostConfig(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<LearningLessonPointCostConfig | null>> {
  if (!isLessonUnlockUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const { data, error } = await supabase
    .from("learning_lesson_point_costs")
    .select("lesson_id, unlock_cost, enabled, updated_at")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      message: sanitizeLessonPointCostError(error.message),
    };
  }
  if (!data) {
    return { ok: true, data: null };
  }
  const parsed = parseLearningLessonPointCostConfig(data, lessonId);
  if (!parsed) {
    return { ok: false, message: "Lesson point cost payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function loadMyLessonUnlockState(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<LearningLessonUnlockState>> {
  if (!isLessonUnlockUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_LESSON_UNLOCK_RPCS.getUnlockState,
    { p_lesson_id: lessonId }
  );
  if (error) {
    return { ok: false, message: sanitizeLessonUnlockError(error.message) };
  }
  const parsed = parseLearningLessonUnlockState(data);
  if (!parsed || parsed.lesson_id !== lessonId) {
    return { ok: false, message: "Unlock state payload is malformed." };
  }
  return { ok: true, data: parsed };
}

/**
 * Set or update lesson UM Points unlock cost.
 * RPC requires unlock_cost > 0 always. Disable paid unlock with enabled=false
 * (keeps stored cost; unlock state treats disabled as free).
 */
export async function setLessonPointCost(
  supabase: AnyClient,
  input: SetLessonPointCostInput
): Promise<LessonUnlockResult<LearningLessonPointCostConfig>> {
  if (!isLessonUnlockUuid(input.lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  if (typeof input.unlockCost !== "number" || !Number.isFinite(input.unlockCost)) {
    return { ok: false, message: "unlock_cost must be a valid number" };
  }
  if (input.unlockCost <= 0) {
    return { ok: false, message: "unlock_cost must be > 0" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_LESSON_UNLOCK_RPCS.setPointCost,
    {
      p_lesson_id: input.lessonId,
      p_unlock_cost: Math.floor(input.unlockCost),
      p_enabled: input.enabled ?? true,
    }
  );
  if (error) {
    return { ok: false, message: sanitizeLessonPointCostError(error.message) };
  }
  const parsed = parseLearningLessonPointCostConfig(data, input.lessonId);
  if (!parsed) {
    return { ok: false, message: "Lesson point cost payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function unlockMyLessonWithUmPoints(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<LearningLessonUnlockRpcSuccess>> {
  if (!isLessonUnlockUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_LESSON_UNLOCK_RPCS.unlockWithUmPoints,
    { p_lesson_id: lessonId }
  );
  if (error) {
    return { ok: false, message: sanitizeLessonUnlockError(error.message) };
  }
  return parseLearningLessonUnlockRpcResult(data);
}

/**
 * Fail-closed content gate for point-locked lessons.
 * Managers/admins receive unlocked=true from the RPC and pass.
 */
export async function requireLessonUnlockedForLearner(
  supabase: AnyClient,
  lessonId: string
): Promise<LessonUnlockResult<LearningLessonUnlockState>> {
  const state = await loadMyLessonUnlockState(supabase, lessonId);
  if (!state.ok) return state;
  if (state.data.locked) {
    return {
      ok: false,
      message: "This lesson is locked. Unlock with UM Points to continue.",
    };
  }
  return state;
}
