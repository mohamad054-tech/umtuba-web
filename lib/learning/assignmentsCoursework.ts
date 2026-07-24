/**
 * UM Learning OS — Assignments & Coursework Foundation V1.
 *
 * Parallel coursework vertical for activity type=assignment.
 * DB-authoritative RPCs. Separate from question-assessment grading.
 * File artifacts are storage references only (no processing).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export const LEARNING_ASSIGNMENT_RPCS = {
  upsertSpec: "upsert_learning_assignment_spec",
  setResources: "set_learning_assignment_resources",
  getForManage: "get_learning_assignment_for_manage",
  getMine: "get_my_learning_assignment",
  startSubmission: "start_my_learning_assignment_submission",
  saveSubmission: "save_my_learning_assignment_submission",
  submitSubmission: "submit_my_learning_assignment_submission",
  getMyResult: "get_my_learning_assignment_result",
  queue: "get_learning_assignment_submission_queue",
  getForReview: "get_learning_assignment_submission_for_review",
  review: "review_learning_assignment_submission",
} as const;

export const LEARNING_ASSIGNMENT_STORAGE_BUCKET =
  "learning-assignment-files" as const;

export const LEARNING_ASSIGNMENT_ARTIFACT_KINDS = [
  "text",
  "link",
  "file",
] as const;

export const LEARNING_ASSIGNMENT_QUEUE_STATUSES = [
  "pending",
  "reviewed",
  "overdue",
  "late",
  "all",
] as const;

export const LEARNING_ASSIGNMENT_FEEDBACK_MAX_CHARS = 2000;

export const LEARNING_ASSIGNMENT_ROUTES = {
  learner: (activityId: string) =>
    `/learning/activities/${activityId}/assignment`,
  author: (courseId: string, activityId: string) =>
    `/learning/instructor/courses/${courseId}/activities/${activityId}/assignment`,
  queue: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/assignments`,
  review: (courseId: string, submissionId: string) =>
    `/learning/instructor/courses/${courseId}/assignments/${submissionId}`,
} as const;

export type AssignmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type AssignmentResource = {
  id?: string;
  label: string;
  url: string;
  position?: number;
};

export type AssignmentArtifactInput =
  | { kind: "text"; text_body: string }
  | { kind: "link"; link_url: string }
  | {
      kind: "file";
      storage_bucket?: string;
      storage_path: string;
      file_name: string;
      mime_type?: string | null;
      byte_size?: number | null;
    };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssignmentUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function buildLearningAssignmentFilePath(
  userId: string,
  activityId: string,
  fileId: string,
  extension: string
): string {
  const ext = extension.replace(/^\./, "").toLowerCase();
  return `${userId}/${activityId}/${fileId}.${ext}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeAssignmentError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Assignment could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to access this assignment.";
  }
  if (lower.includes("past due") || lower.includes("maximum submissions")) {
    return raw.length > 180 ? "Assignment submission is not allowed." : raw;
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Assignment data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Assignment could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<AssignmentResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeAssignmentError(error.message) };
  }
  return { ok: true, data };
}

export async function loadAssignmentForManage(
  supabase: AnyClient,
  activityId: string
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.getForManage, {
    p_activity_id: activityId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.activity_id) !== activityId) {
    return { ok: false, message: "Assignment manage payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function upsertAssignmentSpec(
  supabase: AnyClient,
  input: {
    activityId: string;
    instructions: string;
    dueAt?: string | null;
    maxSubmissions?: number | null;
  }
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(input.activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.upsertSpec, {
    p_activity_id: input.activityId,
    p_instructions: input.instructions,
    p_due_at: input.dueAt ?? null,
    p_max_submissions: input.maxSubmissions ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function setAssignmentResources(
  supabase: AnyClient,
  activityId: string,
  resources: AssignmentResource[]
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.setResources, {
    p_activity_id: activityId,
    p_resources: resources.map((r) => ({ label: r.label, url: r.url })),
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function loadMyAssignment(
  supabase: AnyClient,
  activityId: string
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.getMine, {
    p_activity_id: activityId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.activity_id) !== activityId) {
    return { ok: false, message: "Assignment payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function startMyAssignmentSubmission(
  supabase: AnyClient,
  activityId: string
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(activityId)) {
    return { ok: false, message: "activity_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_ASSIGNMENT_RPCS.startSubmission,
    { p_activity_id: activityId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function saveMyAssignmentSubmission(
  supabase: AnyClient,
  submissionId: string,
  artifacts: AssignmentArtifactInput[]
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_ASSIGNMENT_RPCS.saveSubmission,
    { p_submission_id: submissionId, p_artifacts: artifacts }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function submitMyAssignmentSubmission(
  supabase: AnyClient,
  submissionId: string
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(
    supabase,
    LEARNING_ASSIGNMENT_RPCS.submitSubmission,
    { p_submission_id: submissionId }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function loadAssignmentQueue(
  supabase: AnyClient,
  courseId: string,
  options?: { status?: string | null; search?: string | null }
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.queue, {
    p_course_id: courseId,
    p_status: options?.status?.trim() || "pending",
    p_search: options?.search?.trim() || null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function loadAssignmentSubmissionForReview(
  supabase: AnyClient,
  submissionId: string
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.getForReview, {
    p_submission_id: submissionId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function reviewAssignmentSubmission(
  supabase: AnyClient,
  input: {
    submissionId: string;
    pointsEarned: number;
    feedback?: string | null;
  }
): Promise<AssignmentResult<Record<string, unknown>>> {
  if (!isAssignmentUuid(input.submissionId)) {
    return { ok: false, message: "submission_id must be a valid UUID" };
  }
  if (
    typeof input.pointsEarned !== "number" ||
    !Number.isFinite(input.pointsEarned) ||
    input.pointsEarned < 0
  ) {
    return { ok: false, message: "points_earned must be a non-negative number" };
  }
  if (
    input.feedback &&
    input.feedback.length > LEARNING_ASSIGNMENT_FEEDBACK_MAX_CHARS
  ) {
    return { ok: false, message: "Feedback is too long." };
  }
  const result = await callRpc(supabase, LEARNING_ASSIGNMENT_RPCS.review, {
    p_submission_id: input.submissionId,
    p_points_earned: input.pointsEarned,
    p_feedback: input.feedback ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}
