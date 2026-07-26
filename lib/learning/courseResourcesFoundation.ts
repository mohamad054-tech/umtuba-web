/**
 * UM Learning OS — Course Resources Foundation (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_COURSE_RESOURCE_KINDS = [
  "pdf",
  "zip",
  "image",
  "external_link",
  "other",
] as const;
export type LearningCourseResourceKind =
  (typeof LEARNING_COURSE_RESOURCE_KINDS)[number];

export const LEARNING_COURSE_RESOURCE_RPCS = {
  upsert: "upsert_learning_course_resource",
  create: "create_learning_course_resource",
  update: "update_learning_course_resource",
  publish: "publish_learning_course_resource",
  archive: "archive_learning_course_resource",
  listMine: "list_my_learning_course_resources",
  trackDownload: "track_my_learning_course_resource_download",
} as const;

export const LEARNING_COURSE_RESOURCE_ROUTES = {
  learner: (courseId: string) => `/learning/courses/${courseId}/resources`,
  author: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/resources`,
} as const;

export type CourseResourceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCourseResourceUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function sanitizeCourseResourceError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Course resource could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to access these resources.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Resource data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Course resource could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<CourseResourceResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeCourseResourceError(error.message) };
  }
  return { ok: true, data };
}

export async function listMyCourseResources(
  supabase: AnyClient,
  courseId: string
): Promise<CourseResourceResult<Record<string, unknown>>> {
  if (!isCourseResourceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_COURSE_RESOURCE_RPCS.listMine,
    { p_course_id: courseId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function trackMyCourseResourceDownload(
  supabase: AnyClient,
  resourceId: string
): Promise<CourseResourceResult<Record<string, unknown>>> {
  if (!isCourseResourceUuid(resourceId)) {
    return { ok: false, message: "resource_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_COURSE_RESOURCE_RPCS.trackDownload,
    { p_resource_id: resourceId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function upsertCourseResource(
  supabase: AnyClient,
  input: {
    courseId: string;
    title: string;
    resourceKind: LearningCourseResourceKind;
    url: string;
    filename?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    position?: number;
    resourceId?: string | null;
  }
): Promise<CourseResourceResult<Record<string, unknown>>> {
  if (!isCourseResourceUuid(input.courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  if (
    !(LEARNING_COURSE_RESOURCE_KINDS as readonly string[]).includes(
      input.resourceKind
    )
  ) {
    return { ok: false, message: "Invalid resource_kind" };
  }
  const result = await callRpc(supabase, LEARNING_COURSE_RESOURCE_RPCS.upsert, {
    p_course_id: input.courseId,
    p_title: input.title,
    p_resource_kind: input.resourceKind,
    p_url: input.url,
    p_filename: input.filename ?? null,
    p_mime_type: input.mimeType ?? null,
    p_size_bytes: input.sizeBytes ?? null,
    p_position: input.position ?? 0,
    p_resource_id: input.resourceId ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function publishCourseResource(
  supabase: AnyClient,
  resourceId: string
): Promise<CourseResourceResult<Record<string, unknown>>> {
  if (!isCourseResourceUuid(resourceId)) {
    return { ok: false, message: "resource_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_COURSE_RESOURCE_RPCS.publish, {
    p_resource_id: resourceId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function archiveCourseResource(
  supabase: AnyClient,
  resourceId: string
): Promise<CourseResourceResult<Record<string, unknown>>> {
  if (!isCourseResourceUuid(resourceId)) {
    return { ok: false, message: "resource_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_COURSE_RESOURCE_RPCS.archive, {
    p_resource_id: resourceId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}
