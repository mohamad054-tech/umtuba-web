/**
 * UM Learning OS — Assessment Due Dates on Calendar V1.
 *
 * Manage-only set/clear of quiz activity settings.due_at via
 * `set_learning_assessment_due_at`. Calendar aggregation lives in the live
 * calendar RPCs. No attempt/scoring enforcement.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_ROUTES } from "./assessmentAuthoring";
import { LEARNING_ASSIGNMENT_ROUTES } from "./assignmentsCoursework";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "./assessmentDelivery";
import { LEARNING_LIVE_ROUTES } from "./liveCalendarFoundation";

type AnyClient = SupabaseClient;

export const LEARNING_ASSESSMENT_DUE_RPCS = {
  set: "set_learning_assessment_due_at",
} as const;

export const LEARNING_ASSESSMENT_DUE_MIGRATION =
  "20260905_learning_assessment_due_dates_calendar_v1.sql";

export const LEARNING_CALENDAR_ITEM_KINDS = [
  "live_session",
  "assignment_due",
  "assessment_due",
] as const;

export type LearningCalendarItemKind =
  (typeof LEARNING_CALENDAR_ITEM_KINDS)[number];

export type AssessmentDueResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type AssessmentDueView = {
  activity_id: string;
  course_id: string;
  due_at: string | null;
  cleared: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAssessmentDueUuid(value: string): boolean {
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

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function sanitizeAssessmentDueError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Assessment due date could not be updated.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to manage assessment due dates.";
  }
  if (lower.includes("only supported for quiz")) {
    return "Due dates can only be set on quiz assessments.";
  }
  if (lower.includes("not found")) {
    return "Assessment or settings were not found.";
  }
  if (
    lower.includes("due_at is required") ||
    lower.includes("invalid") ||
    lower.includes("timestamp")
  ) {
    return "Provide a valid due date, or clear the due date.";
  }
  if (raw.length > 180) return "Assessment due date could not be updated.";
  return raw;
}

export function parseAssessmentDueAtInput(
  raw: string | null | undefined
): AssessmentDueResult<string> {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return { ok: false, message: "Provide a valid due date, or clear the due date." };
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    return { ok: false, message: "Provide a valid due date, or clear the due date." };
  }
  return { ok: true, data: new Date(ms).toISOString() };
}

export function formatAssessmentDueLocalInput(
  iso: string | null | undefined
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

function requireUuid(
  value: string,
  label: string
): { ok: false; message: string } | null {
  if (!isAssessmentDueUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return null;
}

function mapDuePayload(data: unknown): AssessmentDueResult<AssessmentDueView> {
  const row = asRecord(data);
  if (!row) {
    return { ok: false, message: "Assessment due payload is malformed." };
  }
  const activityId = asString(row.activity_id);
  const courseId = asString(row.course_id);
  if (!activityId || !courseId) {
    return { ok: false, message: "Assessment due payload is malformed." };
  }
  const dueRaw = row.due_at;
  const dueAt =
    dueRaw === null || dueRaw === undefined
      ? null
      : asString(dueRaw);
  if (dueRaw !== null && dueRaw !== undefined && dueAt === null) {
    return { ok: false, message: "Assessment due payload is malformed." };
  }
  return {
    ok: true,
    data: {
      activity_id: activityId,
      course_id: courseId,
      due_at: dueAt,
      cleared: asBoolean(row.cleared),
    },
  };
}

export async function setLearningAssessmentDueAt(
  supabase: AnyClient,
  input: { activityId: string; dueAt: string }
): Promise<AssessmentDueResult<AssessmentDueView>> {
  const bad = requireUuid(input.activityId, "activity_id");
  if (bad) return bad;
  const parsed = parseAssessmentDueAtInput(input.dueAt);
  if (!parsed.ok) return parsed;

  const { data, error } = await supabase.rpc(LEARNING_ASSESSMENT_DUE_RPCS.set, {
    p_activity_id: input.activityId,
    p_due_at: parsed.data,
    p_clear_due: false,
  });
  if (error) {
    return { ok: false, message: sanitizeAssessmentDueError(error.message) };
  }
  return mapDuePayload(data);
}

export async function clearLearningAssessmentDueAt(
  supabase: AnyClient,
  activityId: string
): Promise<AssessmentDueResult<AssessmentDueView>> {
  const bad = requireUuid(activityId, "activity_id");
  if (bad) return bad;

  const { data, error } = await supabase.rpc(LEARNING_ASSESSMENT_DUE_RPCS.set, {
    p_activity_id: activityId,
    p_due_at: null,
    p_clear_due: true,
  });
  if (error) {
    return { ok: false, message: sanitizeAssessmentDueError(error.message) };
  }
  return mapDuePayload(data);
}

/**
 * Staff-visible due_at via JWT SELECT/RLS (same pattern as assessment authoring).
 */
export async function loadLearningAssessmentDueAt(
  supabase: AnyClient,
  activityId: string
): Promise<AssessmentDueResult<{ due_at: string | null }>> {
  const bad = requireUuid(activityId, "activity_id");
  if (bad) return bad;

  const { data, error } = await supabase
    .from("learning_activity_settings")
    .select("due_at")
    .eq("activity_id", activityId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: sanitizeAssessmentDueError(error.message) };
  }
  if (!data) {
    return { ok: true, data: { due_at: null } };
  }
  const dueRaw = (data as { due_at?: unknown }).due_at;
  if (dueRaw === null || dueRaw === undefined) {
    return { ok: true, data: { due_at: null } };
  }
  const dueAt = asString(dueRaw);
  if (!dueAt) {
    return { ok: false, message: "Assessment due payload is malformed." };
  }
  return { ok: true, data: { due_at: dueAt } };
}

export function learnerCalendarItemHref(
  kind: string | null,
  courseId: string,
  itemId: string | null
): string {
  if (kind === "live_session" && itemId) {
    return LEARNING_LIVE_ROUTES.learnerSession(courseId, itemId);
  }
  if (kind === "assignment_due" && itemId) {
    return LEARNING_ASSIGNMENT_ROUTES.learner(itemId);
  }
  if (kind === "assessment_due" && itemId) {
    return LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(itemId);
  }
  return LEARNING_LIVE_ROUTES.learnerCalendar(courseId);
}

export function instructorCalendarItemHref(
  kind: string | null,
  courseId: string,
  itemId: string | null
): string {
  if (kind === "live_session" && itemId) {
    return LEARNING_LIVE_ROUTES.instructorSession(courseId, itemId);
  }
  if (kind === "assignment_due" && itemId) {
    return LEARNING_ASSIGNMENT_ROUTES.author(courseId, itemId);
  }
  if (kind === "assessment_due" && itemId) {
    return LEARNING_ASSESSMENT_ROUTES.activityQuestions(courseId, itemId);
  }
  return LEARNING_LIVE_ROUTES.instructorCalendar(courseId);
}
