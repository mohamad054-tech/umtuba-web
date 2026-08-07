/**
 * UM Learning OS — Learner Delivery V1.
 *
 * Server helpers for the learner experience. Reuses existing Attempts /
 * Progress / Enrollment RPCs and entitlement RLS. No scoring, no answer keys,
 * no service role, no TypeScript authorization substitute.
 *
 * Architecture (approved readiness audit + Read Model Hardening):
 * Server Components + user JWT Supabase client + existing attempt/progress RPCs
 * + entitlement-filtered catalog reads; direct SELECT only where RLS already
 * matches the product gate.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_ACTIVITY_RPCS } from "./activitiesFoundation";
import { LEARNING_ATTEMPT_RPCS } from "./attemptsFoundation";
import type { LearningAttemptAnswerableType } from "./attemptsFoundation";
import { LEARNING_ENROLLMENT_RPCS } from "./enrollmentsFoundation";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  type LearningLessonContentBlock,
} from "./lessonContentBlocksFoundation";
import { LEARNING_COMPLETION_ROUTES } from "./completionFoundation";
import {
  LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE,
  composeLessonContentAccessWithAccessibleSet,
  resolveLessonContentAccess,
  type LearningLessonContentAccess,
  type LearningLessonEnginePayload,
  type LessonEngineResult,
} from "./lessonEngineFoundation";
import { LEARNING_PROGRESS_RPCS } from "./progressFoundation";
import type { LearningProgressStatus } from "./progressFoundation";
import { LEARNING_SCORING_RPCS } from "./scoringFoundation";

type AnyClient = SupabaseClient;

/** Exact post-submit copy — results stay out of V1. */
export const LEARNING_LEARNER_SUBMITTED_MESSAGE =
  "Submitted — results are not available yet." as const;

/** Routes owned by this slice (APP_ROUTES intentionally untouched). */
export const LEARNING_LEARNER_ROUTES = {
  hub: "/learning",
  notes: "/learning/notes",
  saved: "/learning/saved",
  course: (courseId: string) => `/learning/courses/${courseId}`,
  lesson: (lessonId: string) => `/learning/lessons/${lessonId}`,
  activity: (activityId: string) => `/learning/activities/${activityId}`,
  /** Matches assessment delivery route; kept here to avoid circular imports. */
  assessment: (activityId: string) =>
    `/learning/activities/${activityId}/assessment`,
  /** Matches assignment learner route; kept here to avoid circular imports. */
  assignment: (activityId: string) =>
    `/learning/activities/${activityId}/assignment`,
  /** Matches project learner route; kept here to avoid circular imports. */
  project: (activityId: string) => `/learning/activities/${activityId}/project`,
  /** Matches lab learner route; kept here to avoid circular imports. */
  lab: (activityId: string) => `/learning/activities/${activityId}/lab`,
  attempt: (attemptId: string) => `/learning/attempts/${attemptId}`,
  /** Matches course resources learner route; kept here to avoid circular imports. */
  resources: (courseId: string) => `/learning/courses/${courseId}/resources`,
  /** Matches course progress bundle learner route; kept here to avoid circular imports. */
  progress: (courseId: string) => `/learning/courses/${courseId}/progress`,
  /** Matches AI Tutor learner route; kept here to avoid circular imports. */
  aiTutor: (lessonId: string) => `/learning/lessons/${lessonId}/ai-tutor`,
} as const;

export const LEARNING_LEARNER_LOGIN_NEXT = LEARNING_LEARNER_ROUTES.hub;

/** Tables / RPCs learners must never call from delivery surfaces. */
export const LEARNING_LEARNER_FORBIDDEN = {
  scoringRpc: LEARNING_SCORING_RPCS.score,
  resultTables: [
    "learning_attempt_results",
    "learning_attempt_answer_results",
  ] as const,
  questionTables: [
    "learning_questions",
    "learning_question_answer_keys",
  ] as const,
  showResultPolicyActivation: false,
} as const;

/** Learner-safe activity settings subset (never full settings blob). */
export type LearningLearnerActivityHints = {
  is_required: boolean;
  max_attempts: number | null;
  time_limit_seconds: number | null;
};

export type LearningLearnerHubProgram = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  enrollment_id: string;
};

/** Course-level progress attached on the My Learning hub. */
export type LearningLearnerHubCourseProgress = {
  status: LearningProgressStatus;
  completed_lessons_count: number;
  total_lessons_count: number;
  percent_complete: number;
  last_lesson_id: string | null;
};

export type LearningLearnerHubCourse = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  program_id: string;
  program_name: string | null;
  enrollment_id: string | null;
  via: "course_enrollment" | "program_enrollment";
  /** Null when the progress RPC is unavailable for this course. */
  progress: LearningLearnerHubCourseProgress | null;
  /**
   * Resume target from {@link resolveContinueLearningTarget}.
   * Null when no last lesson and no published lesson exists (fail closed).
   */
  continue_href: string | null;
};

export type LearningLearnerHub = {
  programs: LearningLearnerHubProgram[];
  courses: LearningLearnerHubCourse[];
};

export type LearningContinueLearningTarget = {
  lesson_id: string;
  href: string;
};

/** Adjacent lesson link target (Previous / Next). */
export type LearningLessonNavTarget = {
  lesson_id: string;
  href: string;
};

export type LearningAdjacentLessonTargets = {
  previous: LearningLessonNavTarget | null;
  next: LearningLessonNavTarget | null;
};

/** Post-lesson-completion CTA target for the learner lesson viewer. */
export type LearningLessonCompletionHandoff =
  | { kind: "mark_complete" }
  | { kind: "continue_next"; next_lesson: LearningLessonNavTarget }
  | {
      kind: "course_complete";
      course_href: string;
      transcript_href: string;
    };

/** Parsed view from `complete_learning_lesson`. */
export type LearningLessonCompleteView = {
  lesson_id: string;
  lesson_status: LearningProgressStatus;
  course_id: string | null;
  course_status: LearningProgressStatus | null;
  percent_complete: number | null;
};

/** Learner activity experience vertical resolved from activity type. */
export type LearningLearnerActivityExperience =
  | "assessment"
  | "assignment"
  | "project"
  | "lab"
  | "generic";

export type LearningLearnerActivityTarget = {
  activity_id: string;
  experience: LearningLearnerActivityExperience;
  href: string;
};

