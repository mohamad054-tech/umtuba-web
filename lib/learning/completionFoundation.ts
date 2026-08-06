/**
 * UM Learning OS — Learning Completion Foundation V1.
 *
 * Certificates, transcript, completion events, and in-platform notifications.
 * DB-authoritative via completion RPCs. No PDF/email/push/rewards/analytics.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireRegistryPath } from "../platform/navigation/routeTemplates";

type AnyClient = SupabaseClient;

export const LEARNING_COMPLETION_RPCS = {
  finalizeCourse: "finalize_my_learning_course_completion",
  getTranscript: "get_my_learning_transcript",
  getCertificates: "get_my_learning_certificates",
} as const;

export const LEARNING_COMPLETION_INTERNAL = {
  tryFinalize: "learning_completion_try_finalize_course",
  eventWriteOnce: "learning_completion_event_write_once",
  assessmentGate: "learning_completion_assessment_gate_ok",
} as const;

export const LEARNING_COMPLETION_EVENT_TYPES = [
  "course_completed",
  "certificate_issued",
] as const;

export const LEARNING_COMPLETION_NOTIFICATION_TYPE =
  "learning_course_completed" as const;

export const LEARNING_COMPLETION_ROUTES = {
  transcript: requireRegistryPath("learning.transcript"),
} as const;

export type LearningTranscriptEntry = {
  course_id: string;
  course_name: string;
  course_slug: string;
  space_id: string;
  progress_status: string;
  percent_complete: number | null;
  completed_at: string | null;
  final_score: number | null;
  final_points_earned: number | null;
  final_points_possible: number | null;
  certificate_status: "issued" | "none";
  certificate_code: string | null;
  certificate_issued_at: string | null;
};

export type LearningTranscriptView = {
  learner_user_id: string;
  entries: LearningTranscriptEntry[];
  entry_count: number;
};

export type LearningCertificateView = {
  certificate_id: string;
  certificate_code: string;
  course_id: string;
  course_name: string;
  status: string;
  final_score: number | null;
  issued_at: string;
};

export type LearningFinalizeCompletionView = {
  course_id: string;
  status: string;
  reason: string | null;
  certificate_id: string | null;
  certificate_code: string | null;
  certificate_issued: boolean;
  completion_event: boolean;
  notification_sent: boolean;
  issued_at: string | null;
};

export type LearningCompletionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLearningCompletionUuid(value: string): boolean {
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

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function sanitizeLearningCompletionError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Completion could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to access this completion data.";
  }
  if (lower.includes("malformed") || lower.includes("not found")) {
    return "Completion data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Completion could not be processed.";
  return raw;
}

export function parseLearningTranscriptView(
  raw: unknown
): LearningTranscriptView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const learner_user_id = asString(row.learner_user_id);
  if (!learner_user_id || !Array.isArray(row.entries)) return null;
  const entries: LearningTranscriptEntry[] = [];
  for (const item of row.entries) {
    const e = asRecord(item);
    if (!e) return null;
    const course_id = asString(e.course_id);
    const course_name = asString(e.course_name);
    const course_slug = asString(e.course_slug);
    const space_id = asString(e.space_id);
    const progress_status = asString(e.progress_status);
    const certificate_status = asString(e.certificate_status);
    if (
      !course_id ||
      !course_name ||
      !course_slug ||
      !space_id ||
      !progress_status ||
      (certificate_status !== "issued" && certificate_status !== "none")
    ) {
      return null;
    }
    entries.push({
      course_id,
      course_name,
      course_slug,
      space_id,
      progress_status,
      percent_complete: asNumberOrNull(e.percent_complete),
      completed_at: asString(e.completed_at),
      final_score: asNumberOrNull(e.final_score),
      final_points_earned: asNumberOrNull(e.final_points_earned),
      final_points_possible: asNumberOrNull(e.final_points_possible),
      certificate_status,
      certificate_code: asString(e.certificate_code),
      certificate_issued_at: asString(e.certificate_issued_at),
    });
  }
  return {
    learner_user_id,
    entries,
    entry_count: asNumberOrNull(row.entry_count) ?? entries.length,
  };
}

export function parseLearningFinalizeCompletionView(
  raw: unknown
): LearningFinalizeCompletionView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const course_id = asString(row.course_id);
  const status = asString(row.status);
  if (!course_id || !status) return null;
  return {
    course_id,
    status,
    reason: asString(row.reason),
    certificate_id: asString(row.certificate_id),
    certificate_code: asString(row.certificate_code),
    certificate_issued: asBool(row.certificate_issued, false),
    completion_event: asBool(row.completion_event, false),
    notification_sent: asBool(row.notification_sent, false),
    issued_at: asString(row.issued_at),
  };
}

export async function loadMyLearningTranscript(
  supabase: AnyClient
): Promise<LearningCompletionResult<LearningTranscriptView>> {
  const { data, error } = await supabase.rpc(
    LEARNING_COMPLETION_RPCS.getTranscript
  );
  if (error) {
    return { ok: false, message: sanitizeLearningCompletionError(error.message) };
  }
  const parsed = parseLearningTranscriptView(data);
  if (!parsed) {
    return { ok: false, message: "Transcript payload is malformed." };
  }
  return { ok: true, data: parsed };
}

export async function finalizeMyCourseCompletion(
  supabase: AnyClient,
  courseId: string
): Promise<LearningCompletionResult<LearningFinalizeCompletionView>> {
  if (!isLearningCompletionUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_COMPLETION_RPCS.finalizeCourse,
    { p_course_id: courseId }
  );
  if (error) {
    return { ok: false, message: sanitizeLearningCompletionError(error.message) };
  }
  const parsed = parseLearningFinalizeCompletionView(data);
  if (!parsed || parsed.course_id !== courseId) {
    return { ok: false, message: "Completion finalize payload is malformed." };
  }
  return { ok: true, data: parsed };
}
