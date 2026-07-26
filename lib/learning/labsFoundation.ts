/**
 * UM Learning OS — Labs Foundation (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * Parallel lab vertical for activity type=lab.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_LAB_RPCS = {
  upsertSpec: "upsert_learning_lab_spec",
  start: "start_my_learning_lab",
  complete: "complete_my_learning_lab",
  getMine: "get_my_learning_lab",
} as const;

export const LEARNING_LAB_ROUTES = {
  learner: (activityId: string) => `/learning/activities/${activityId}/lab`,
  author: (courseId: string, activityId: string) =>
    `/learning/instructor/courses/${courseId}/activities/${activityId}/lab`,
} as const;

export type LabResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLabUuid(value: string): boolean {
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

export function sanitizeLabError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Lab could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to access this lab.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Lab data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Lab could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LabResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLabError(error.message) };
  }
  return { ok: true, data };
}

export async function loadMyLab(
  supabase: AnyClient,
  activityId: string
): Promise<LabResult<Record<string, unknown>>> {
  if (!isLabUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_LAB_RPCS.getMine, {
    p_activity_id: activityId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.activity_id) !== activityId) {
    return { ok: false, message: "Lab payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function upsertLabSpec(
  supabase: AnyClient,
  input: {
    activityId: string;
    instructions: string;
    starterFiles?: unknown;
    resources?: unknown;
    validationHook?: string | null;
  }
): Promise<LabResult<Record<string, unknown>>> {
  if (!isLabUuid(input.activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_LAB_RPCS.upsertSpec, {
    p_activity_id: input.activityId,
    p_instructions: input.instructions,
    p_starter_files: input.starterFiles ?? [],
    p_resources: input.resources ?? [],
    p_validation_hook: input.validationHook ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function startMyLab(
  supabase: AnyClient,
  activityId: string
): Promise<LabResult<Record<string, unknown>>> {
  if (!isLabUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_LAB_RPCS.start, {
    p_activity_id: activityId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function completeMyLab(
  supabase: AnyClient,
  activityId: string,
  validationResult?: unknown
): Promise<LabResult<Record<string, unknown>>> {
  if (!isLabUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_LAB_RPCS.complete, {
    p_activity_id: activityId,
    p_validation_result: validationResult ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}