/**
 * Resolve a Continue Learning resume target against an explicit accessible
 * published lesson id set for the course.
 *
 * Prefers `last_lesson_id` only when it is present in
 * `accessible_lesson_ids`. Otherwise falls back to the first accessible id.
 * Never emits an href for an unvalidated / stale / unpublished lesson id.
 * Fail closed when the accessible set is empty.
 */
export function resolveContinueLearningTarget(input: {
  last_lesson_id: string | null | undefined;
  /**
   * Ordered accessible published lesson ids for the course (RLS + published
   * section/lesson tree). First entry is the safe fallback.
   */
  accessible_lesson_ids: readonly string[];
}): LearningContinueLearningTarget | null {
  const accessible: string[] = [];
  const seen = new Set<string>();
  for (const raw of input.accessible_lesson_ids) {
    const id =
      typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    accessible.push(id);
  }
  if (accessible.length === 0) return null;

  const last = asString(input.last_lesson_id);
  const lessonId =
    last && seen.has(last) ? last : accessible[0];
  if (!lessonId) return null;

  return {
    lesson_id: lessonId,
    href: LEARNING_LEARNER_ROUTES.lesson(lessonId),
  };
}

/**
 * Load ordered accessible published lesson ids for a course (RLS + published
 * section/lesson tree). Shared input for Resume target validation.
 */
export async function loadAccessiblePublishedLessonIdsForCourse(
  supabase: AnyClient,
  courseId: string
): Promise<string[]> {
  const course = asString(courseId);
  if (!course) return [];
  return loadOrderedPublishedLessonIdsForCourse(supabase, course);
}

/**
 * Load the course's accessible published lesson order, then resolve a Resume
 * target. Shared by hub + course progress so href validation stays consistent.
 */
export async function resolveValidatedContinueLearningTarget(
  supabase: AnyClient,
  courseId: string,
  lastLessonId: string | null | undefined
): Promise<LearningContinueLearningTarget | null> {
  const accessibleLessonIds = await loadAccessiblePublishedLessonIdsForCourse(
    supabase,
    courseId
  );
  return resolveContinueLearningTarget({
    last_lesson_id: lastLessonId,
    accessible_lesson_ids: accessibleLessonIds,
  });
}

/**
 * Resolve the learner experience route for an activity by type.
 * quiz → assessment; assignment → assignment; project → project; lab → lab;
 * else → generic gate.
 * Fail closed: missing activity id → null; unknown/empty type → generic.
 */
export function resolveLearnerActivityTarget(input: {
  activity_id: string | null | undefined;
  type: string | null | undefined;
}): LearningLearnerActivityTarget | null {
  const activityId = asString(input.activity_id);
  if (!activityId) return null;

  const type = asString(input.type);
  if (type === "quiz") {
    return {
      activity_id: activityId,
      experience: "assessment",
      href: LEARNING_LEARNER_ROUTES.assessment(activityId),
    };
  }
  if (type === "assignment") {
    return {
      activity_id: activityId,
      experience: "assignment",
      href: LEARNING_LEARNER_ROUTES.assignment(activityId),
    };
  }
  if (type === "project") {
    return {
      activity_id: activityId,
      experience: "project",
      href: LEARNING_LEARNER_ROUTES.project(activityId),
    };
  }
  if (type === "lab") {
    return {
      activity_id: activityId,
      experience: "lab",
      href: LEARNING_LEARNER_ROUTES.lab(activityId),
    };
  }
  return {
    activity_id: activityId,
    experience: "generic",
    href: LEARNING_LEARNER_ROUTES.activity(activityId),
  };
}

/**
 * Resolve previous/next lesson targets from an ordered published lesson list.
 * No wrapping. Fail closed when the current lesson is missing or empty.
 */
export function resolveAdjacentLessonTargets(input: {
  current_lesson_id: string | null | undefined;
  ordered_lesson_ids: readonly string[];
}): LearningAdjacentLessonTargets {
  const currentId = asString(input.current_lesson_id);
  if (!currentId) {
    return { previous: null, next: null };
  }
  const index = input.ordered_lesson_ids.findIndex((id) => id === currentId);
  if (index < 0) {
    return { previous: null, next: null };
  }
  const prevId = index > 0 ? input.ordered_lesson_ids[index - 1] : undefined;
  const nextId =
    index < input.ordered_lesson_ids.length - 1
      ? input.ordered_lesson_ids[index + 1]
      : undefined;
  return {
    previous: prevId
      ? {
          lesson_id: prevId,
          href: LEARNING_LEARNER_ROUTES.lesson(prevId),
        }
      : null,
    next: nextId
      ? {
          lesson_id: nextId,
          href: LEARNING_LEARNER_ROUTES.lesson(nextId),
        }
      : null,
  };
}

/**
 * Resolve the learner CTA after (or before) lesson completion.
 * Incomplete → mark_complete; completed + next → continue_next;
 * completed + no next → course_complete. Fail closed when completed
 * but course_id is missing.
 */
export function resolveLessonCompletionHandoff(input: {
  progress_status: LearningProgressStatus | string | null | undefined;
  next_lesson: LearningLessonNavTarget | null | undefined;
  course_id: string | null | undefined;
}): LearningLessonCompletionHandoff | null {
  const status = asString(input.progress_status);
  if (status !== "completed") {
    return { kind: "mark_complete" };
  }

  const nextId = asString(input.next_lesson?.lesson_id);
  const nextHref = asString(input.next_lesson?.href);
  if (nextId && nextHref) {
    return {
      kind: "continue_next",
      next_lesson: { lesson_id: nextId, href: nextHref },
    };
  }

  const courseId = asString(input.course_id);
  if (!courseId) return null;

  return {
    kind: "course_complete",
    course_href: LEARNING_LEARNER_ROUTES.course(courseId),
    transcript_href: LEARNING_COMPLETION_ROUTES.transcript,
  };
}

export type LearningLearnerOutlineLesson = {
  id: string;
  name: string;
  slug: string;
  position: number;
  progress_status: LearningProgressStatus;
};

export type LearningLearnerOutlineSection = {
  id: string;
  name: string;
  slug: string;
  position: number;
  lessons: LearningLearnerOutlineLesson[];
};

export type LearningLearnerCourseOutline = {
  course: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    program_id: string;
  };
  sections: LearningLearnerOutlineSection[];
  progress: {
    status: LearningProgressStatus;
    completed_lessons_count: number;
    total_lessons_count: number;
    percent_complete: number;
    last_lesson_id: string | null;
  } | null;
};

