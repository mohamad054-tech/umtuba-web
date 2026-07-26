/**
 * UM Learning OS — Projects Foundation (First Course Readiness V1).
 * DB-authoritative via RPCs in
 * `supabase/migrations/20260863_learning_first_course_readiness_v1.sql`.
 *
 * Parallel project vertical for activity type=project.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_PROJECT_RPCS = {
  upsertSpec: "upsert_learning_project_spec",
  startSubmission: "start_my_learning_project_submission",
  saveSubmission: "save_my_learning_project_submission",
  submitSubmission: "submit_my_learning_project_submission",
  getMine: "get_my_learning_project",
  review: "review_learning_project_submission",
  queue: "get_learning_project_submission_queue",
  getForReview: "get_learning_project_submission_for_review",
} as const;

export const LEARNING_PROJECT_QUEUE_STATUSES = [
  "pending",
  "reviewed",
  "all",
] as const;

export const LEARNING_PROJECT_ROUTES = {
  learner: (activityId: string) =>
    `/learning/activities/${activityId}/project`,
  queue: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/projects`,
  review: (courseId: string, submissionId: string) =>
    `/learning/instructor/courses/${courseId}/projects/${submissionId}`,
  author: (courseId: string, activityId: string) =>
    `/learning/instructor/courses/${courseId}/activities/${activityId}/project`,
} as const;

export type ProjectResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProjectUuid(value: string): boolean {
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

export function sanitizeProjectError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Project could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to access this project.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Project data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Project could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<ProjectResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeProjectError(error.message) };
  }
  return { ok: true, data };
}

export async function loadMyProject(
  supabase: AnyClient,
  activityId: string
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.getMine, {
    p_activity_id: activityId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.activity_id) !== activityId) {
    return { ok: false, message: "Project payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function upsertProjectSpec(
  supabase: AnyClient,
  activityId: string,
  instructions: string
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.upsertSpec, {
    p_activity_id: activityId,
    p_instructions: instructions,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function startMyProjectSubmission(
  supabase: AnyClient,
  activityId: string
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_PROJECT_RPCS.startSubmission,
    { p_activity_id: activityId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function saveMyProjectSubmission(
  supabase: AnyClient,
  input: {
    submissionId: string;
    bodyText?: string | null;
    artifactUrl?: string | null;
  }
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(input.submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.saveSubmission, {
    p_submission_id: input.submissionId,
    p_body_text: input.bodyText ?? null,
    p_artifact_url: input.artifactUrl ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function submitMyProjectSubmission(
  supabase: AnyClient,
  submissionId: string
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_PROJECT_RPCS.submitSubmission,
    { p_submission_id: submissionId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function reviewProjectSubmission(
  supabase: AnyClient,
  input: {
    submissionId: string;
    status: string;
    feedback?: string | null;
  }
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(input.submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.review, {
    p_submission_id: input.submissionId,
    p_status: input.status,
    p_feedback: input.feedback ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function loadProjectQueue(
  supabase: AnyClient,
  courseId: string,
  input?: { status?: string; search?: string | null }
): Promise<ProjectResult<{ items: unknown[]; course_id: string; status: string }>> {
  if (!isProjectUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const status = input?.status?.trim() || "pending";
  if (
    !(LEARNING_PROJECT_QUEUE_STATUSES as readonly string[]).includes(status)
  ) {
    return { ok: false, message: "Invalid status filter" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.queue, {
    p_course_id: courseId,
    p_status: status,
    p_search: input?.search ?? null,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Project queue payload is malformed." };
  }
  return {
    ok: true,
    data: {
      course_id: courseId,
      status: asString(row.status) ?? status,
      items: Array.isArray(row.items) ? row.items : [],
    },
  };
}

export async function loadProjectSubmissionForReview(
  supabase: AnyClient,
  submissionId: string
): Promise<ProjectResult<Record<string, unknown>>> {
  if (!isProjectUuid(submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_PROJECT_RPCS.getForReview, {
    p_submission_id: submissionId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.submission_id) !== submissionId) {
    return { ok: false, message: "Project review payload is malformed." };
  }
  return { ok: true, data: row };
}
