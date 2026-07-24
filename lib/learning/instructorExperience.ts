/**
 * UM Learning OS — Instructor Experience Foundation V1.
 *
 * Staff read-only workspace: dashboard, review queue filters, course overview,
 * learner progress monitor, learner detail, completion overview.
 * DB-authoritative via experience RPCs. No grading/progress/certificate mutations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES } from "./assessmentManualReview";

type AnyClient = SupabaseClient;

export const LEARNING_INSTRUCTOR_EXPERIENCE_RPCS = {
  dashboard: "get_instructor_learning_dashboard",
  reviewQueue: "get_instructor_learning_review_queue",
  courseOverview: "get_instructor_learning_course_overview",
  learnerProgress: "get_instructor_learning_learner_progress",
  learnerDetail: "get_instructor_learning_learner_detail",
  completionOverview: "get_instructor_learning_completion_overview",
} as const;

export const LEARNING_INSTRUCTOR_EXPERIENCE_INTERNAL = {
  assertManage: "learning_instructor_assert_course_manage",
  courseLearners: "learning_instructor_course_learners",
  pendingReviewCount: "learning_instructor_pending_review_count",
} as const;

export const LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES = {
  hub: "/learning/instructor",
  reviewQueue: "/learning/instructor/review",
  courseOverview: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/overview`,
  learners: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/learners`,
  learnerDetail: (courseId: string, learnerUserId: string) =>
    `/learning/instructor/courses/${courseId}/learners/${learnerUserId}`,
  completion: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/completion`,
  authoring: (courseId: string) =>
    `/learning/instructor/courses/${courseId}`,
  manualReview: LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue,
  manualReviewAttempt: LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt,
} as const;

export const LEARNING_INSTRUCTOR_PROGRESS_BUCKETS = [
  "enrolled",
  "active",
  "completed",
  "pending_review",
  "failed",
  "passed",
] as const;

export type LearningInstructorProgressBucket =
  (typeof LEARNING_INSTRUCTOR_PROGRESS_BUCKETS)[number];

export const LEARNING_INSTRUCTOR_REVIEW_STATUSES = [
  "pending",
  "partially_graded",
  "graded",
  "all",
] as const;

export type LearningInstructorReviewStatus =
  (typeof LEARNING_INSTRUCTOR_REVIEW_STATUSES)[number];

export type InstructorExperienceResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type InstructorDashboardCourse = {
  course_id: string;
  course_name: string;
  course_slug: string;
  course_status: string;
  enrollment_count: number;
  active_learners: number;
  completion_count: number;
  pending_reviews: number;
  avg_percent_complete: number | null;
};

export type InstructorDashboardView = {
  instructor_user_id: string;
  totals: {
    course_count: number;
    enrollment_count: number;
    pending_reviews: number;
    completion_count: number;
  };
  courses: InstructorDashboardCourse[];
  pending_work: Array<{
    kind: string;
    course_id: string;
    course_name: string;
    attempt_id: string;
    learner_user_id: string;
    learner_label: string | null;
    submitted_at: string | null;
    grading_status: string;
  }>;
  recent_activity: Array<{
    event_type: string;
    course_id: string;
    course_name: string;
    learner_user_id: string;
    learner_label: string | null;
    created_at: string;
    from_status: string | null;
    to_status: string | null;
  }>;
};

export type InstructorReviewQueueView = {
  course_id: string | null;
  status_filter: string;
  search: string | null;
  items: Array<{
    attempt_id: string;
    course_id: string;
    course_name: string;
    activity_id: string;
    learner_user_id: string;
    learner_label: string | null;
    submitted_at: string | null;
    grading_status: string;
    pending_question_count: number;
    pending_manual_points: number | null;
    has_pending_manual_review: boolean;
  }>;
  item_count: number;
};

export type InstructorCourseOverviewView = {
  course_id: string;
  course_name: string;
  course_slug: string;
  course_status: string;
  enrollment_count: number;
  active_learners: number;
  completion_count: number;
  pending_reviews: number;
  avg_percent_complete: number | null;
  certificate_count: number;
};

export type InstructorLearnerProgressRow = {
  learner_user_id: string;
  learner_label: string | null;
  enrollment_status: string;
  enrollment_target_type: string;
  enrolled_at: string | null;
  progress_status: string;
  percent_complete: number | null;
  completed_lessons_count: number | null;
  total_lessons_count: number | null;
  last_activity_at: string | null;
  completed_at: string | null;
  has_pending_review: boolean;
  has_passed_assessment: boolean;
  has_failed_assessment: boolean;
  has_certificate: boolean;
  monitor_bucket: LearningInstructorProgressBucket | string;
};

export type InstructorLearnerProgressView = {
  course_id: string;
  bucket_filter: string | null;
  search: string | null;
  learners: InstructorLearnerProgressRow[];
  learner_count: number;
};

export type InstructorLearnerDetailView = {
  course_id: string;
  learner_user_id: string;
  learner_label: string | null;
  enrollment_status: string | null;
  enrollment_target_type: string | null;
  enrolled_at: string | null;
  progress_status: string;
  percent_complete: number | null;
  completed_lessons_count: number | null;
  total_lessons_count: number | null;
  completed_at: string | null;
  last_activity_at: string | null;
  lessons: Array<{
    lesson_id: string;
    lesson_name: string;
    status: string;
    completed_at: string | null;
    last_activity_at: string | null;
  }>;
  completed_activities: Array<{
    activity_id: string;
    activity_name: string;
    applied_at: string;
    attempt_id: string;
    lesson_id: string;
  }>;
  assessments: Array<{
    attempt_id: string;
    activity_id: string;
    activity_name: string | null;
    attempt_status: string;
    submitted_at: string | null;
    grading_status: string | null;
    passed: boolean | null;
    final_percentage: number | null;
    score_earned: number | null;
    score_max: number | null;
    has_pending_manual_review: boolean;
  }>;
  certificate_status: "issued" | "none";
  certificate_code: string | null;
  certificate_issued_at: string | null;
};

export type InstructorCompletionOverviewView = {
  course_id: string;
  completed: Array<Record<string, unknown>>;
  failed: Array<Record<string, unknown>>;
  waiting_grading: Array<Record<string, unknown>>;
  inactive: Array<Record<string, unknown>>;
  counts: {
    completed: number;
    failed: number;
    waiting_grading: number;
    inactive: number;
  };
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInstructorExperienceUuid(value: string): boolean {
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

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function sanitizeInstructorExperienceError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Instructor data could not be loaded.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled")
  ) {
    return "You are not allowed to view this instructor data.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    return "Instructor data is unavailable or invalid.";
  }
  if (raw.length > 180) return "Instructor data could not be loaded.";
  return raw;
}

export function parseInstructorDashboardView(
  raw: unknown
): InstructorDashboardView | null {
  const row = asRecord(raw);
  if (!row || !Array.isArray(row.courses)) return null;
  const instructor_user_id = asString(row.instructor_user_id);
  const totals = asRecord(row.totals);
  if (!instructor_user_id || !totals) return null;
  return {
    instructor_user_id,
    totals: {
      course_count: asNumber(totals.course_count),
      enrollment_count: asNumber(totals.enrollment_count),
      pending_reviews: asNumber(totals.pending_reviews),
      completion_count: asNumber(totals.completion_count),
    },
    courses: row.courses
      .map((c) => {
        const item = asRecord(c);
        if (!item) return null;
        const course_id = asString(item.course_id);
        const course_name = asString(item.course_name);
        if (!course_id || !course_name) return null;
        return {
          course_id,
          course_name,
          course_slug: asString(item.course_slug) ?? "",
          course_status: asString(item.course_status) ?? "",
          enrollment_count: asNumber(item.enrollment_count),
          active_learners: asNumber(item.active_learners),
          completion_count: asNumber(item.completion_count),
          pending_reviews: asNumber(item.pending_reviews),
          avg_percent_complete: asNumberOrNull(item.avg_percent_complete),
        };
      })
      .filter((c): c is InstructorDashboardCourse => c !== null),
    pending_work: Array.isArray(row.pending_work)
      ? (row.pending_work as InstructorDashboardView["pending_work"])
      : [],
    recent_activity: Array.isArray(row.recent_activity)
      ? (row.recent_activity as InstructorDashboardView["recent_activity"])
      : [],
  };
}

export function parseInstructorReviewQueueView(
  raw: unknown
): InstructorReviewQueueView | null {
  const row = asRecord(raw);
  if (!row || !Array.isArray(row.items)) return null;
  return {
    course_id: asString(row.course_id),
    status_filter: asString(row.status_filter) ?? "pending",
    search: asString(row.search),
    items: row.items as InstructorReviewQueueView["items"],
    item_count: asNumber(row.item_count, (row.items as unknown[]).length),
  };
}

export function parseInstructorCourseOverviewView(
  raw: unknown
): InstructorCourseOverviewView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const course_id = asString(row.course_id);
  const course_name = asString(row.course_name);
  if (!course_id || !course_name) return null;
  return {
    course_id,
    course_name,
    course_slug: asString(row.course_slug) ?? "",
    course_status: asString(row.course_status) ?? "",
    enrollment_count: asNumber(row.enrollment_count),
    active_learners: asNumber(row.active_learners),
    completion_count: asNumber(row.completion_count),
    pending_reviews: asNumber(row.pending_reviews),
    avg_percent_complete: asNumberOrNull(row.avg_percent_complete),
    certificate_count: asNumber(row.certificate_count),
  };
}

export function parseInstructorLearnerProgressView(
  raw: unknown
): InstructorLearnerProgressView | null {
  const row = asRecord(raw);
  if (!row || !Array.isArray(row.learners)) return null;
  const course_id = asString(row.course_id);
  if (!course_id) return null;
  return {
    course_id,
    bucket_filter: asString(row.bucket_filter),
    search: asString(row.search),
    learners: row.learners as InstructorLearnerProgressRow[],
    learner_count: asNumber(row.learner_count, row.learners.length),
  };
}

export function parseInstructorLearnerDetailView(
  raw: unknown
): InstructorLearnerDetailView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const course_id = asString(row.course_id);
  const learner_user_id = asString(row.learner_user_id);
  const progress_status = asString(row.progress_status);
  const certificate_status = asString(row.certificate_status);
  if (
    !course_id ||
    !learner_user_id ||
    !progress_status ||
    (certificate_status !== "issued" && certificate_status !== "none")
  ) {
    return null;
  }
  return {
    course_id,
    learner_user_id,
    learner_label: asString(row.learner_label),
    enrollment_status: asString(row.enrollment_status),
    enrollment_target_type: asString(row.enrollment_target_type),
    enrolled_at: asString(row.enrolled_at),
    progress_status,
    percent_complete: asNumberOrNull(row.percent_complete),
    completed_lessons_count: asNumberOrNull(row.completed_lessons_count),
    total_lessons_count: asNumberOrNull(row.total_lessons_count),
    completed_at: asString(row.completed_at),
    last_activity_at: asString(row.last_activity_at),
    lessons: Array.isArray(row.lessons)
      ? (row.lessons as InstructorLearnerDetailView["lessons"])
      : [],
    completed_activities: Array.isArray(row.completed_activities)
      ? (row.completed_activities as InstructorLearnerDetailView["completed_activities"])
      : [],
    assessments: Array.isArray(row.assessments)
      ? (row.assessments as InstructorLearnerDetailView["assessments"])
      : [],
    certificate_status,
    certificate_code: asString(row.certificate_code),
    certificate_issued_at: asString(row.certificate_issued_at),
  };
}

export function parseInstructorCompletionOverviewView(
  raw: unknown
): InstructorCompletionOverviewView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const course_id = asString(row.course_id);
  const counts = asRecord(row.counts);
  if (!course_id || !counts) return null;
  return {
    course_id,
    completed: Array.isArray(row.completed)
      ? (row.completed as Array<Record<string, unknown>>)
      : [],
    failed: Array.isArray(row.failed)
      ? (row.failed as Array<Record<string, unknown>>)
      : [],
    waiting_grading: Array.isArray(row.waiting_grading)
      ? (row.waiting_grading as Array<Record<string, unknown>>)
      : [],
    inactive: Array.isArray(row.inactive)
      ? (row.inactive as Array<Record<string, unknown>>)
      : [],
    counts: {
      completed: asNumber(counts.completed),
      failed: asNumber(counts.failed),
      waiting_grading: asNumber(counts.waiting_grading),
      inactive: asNumber(counts.inactive),
    },
  };
}

async function callParsed<T>(
  supabase: AnyClient,
  rpc: string,
  args: Record<string, unknown> | undefined,
  parse: (raw: unknown) => T | null,
  malformed: string
): Promise<InstructorExperienceResult<T>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return {
      ok: false,
      message: sanitizeInstructorExperienceError(error.message),
    };
  }
  const parsed = parse(data);
  if (!parsed) return { ok: false, message: malformed };
  return { ok: true, data: parsed };
}

export async function loadInstructorDashboard(
  supabase: AnyClient
): Promise<InstructorExperienceResult<InstructorDashboardView>> {
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.dashboard,
    undefined,
    parseInstructorDashboardView,
    "Dashboard payload is malformed."
  );
}

export async function loadInstructorReviewQueue(
  supabase: AnyClient,
  options?: {
    courseId?: string | null;
    status?: string | null;
    search?: string | null;
  }
): Promise<InstructorExperienceResult<InstructorReviewQueueView>> {
  const courseId = options?.courseId?.trim() || null;
  if (courseId && !isInstructorExperienceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.reviewQueue,
    {
      p_course_id: courseId,
      p_status: options?.status?.trim() || "pending",
      p_search: options?.search?.trim() || null,
    },
    parseInstructorReviewQueueView,
    "Review queue payload is malformed."
  );
}

export async function loadInstructorCourseOverview(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorExperienceResult<InstructorCourseOverviewView>> {
  if (!isInstructorExperienceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.courseOverview,
    { p_course_id: courseId },
    parseInstructorCourseOverviewView,
    "Course overview payload is malformed."
  );
}

export async function loadInstructorLearnerProgress(
  supabase: AnyClient,
  courseId: string,
  options?: { bucket?: string | null; search?: string | null }
): Promise<InstructorExperienceResult<InstructorLearnerProgressView>> {
  if (!isInstructorExperienceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.learnerProgress,
    {
      p_course_id: courseId,
      p_bucket: options?.bucket?.trim() || null,
      p_search: options?.search?.trim() || null,
    },
    parseInstructorLearnerProgressView,
    "Learner progress payload is malformed."
  );
}

export async function loadInstructorLearnerDetail(
  supabase: AnyClient,
  courseId: string,
  learnerUserId: string
): Promise<InstructorExperienceResult<InstructorLearnerDetailView>> {
  if (!isInstructorExperienceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  if (!isInstructorExperienceUuid(learnerUserId)) {
    return { ok: false, message: "learner_user_id must be a valid UUID" };
  }
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.learnerDetail,
    { p_course_id: courseId, p_learner_user_id: learnerUserId },
    parseInstructorLearnerDetailView,
    "Learner detail payload is malformed."
  );
}

export async function loadInstructorCompletionOverview(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorExperienceResult<InstructorCompletionOverviewView>> {
  if (!isInstructorExperienceUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }
  return callParsed(
    supabase,
    LEARNING_INSTRUCTOR_EXPERIENCE_RPCS.completionOverview,
    { p_course_id: courseId },
    parseInstructorCompletionOverviewView,
    "Completion overview payload is malformed."
  );
}