export type LearningLearnerActivitySummary = {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  position: number;
  hints: LearningLearnerActivityHints;
};

/** Safe lesson shell — identity, nav, and non-mutating progress read. */
export type LearningLearnerLessonShell = {
  lesson: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    section_id: string;
    course_id: string;
    course_name: string;
  };
  progress_status: LearningProgressStatus;
  /** Null at first lesson or when navigation cannot be resolved. */
  previous_lesson: LearningLessonNavTarget | null;
  /** Null at last lesson or when navigation cannot be resolved. */
  next_lesson: LearningLessonNavTarget | null;
};

/**
 * Metadata-only delivery — allowed before unlock proof.
 * Intentionally has no `blocks` / `activities` fields so callers cannot
 * accidentally fall back to a protected SELECT payload.
 */
export type LearningLearnerLessonMetadataDelivery = LearningLearnerLessonShell & {
  delivery_kind: "metadata_only";
};

/**
 * Full delivery after positive `verified_unlocked` proof.
 * Still must not be used by LessonViewer as a content authority — engine wins.
 */
export type LearningLearnerLessonProtectedDelivery = LearningLearnerLessonShell & {
  delivery_kind: "verified_full";
  blocks: LearningLessonContentBlock[];
  activities: LearningLearnerActivitySummary[];
};

export type LearningLearnerLessonDelivery =
  | LearningLearnerLessonMetadataDelivery
  | LearningLearnerLessonProtectedDelivery;

export type LearningLearnerSnapshotQuestion = {
  question_id: string;
  question_type: LearningAttemptAnswerableType;
  position: number;
  content: Record<string, unknown>;
  /** Present after Scoring migration; display optional — never a result. */
  points?: number | null;
};

export type LearningLearnerAttemptAnswer = {
  question_id: string;
  answer_payload: Record<string, unknown>;
  first_answered_at: string;
  last_saved_at: string;
};

export type LearningLearnerAttemptView = {
  attempt_id: string;
  activity_id: string;
  course_id: string;
  status: "active" | "submitted" | "expired" | "cancelled";
  attempt_number: number;
  started_at: string;
  last_activity_at: string;
  submitted_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  time_limit_seconds: number | null;
  max_attempts: number | null;
  remaining_seconds: number | null;
  questions_snapshot: LearningLearnerSnapshotQuestion[];
  answers: LearningLearnerAttemptAnswer[];
};

export type LearningStartAttemptResult = {
  attempt_id: string;
  activity_id: string;
  status: string;
  attempt_number: number;
  started_at: string;
  resumed: boolean;
};

export type LearningDeliveryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const CREATABLE_BLOCK_TYPES = new Set<string>(
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LEARNING_PROGRESS_STATUS_SET = new Set<string>([
  "not_started",
  "in_progress",
  "completed",
]);

function errMessage(error: { message?: string } | null, fallback: string) {
  const msg = error?.message?.trim();
  return msg && msg.length > 0 ? msg : fallback;
}

export function isLearningLessonDeliveryUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function sanitizeLearningLessonCompletionError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Lesson could not be marked complete.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to complete this lesson.";
  }
  if (lower.includes("min_completion_seconds")) {
    return "This lesson cannot be completed yet. Please spend a bit more time on it.";
  }
  if (lower.includes("malformed") || lower.includes("not found")) {
    return "Lesson completion is unavailable or invalid.";
  }
  if (raw.length > 180) return "Lesson could not be marked complete.";
  return raw;
}

function asProgressStatus(value: unknown): LearningProgressStatus | null {
  const status = asString(value);
  if (!status || !LEARNING_PROGRESS_STATUS_SET.has(status)) return null;
  return status as LearningProgressStatus;
}

export function parseLearningLessonCompleteView(
  raw: unknown,
  expectedLessonId?: string
): LearningLessonCompleteView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const lesson = asRecord(row.lesson_progress);
  const course = asRecord(row.course_progress);
  if (!lesson) return null;
  const lesson_id = asString(lesson.lesson_id);
  const lesson_status = asProgressStatus(lesson.status);
  if (!lesson_id || !lesson_status) return null;
  if (expectedLessonId && lesson_id !== expectedLessonId) return null;
  return {
    lesson_id,
    lesson_status,
    course_id: asString(course?.course_id),
    course_status: asProgressStatus(course?.status),
    percent_complete: asNumberOrNull(course?.percent_complete),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Strip staff-only / scoring fields from activity settings for the UI. */
export function toLearnerActivityHints(
  settings: Record<string, unknown> | null | undefined
): LearningLearnerActivityHints {
  const s = settings ?? {};
  return {
    is_required: asBool(s.is_required, true),
    max_attempts: asNumberOrNull(s.max_attempts),
    time_limit_seconds: asNumberOrNull(s.time_limit_seconds),
  };
}

/** True when attempt inputs must be disabled. */
export function isAttemptInputLocked(
  status: LearningLearnerAttemptView["status"],
  remainingSeconds: number | null
): boolean {
  if (status !== "active") return true;
  if (remainingSeconds === 0) return true;
  return false;
}

/** Learner-facing status copy (no scores / correctness). */
export function attemptStatusMessage(
  status: LearningLearnerAttemptView["status"]
): string {
  switch (status) {
    case "submitted":
      return LEARNING_LEARNER_SUBMITTED_MESSAGE;
    case "expired":
      return "This attempt has expired.";
    case "cancelled":
      return "This attempt was cancelled.";
    case "active":
    default:
      return "Attempt in progress.";
  }
}

export function filterPublishedCreatableBlocks(
  rows: LearningLessonContentBlock[]
): LearningLessonContentBlock[] {
  return rows
    .filter(
      (b) =>
        b.status === "published" && CREATABLE_BLOCK_TYPES.has(b.block_type)
    )
    .sort((a, b) => a.position - b.position);
}

function parseAttemptView(raw: unknown): LearningLearnerAttemptView | null {
  const row = asRecord(raw);
  if (!row) return null;
  const attemptId = asString(row.attempt_id);
  const activityId = asString(row.activity_id);
  const courseId = asString(row.course_id);
  const status = asString(row.status);
  if (!attemptId || !activityId || !courseId || !status) return null;
  if (
    status !== "active" &&
    status !== "submitted" &&
    status !== "expired" &&
    status !== "cancelled"
  ) {
    return null;
  }

  const snapshotRaw = Array.isArray(row.questions_snapshot)
    ? row.questions_snapshot
    : [];
  const questions_snapshot: LearningLearnerSnapshotQuestion[] = [];
  for (const item of snapshotRaw) {
    const q = asRecord(item);
    if (!q) continue;
    const question_id = asString(q.question_id);
    const question_type = asString(q.question_type);
    const position = asNumberOrNull(q.position);
    const content = asRecord(q.content) ?? {};
    if (!question_id || !question_type || position === null) continue;
    questions_snapshot.push({
      question_id,
      question_type: question_type as LearningAttemptAnswerableType,
      position,
      content,
      points: asNumberOrNull(q.points),
    });
  }
  questions_snapshot.sort((a, b) => a.position - b.position);

  const answersRaw = Array.isArray(row.answers) ? row.answers : [];
  const answers: LearningLearnerAttemptAnswer[] = [];
  for (const item of answersRaw) {
    const a = asRecord(item);
    if (!a) continue;
    const question_id = asString(a.question_id);
    const answer_payload = asRecord(a.answer_payload) ?? {};
    const first_answered_at = asString(a.first_answered_at) ?? "";
    const last_saved_at = asString(a.last_saved_at) ?? "";
    if (!question_id) continue;
    answers.push({
      question_id,
      answer_payload,
      first_answered_at,
      last_saved_at,
    });
  }

  return {
    attempt_id: attemptId,
    activity_id: activityId,
    course_id: courseId,
    status,
    attempt_number: asNumberOrNull(row.attempt_number) ?? 1,
    started_at: asString(row.started_at) ?? "",
    last_activity_at: asString(row.last_activity_at) ?? "",
    submitted_at: asString(row.submitted_at),
    expired_at: asString(row.expired_at),
    cancelled_at: asString(row.cancelled_at),
    time_limit_seconds: asNumberOrNull(row.time_limit_seconds),
    max_attempts: asNumberOrNull(row.max_attempts),
    remaining_seconds: asNumberOrNull(row.remaining_seconds),
    questions_snapshot,
    answers,
  };
}

/**
 * My Learning hub: active enrollments → accessible programs/courses.
 * Relies on owner RLS for enrollments and entitlement RLS for tree rows.
 */
export async function loadMyLearningHub(
  supabase: AnyClient,
  userId: string
): Promise<LearningDeliveryResult<LearningLearnerHub>> {
  const { data: enrollments, error } = await supabase
    .from("learning_enrollments")
    .select(
      "id, target_type, program_id, course_id, status, starts_at, expires_at"
    )
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    return { ok: false, message: errMessage(error, "Failed to load enrollments") };
  }

  const rows = enrollments ?? [];
  const programEnrollmentIds = new Map<string, string>();
  const courseEnrollmentIds = new Map<string, string>();

  for (const row of rows) {
    const id = asString(row.id);
    if (!id) continue;
    if (row.target_type === "program" && row.program_id) {
      programEnrollmentIds.set(String(row.program_id), id);
    } else if (row.target_type === "course" && row.course_id) {
      courseEnrollmentIds.set(String(row.course_id), id);
    }
  }

  const programs: LearningLearnerHubProgram[] = [];
  const programIds = [...programEnrollmentIds.keys()];
  if (programIds.length > 0) {
    const { data: programRows, error: programError } = await supabase
      .from("learning_programs")
      .select("id, name, slug, description, status")
      .in("id", programIds)
      .eq("status", "published");
    if (programError) {
      return {
        ok: false,
        message: errMessage(programError, "Failed to load programs"),
      };
    }
    for (const p of programRows ?? []) {
      const pid = asString(p.id);
      if (!pid) continue;
      programs.push({
        id: pid,
        name: asString(p.name) ?? "Program",
        slug: asString(p.slug) ?? pid,
        description: asString(p.description),
        enrollment_id: programEnrollmentIds.get(pid) ?? "",
      });
    }
  }

  const courses: LearningLearnerHubCourse[] = [];
  const courseIds = new Set<string>(courseEnrollmentIds.keys());

  if (programIds.length > 0) {
    const { data: viaProgram, error: viaError } = await supabase
      .from("learning_courses")
      .select("id, name, slug, description, program_id, status")
      .in("program_id", programIds)
      .eq("status", "published");
    if (viaError) {
      return {
        ok: false,
        message: errMessage(viaError, "Failed to load program courses"),
      };
    }
    const programNameById = new Map(programs.map((p) => [p.id, p.name]));
    for (const c of viaProgram ?? []) {
      const cid = asString(c.id);
      const programId = asString(c.program_id);
      if (!cid || !programId) continue;
      courseIds.add(cid);
      if (courseEnrollmentIds.has(cid)) continue;
      courses.push({
        id: cid,
        name: asString(c.name) ?? "Course",
        slug: asString(c.slug) ?? cid,
        description: asString(c.description),
        program_id: programId,
        program_name: programNameById.get(programId) ?? null,
        enrollment_id: programEnrollmentIds.get(programId) ?? null,
        via: "program_enrollment",
        progress: null,
        continue_href: null,
      });
    }
  }

  const directCourseIds = [...courseEnrollmentIds.keys()];
  if (directCourseIds.length > 0) {
    const { data: directCourses, error: courseError } = await supabase
      .from("learning_courses")
      .select("id, name, slug, description, program_id, status")
      .in("id", directCourseIds)
      .eq("status", "published");
    if (courseError) {
      return {
        ok: false,
        message: errMessage(courseError, "Failed to load courses"),
      };
    }

    const programIdsNeeded = [
      ...new Set(
        (directCourses ?? [])
          .map((c) => asString(c.program_id))
          .filter((v): v is string => Boolean(v))
      ),
    ];
    const programNameById = new Map(programs.map((p) => [p.id, p.name]));
    if (programIdsNeeded.length > 0) {
      const { data: extraPrograms } = await supabase
        .from("learning_programs")
        .select("id, name")
        .in("id", programIdsNeeded);
      for (const p of extraPrograms ?? []) {
        const pid = asString(p.id);
        if (pid) programNameById.set(pid, asString(p.name) ?? "Program");
      }
    }

    for (const c of directCourses ?? []) {
      const cid = asString(c.id);
      const programId = asString(c.program_id);
      if (!cid || !programId) continue;
      if (courses.some((x) => x.id === cid)) continue;
      courses.push({
        id: cid,
        name: asString(c.name) ?? "Course",
        slug: asString(c.slug) ?? cid,
        description: asString(c.description),
        program_id: programId,
        program_name: programNameById.get(programId) ?? null,
        enrollment_id: courseEnrollmentIds.get(cid) ?? null,
        via: "course_enrollment",
        progress: null,
        continue_href: null,
      });
    }
  }

  courses.sort((a, b) => a.name.localeCompare(b.name));
  programs.sort((a, b) => a.name.localeCompare(b.name));

  void courseIds;

  for (const course of courses) {
    const { data: courseProgressRaw, error: progressError } =
      await supabase.rpc(LEARNING_PROGRESS_RPCS.getCourseProgress, {
        p_course_id: course.id,
      });
    if (!progressError && courseProgressRaw) {
      course.progress = parseHubCourseProgress(courseProgressRaw);
    }

    const target = await resolveValidatedContinueLearningTarget(
      supabase,
      course.id,
      course.progress?.last_lesson_id ?? null
    );
    course.continue_href = target?.href ?? null;
  }

  return { ok: true, data: { programs, courses } };
}

function parseHubCourseProgress(
  raw: unknown
): LearningLearnerHubCourseProgress | null {
  const p = asRecord(raw);
  if (!p) return null;
  const status = asString(p.status) as LearningProgressStatus | null;
  if (
    status !== "not_started" &&
    status !== "in_progress" &&
    status !== "completed"
  ) {
    return null;
  }
  return {
    status,
    completed_lessons_count: asNumberOrNull(p.completed_lessons_count) ?? 0,
    total_lessons_count: asNumberOrNull(p.total_lessons_count) ?? 0,
    percent_complete: asNumberOrNull(p.percent_complete) ?? 0,
    last_lesson_id: asString(p.last_lesson_id),
  };
}

/**
 * Ordered published lesson ids for one course.
 * Published sections only, section position ascending, then lesson position.
 * Fail closed to [] on query errors / empty tree.
 */
async function loadOrderedPublishedLessonIdsForCourse(
  supabase: AnyClient,
  courseId: string
): Promise<string[]> {
  if (!courseId) return [];

  const { data: sections, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, position, status")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (sectionError || !sections?.length) return [];

  const sectionIds: string[] = [];
  for (const s of sections) {
    const sid = asString(s.id);
    if (sid) sectionIds.push(sid);
  }
  if (sectionIds.length === 0) return [];

  const { data: lessons, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, section_id, position, status")
    .in("section_id", sectionIds)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (lessonError || !lessons?.length) return [];

  const lessonsBySection = new Map<
    string,
    Array<{ id: string; position: number }>
  >();
  for (const lesson of lessons) {
    const lid = asString(lesson.id);
    const sectionId = asString(lesson.section_id);
    if (!lid || !sectionId) continue;
    const list = lessonsBySection.get(sectionId) ?? [];
    list.push({ id: lid, position: asNumberOrNull(lesson.position) ?? 0 });
    lessonsBySection.set(sectionId, list);
  }
  for (const list of lessonsBySection.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const ordered: string[] = [];
  for (const s of sections) {
    const sid = asString(s.id);
    if (!sid) continue;
    for (const lesson of lessonsBySection.get(sid) ?? []) {
      ordered.push(lesson.id);
    }
  }
  return ordered;
}

/** First published lesson per course (section position, then lesson position). */
async function loadFirstPublishedLessonIdsByCourse(
  supabase: AnyClient,
  courseIds: string[]
): Promise<Map<string, string>> {
  const firstByCourse = new Map<string, string>();
  if (courseIds.length === 0) return firstByCourse;

  const { data: sections, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, course_id, position, status")
    .in("course_id", courseIds)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (sectionError || !sections?.length) return firstByCourse;

  const sectionCourse = new Map<string, string>();
  const sectionIds: string[] = [];
  for (const s of sections) {
    const sid = asString(s.id);
    const courseId = asString(s.course_id);
    if (!sid || !courseId) continue;
    sectionCourse.set(sid, courseId);
    sectionIds.push(sid);
  }
  if (sectionIds.length === 0) return firstByCourse;

  const { data: lessons, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, section_id, position, status")
    .in("section_id", sectionIds)
    .eq("status", "published")
    .order("position", { ascending: true });
  if (lessonError || !lessons?.length) return firstByCourse;

  // Sections were ordered by position; keep that order when picking first lesson.
  const lessonsBySection = new Map<string, Array<{ id: string; position: number }>>();
  for (const lesson of lessons) {
    const lid = asString(lesson.id);
    const sectionId = asString(lesson.section_id);
    if (!lid || !sectionId) continue;
    const list = lessonsBySection.get(sectionId) ?? [];
    list.push({ id: lid, position: asNumberOrNull(lesson.position) ?? 0 });
    lessonsBySection.set(sectionId, list);
  }
  for (const list of lessonsBySection.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  for (const s of sections) {
    const sid = asString(s.id);
    const courseId = sid ? sectionCourse.get(sid) : null;
    if (!sid || !courseId || firstByCourse.has(courseId)) continue;
    const firstLesson = lessonsBySection.get(sid)?.[0];
    if (firstLesson) firstByCourse.set(courseId, firstLesson.id);
  }

  return firstByCourse;
}

export async function loadCourseOutline(
  supabase: AnyClient,
  courseId: string
): Promise<LearningDeliveryResult<LearningLearnerCourseOutline>> {
  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, name, slug, description, program_id, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError) {
    return { ok: false, message: errMessage(courseError, "Failed to load course") };
  }
  if (!course) {
    return { ok: false, message: "Course not found or not accessible" };
  }

  const { data: sections, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, name, slug, position, status")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("position", { ascending: true });

  if (sectionError) {
    return {
      ok: false,
      message: errMessage(sectionError, "Failed to load sections"),
    };
  }

  const sectionRows = sections ?? [];
  const sectionIds = sectionRows
    .map((s) => asString(s.id))
    .filter((v): v is string => Boolean(v));

  let lessonRows: Array<Record<string, unknown>> = [];
  if (sectionIds.length > 0) {
    const { data: lessons, error: lessonError } = await supabase
      .from("learning_lessons")
      .select("id, section_id, name, slug, position, status")
      .in("section_id", sectionIds)
      .eq("status", "published")
      .order("position", { ascending: true });
    if (lessonError) {
      return {
        ok: false,
        message: errMessage(lessonError, "Failed to load lessons"),
      };
    }
    lessonRows = (lessons ?? []) as Array<Record<string, unknown>>;
  }

  const progressByLesson = new Map<string, LearningProgressStatus>();
  const { data: lessonProgress } = await supabase
    .from("learning_lesson_progress")
    .select("lesson_id, status")
    .eq("course_id", courseId);
  for (const row of lessonProgress ?? []) {
    const lid = asString(row.lesson_id);
    const st = asString(row.status) as LearningProgressStatus | null;
    if (lid && st) progressByLesson.set(lid, st);
  }

  let progress: LearningLearnerCourseOutline["progress"] = null;
  const { data: courseProgressRaw, error: progressError } = await supabase.rpc(
    LEARNING_PROGRESS_RPCS.getCourseProgress,
    { p_course_id: courseId }
  );
  if (!progressError && courseProgressRaw) {
    const p = asRecord(courseProgressRaw);
    if (p) {
      progress = {
        status: (asString(p.status) as LearningProgressStatus) ?? "not_started",
        completed_lessons_count: asNumberOrNull(p.completed_lessons_count) ?? 0,
        total_lessons_count: asNumberOrNull(p.total_lessons_count) ?? 0,
        percent_complete: asNumberOrNull(p.percent_complete) ?? 0,
        last_lesson_id: asString(p.last_lesson_id),
      };
    }
  }

  const lessonsBySection = new Map<string, LearningLearnerOutlineLesson[]>();
  for (const lesson of lessonRows) {
    const lid = asString(lesson.id);
    const sectionId = asString(lesson.section_id);
    if (!lid || !sectionId) continue;
    const list = lessonsBySection.get(sectionId) ?? [];
    list.push({
      id: lid,
      name: asString(lesson.name) ?? "Lesson",
      slug: asString(lesson.slug) ?? lid,
      position: asNumberOrNull(lesson.position) ?? 0,
      progress_status: progressByLesson.get(lid) ?? "not_started",
    });
    lessonsBySection.set(sectionId, list);
  }

  const outlineSections: LearningLearnerOutlineSection[] = sectionRows.map(
    (s) => {
      const sid = asString(s.id) ?? "";
      return {
        id: sid,
        name: asString(s.name) ?? "Section",
        slug: asString(s.slug) ?? sid,
        position: asNumberOrNull(s.position) ?? 0,
        lessons: (lessonsBySection.get(sid) ?? []).sort(
          (a, b) => a.position - b.position
        ),
      };
    }
  );

  return {
    ok: true,
    data: {
      course: {
        id: asString(course.id) ?? courseId,
        name: asString(course.name) ?? "Course",
        slug: asString(course.slug) ?? courseId,
        description: asString(course.description),
        program_id: asString(course.program_id) ?? "",
      },
      sections: outlineSections,
      progress,
    },
  };
}

type LessonShellContext = {
  lessonId: string;
  sectionId: string;
  courseId: string;
  lesson: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    section_id: string;
    course_id: string;
    course_name: string;
  };
};

async function loadLessonShellContext(
  supabase: AnyClient,
  lessonId: string
): Promise<LearningDeliveryResult<LessonShellContext>> {
  const { data: lesson, error: lessonError } = await supabase
    .from("learning_lessons")
    .select("id, section_id, name, slug, description, status")
    .eq("id", lessonId)
    .eq("status", "published")
    .maybeSingle();

  if (lessonError) {
    return { ok: false, message: errMessage(lessonError, "Failed to load lesson") };
  }
  if (!lesson) {
    return { ok: false, message: "Lesson not found or not accessible" };
  }

  const sectionId = asString(lesson.section_id);
  if (!sectionId) {
    return { ok: false, message: "Lesson is missing section" };
  }

  const { data: section, error: sectionError } = await supabase
    .from("learning_sections")
    .select("id, course_id, status")
    .eq("id", sectionId)
    .eq("status", "published")
    .maybeSingle();

  if (sectionError || !section) {
    return {
      ok: false,
      message: errMessage(sectionError, "Section not found or not accessible"),
    };
  }

  const courseId = asString(section.course_id);
  if (!courseId) {
    return { ok: false, message: "Section is missing course" };
  }

  const { data: course } = await supabase
    .from("learning_courses")
    .select("id, name, status")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (!course) {
    return { ok: false, message: "Course not found or not accessible" };
  }

  return {
    ok: true,
    data: {
      lessonId: asString(lesson.id) ?? lessonId,
      sectionId,
      courseId,
      lesson: {
        id: asString(lesson.id) ?? lessonId,
        name: asString(lesson.name) ?? "Lesson",
        slug: asString(lesson.slug) ?? lessonId,
        description: asString(lesson.description),
        section_id: sectionId,
        course_id: courseId,
        course_name: asString(course.name) ?? "Course",
      },
    },
  };
}

async function loadLessonShellFields(
  supabase: AnyClient,
  ctx: LessonShellContext
): Promise<LearningLearnerLessonShell> {
  let progress_status: LearningProgressStatus = "not_started";
  const { data: progressRow } = await supabase
    .from("learning_lesson_progress")
    .select("status")
    .eq("lesson_id", ctx.lessonId)
    .maybeSingle();
  const st = asString(progressRow?.status) as LearningProgressStatus | null;
  if (st) progress_status = st;

  // Adjacent nav is best-effort — never fail lesson delivery for nav errors.
  let previous_lesson: LearningLessonNavTarget | null = null;
  let next_lesson: LearningLessonNavTarget | null = null;
  try {
    const orderedIds = await loadOrderedPublishedLessonIdsForCourse(
      supabase,
      ctx.courseId
    );
    const adjacent = resolveAdjacentLessonTargets({
      current_lesson_id: ctx.lessonId,
      ordered_lesson_ids: orderedIds,
    });
    previous_lesson = adjacent.previous;
    next_lesson = adjacent.next;
  } catch {
    previous_lesson = null;
    next_lesson = null;
  }

  return {
    lesson: ctx.lesson,
    progress_status,
    previous_lesson,
    next_lesson,
  };
}

/**
 * True only when the engine gate positively proves unlock.
 * Locked / unavailable / unverified must use metadata-only delivery.
 */
export function isVerifiedUnlockedLessonAccess(
  access: LearningLessonContentAccess
): boolean {
  return (
    access.state === "verified_unlocked" && access.canRenderProtectedContent
  );
}

/**
 * Metadata-only lesson delivery — safe before unlock proof.
 * Does not SELECT content blocks or activities, and never mutates progress.
 */
export async function loadLessonDeliveryMetadata(
  supabase: AnyClient,
  lessonId: string
): Promise<LearningDeliveryResult<LearningLearnerLessonMetadataDelivery>> {
  const ctxResult = await loadLessonShellContext(supabase, lessonId);
  if (!ctxResult.ok) return ctxResult;

  const shell = await loadLessonShellFields(supabase, ctxResult.data);
  return {
    ok: true,
    data: {
      delivery_kind: "metadata_only",
      ...shell,
    },
  };
}

/**
 * Protected/full lesson delivery — call only after `verified_unlocked`.
 * Loads content blocks + activities and runs progress start/touch.
 */
export async function loadLessonDeliveryProtected(
  supabase: AnyClient,
  lessonId: string
): Promise<LearningDeliveryResult<LearningLearnerLessonProtectedDelivery>> {
  const ctxResult = await loadLessonShellContext(supabase, lessonId);
  if (!ctxResult.ok) return ctxResult;

  const { lessonId: resolvedLessonId } = ctxResult.data;

  // Progress heartbeat — only on the verified-unlocked path.
  await supabase.rpc(LEARNING_PROGRESS_RPCS.startLesson, {
    p_lesson_id: resolvedLessonId,
  });
  await supabase.rpc(LEARNING_PROGRESS_RPCS.touchLesson, {
    p_lesson_id: resolvedLessonId,
  });

  const { data: blockRows, error: blockError } = await supabase
    .from("learning_lesson_content_blocks")
    .select(
      "id, lesson_id, block_type, status, position, content, created_by, updated_by, created_at, updated_at, published_at, suspended_at, archived_at"
    )
    .eq("lesson_id", resolvedLessonId)
    .eq("status", "published")
    .order("position", { ascending: true });

  if (blockError) {
    return {
      ok: false,
      message: errMessage(blockError, "Failed to load content blocks"),
    };
  }

  const blocks = filterPublishedCreatableBlocks(
    (blockRows ?? []) as LearningLessonContentBlock[]
  );

  const { data: activityRows, error: activityError } = await supabase
    .from("learning_activities")
    .select("id, name, slug, type, description, position, status")
    .eq("lesson_id", resolvedLessonId)
    .eq("status", "published")
    .order("position", { ascending: true });

  if (activityError) {
    return {
      ok: false,
      message: errMessage(activityError, "Failed to load activities"),
    };
  }

  const activityIds = (activityRows ?? [])
    .map((a) => asString(a.id))
    .filter((v): v is string => Boolean(v));

  const hintsByActivity = new Map<string, LearningLearnerActivityHints>();
  if (activityIds.length > 0) {
    const { data: settingsRows } = await supabase
      .from("learning_activity_settings")
      .select("activity_id, is_required, max_attempts, time_limit_seconds")
      .in("activity_id", activityIds);
    for (const s of settingsRows ?? []) {
      const aid = asString(s.activity_id);
      if (!aid) continue;
      hintsByActivity.set(
        aid,
        toLearnerActivityHints(s as Record<string, unknown>)
      );
    }
  }

  const activities: LearningLearnerActivitySummary[] = (activityRows ?? []).map(
    (a) => {
      const id = asString(a.id) ?? "";
      return {
        id,
        name: asString(a.name) ?? "Activity",
        slug: asString(a.slug) ?? id,
        type: asString(a.type) ?? "quiz",
        description: asString(a.description),
        position: asNumberOrNull(a.position) ?? 0,
        hints:
          hintsByActivity.get(id) ??
          toLearnerActivityHints({
            is_required: true,
            max_attempts: null,
            time_limit_seconds: null,
          }),
      };
    }
  );

  const shell = await loadLessonShellFields(supabase, ctxResult.data);
  return {
    ok: true,
    data: {
      delivery_kind: "verified_full",
      ...shell,
      blocks,
      activities,
    },
  };
}

/**
 * Engine-gated delivery loader.
 * Protected SELECTs + progress mutations only when access is verified_unlocked.
 */
export async function loadLessonDeliveryForAccess(
  supabase: AnyClient,
  lessonId: string,
  access: LearningLessonContentAccess
): Promise<LearningDeliveryResult<LearningLearnerLessonDelivery>> {
  if (isVerifiedUnlockedLessonAccess(access)) {
    return loadLessonDeliveryProtected(supabase, lessonId);
  }
  return loadLessonDeliveryMetadata(supabase, lessonId);
}

/**
 * Compose lesson-engine unlock access with the course accessible published
 * lesson set (same source as Resume / Prev / Next). Must run before protected
 * delivery so progress mutations never start for out-of-tree lesson ids.
 */
export async function resolveComposedLessonLearnerAccess(
  supabase: AnyClient,
  lessonId: string,
  engineResult:
    | LessonEngineResult<LearningLessonEnginePayload>
    | null
    | undefined
): Promise<LearningLessonContentAccess> {
  const access = resolveLessonContentAccess(engineResult);
  const ctx = await loadLessonShellContext(supabase, lessonId);
  if (!ctx.ok) {
    if (
      access.state === "engine_unavailable" ||
      access.state === "access_unverified"
    ) {
      return access;
    }
    return {
      state: "access_unverified",
      canRenderProtectedContent: false,
      engine: null,
      unlock: null,
      message: LEARNING_LESSON_ACCESS_UNVERIFIED_MESSAGE,
    };
  }

  const accessibleLessonIds = await loadAccessiblePublishedLessonIdsForCourse(
    supabase,
    ctx.data.courseId
  );
  return composeLessonContentAccessWithAccessibleSet(access, {
    lessonId,
    accessibleLessonIds,
  });
}

export async function loadPublishedActivityGate(
  supabase: AnyClient,
  activityId: string
): Promise<
  LearningDeliveryResult<{
    activity: LearningLearnerActivitySummary;
    lesson_id: string;
    course_id: string;
    active_attempt_id: string | null;
  }>
> {
  const { data: activity, error } = await supabase
    .from("learning_activities")
    .select("id, lesson_id, name, slug, type, description, position, status")
    .eq("id", activityId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    return { ok: false, message: errMessage(error, "Failed to load activity") };
  }
  if (!activity) {
    return { ok: false, message: "Activity not found or not accessible" };
  }

  const lessonId = asString(activity.lesson_id);
  if (!lessonId) {
    return { ok: false, message: "Activity is missing lesson" };
  }

  const { data: lesson } = await supabase
    .from("learning_lessons")
    .select("id, section_id, status")
    .eq("id", lessonId)
    .eq("status", "published")
    .maybeSingle();
  if (!lesson) {
    return { ok: false, message: "Lesson not found or not accessible" };
  }

  const { data: section } = await supabase
    .from("learning_sections")
    .select("id, course_id, status")
    .eq("id", lesson.section_id)
    .eq("status", "published")
    .maybeSingle();
  if (!section?.course_id) {
    return { ok: false, message: "Course not found or not accessible" };
  }

  const { data: settings } = await supabase
    .from("learning_activity_settings")
    .select("activity_id, is_required, max_attempts, time_limit_seconds")
    .eq("activity_id", activityId)
    .maybeSingle();

  const { data: activeAttempt } = await supabase
    .from("learning_attempts")
    .select("id")
    .eq("activity_id", activityId)
    .eq("status", "active")
    .maybeSingle();

  return {
    ok: true,
    data: {
      activity: {
        id: asString(activity.id) ?? activityId,
        name: asString(activity.name) ?? "Activity",
        slug: asString(activity.slug) ?? activityId,
        type: asString(activity.type) ?? "quiz",
        description: asString(activity.description),
        position: asNumberOrNull(activity.position) ?? 0,
        hints: toLearnerActivityHints(
          (settings as Record<string, unknown> | null) ?? null
        ),
      },
      lesson_id: lessonId,
      course_id: String(section.course_id),
      active_attempt_id: asString(activeAttempt?.id) ?? null,
    },
  };
}

export async function startOrResumeLearningAttempt(
  supabase: AnyClient,
  activityId: string
): Promise<LearningDeliveryResult<LearningStartAttemptResult>> {
  const { data, error } = await supabase.rpc(LEARNING_ATTEMPT_RPCS.start, {
    p_activity_id: activityId,
  });
  if (error) {
    return { ok: false, message: errMessage(error, "Failed to start attempt") };
  }
  const row = asRecord(data);
  const attemptId = asString(row?.attempt_id);
  if (!row || !attemptId) {
    return { ok: false, message: "Start attempt returned an empty result" };
  }
  return {
    ok: true,
    data: {
      attempt_id: attemptId,
      activity_id: asString(row.activity_id) ?? activityId,
      status: asString(row.status) ?? "active",
      attempt_number: asNumberOrNull(row.attempt_number) ?? 1,
      started_at: asString(row.started_at) ?? "",
      resumed: asBool(row.resumed, false),
    },
  };
}

export async function getMyLearningAttemptView(
  supabase: AnyClient,
  attemptId: string
): Promise<LearningDeliveryResult<LearningLearnerAttemptView>> {
  const { data, error } = await supabase.rpc(LEARNING_ATTEMPT_RPCS.getMine, {
    p_attempt_id: attemptId,
  });
  if (error) {
    return { ok: false, message: errMessage(error, "Failed to load attempt") };
  }
  const view = parseAttemptView(data);
  if (!view) {
    return { ok: false, message: "Attempt payload was invalid" };
  }
  return { ok: true, data: view };
}

export async function saveLearningAttemptAnswer(
  supabase: AnyClient,
  attemptId: string,
  questionId: string,
  answerPayload: Record<string, unknown>
): Promise<LearningDeliveryResult<{ saved: true }>> {
  const { error } = await supabase.rpc(LEARNING_ATTEMPT_RPCS.saveAnswer, {
    p_attempt_id: attemptId,
    p_question_id: questionId,
    p_answer_payload: answerPayload,
  });
  if (error) {
    return { ok: false, message: errMessage(error, "Failed to save answer") };
  }
  return { ok: true, data: { saved: true } };
}

export async function submitLearningAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<LearningDeliveryResult<{ status: string }>> {
  const { data, error } = await supabase.rpc(LEARNING_ATTEMPT_RPCS.submit, {
    p_attempt_id: attemptId,
  });
  if (error) {
    return { ok: false, message: errMessage(error, "Failed to submit attempt") };
  }
  const row = asRecord(data);
  return {
    ok: true,
    data: { status: asString(row?.status) ?? "submitted" },
  };
}

export async function cancelLearningAttempt(
  supabase: AnyClient,
  attemptId: string
): Promise<LearningDeliveryResult<{ status: string }>> {
  const { data, error } = await supabase.rpc(LEARNING_ATTEMPT_RPCS.cancel, {
    p_attempt_id: attemptId,
  });
  if (error) {
    return { ok: false, message: errMessage(error, "Failed to cancel attempt") };
  }
  const row = asRecord(data);
  return {
    ok: true,
    data: { status: asString(row?.status) ?? "cancelled" },
  };
}

/**
 * Mark the current learner's lesson complete via existing progress RPC.
 * Idempotent. Does not reopen; does not write progress tables directly.
 */
export async function completeMyLearningLesson(
  supabase: AnyClient,
  lessonId: string
): Promise<LearningDeliveryResult<LearningLessonCompleteView>> {
  if (!isLearningLessonDeliveryUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const { data, error } = await supabase.rpc(
    LEARNING_PROGRESS_RPCS.completeLesson,
    { p_lesson_id: lessonId }
  );
  if (error) {
    return {
      ok: false,
      message: sanitizeLearningLessonCompletionError(error.message),
    };
  }
  const parsed = parseLearningLessonCompleteView(data, lessonId);
  if (!parsed) {
    return { ok: false, message: "Lesson completion payload is malformed." };
  }
  return { ok: true, data: parsed };
}

/** Documented RPC surface this slice may call. */
export const LEARNING_LEARNER_DELIVERY_RPCS = {
  attempts: LEARNING_ATTEMPT_RPCS,
  progress: {
    startLesson: LEARNING_PROGRESS_RPCS.startLesson,
    touchLesson: LEARNING_PROGRESS_RPCS.touchLesson,
    completeLesson: LEARNING_PROGRESS_RPCS.completeLesson,
    getCourseProgress: LEARNING_PROGRESS_RPCS.getCourseProgress,
  },
  enrollments: {
    enrollProgram: LEARNING_ENROLLMENT_RPCS.enrollProgram,
    enrollCourse: LEARNING_ENROLLMENT_RPCS.enrollCourse,
  },
} as const;

/** Staff activity RPCs — never used by learner delivery. */
export const LEARNING_LEARNER_STAFF_ACTIVITY_RPCS = LEARNING_ACTIVITY_RPCS;
