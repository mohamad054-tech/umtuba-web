/**
 * UM Learning OS — Progress Foundation V1 constants & types.
 * DB-authoritative via learning progress RPCs; this module mirrors SQL contracts.
 *
 * Progress records LEARNING STATE for a learner in a Course / Lesson.
 * It is NOT payment, enrollment entitlement, certificate, attempt, submission,
 * grade, AI grading, or Activity progress (deferred to Attempts).
 *
 * Access writes require live has_learning_course_access (admin OR course manager
 * OR active course enrollment OR active parent program enrollment).
 */

export const LEARNING_PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export type LearningProgressStatus =
  (typeof LEARNING_PROGRESS_STATUSES)[number];

/** Foundation V1: manual. Progress Mutations V1 (20260845): scored_attempt. */
export const LEARNING_LESSON_COMPLETION_SOURCES = [
  "manual",
  "scored_attempt",
] as const;
export type LearningLessonCompletionSource =
  (typeof LEARNING_LESSON_COMPLETION_SOURCES)[number];

export const LEARNING_PROGRESS_EVENT_TYPES = [
  "lesson_started",
  "lesson_resumed",
  "lesson_completed",
  "lesson_reopened",
  "lesson_touched",
  "course_rollup_updated",
  "course_completed",
  "certificate_issued",
] as const;
export type LearningProgressEventType =
  (typeof LEARNING_PROGRESS_EVENT_TYPES)[number];

export type LearningLessonProgress = {
  id: string;
  space_id: string;
  course_id: string;
  lesson_id: string;
  user_id: string;
  enrollment_id: string | null;
  status: LearningProgressStatus;
  completion_source: LearningLessonCompletionSource | null;
  started_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
  first_completed_at: string | null;
  /** Continue-watching media offset (20260863). */
  last_media_position_seconds: number | null;
  /** Last content block pointer for resume (20260863). */
  last_content_block_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningCourseProgress = {
  id: string;
  space_id: string;
  course_id: string;
  user_id: string;
  enrollment_id: string | null;
  status: LearningProgressStatus;
  /** DB-authored count of completed published lessons. */
  completed_lessons_count: number;
  /** DB-authored count of published lessons in the course. */
  total_lessons_count: number;
  /** DB-computed only — never accepted from clients. */
  percent_complete: number;
  last_lesson_id: string | null;
  /**
   * Optional last activity pointer. Progress Mutations V1 may set this when
   * completing from a scored attempt. Still no activity_progress table.
   */
  last_activity_id: string | null;
  started_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
  first_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningProgressEvent = {
  id: string;
  space_id: string | null;
  course_id: string | null;
  lesson_id: string | null;
  user_id: string;
  actor_user_id: string | null;
  event_type: LearningProgressEventType;
  from_status: LearningProgressStatus | null;
  to_status: LearningProgressStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const LEARNING_PROGRESS_RPCS = {
  startLesson: "start_learning_lesson",
  touchLesson: "touch_learning_lesson",
  completeLesson: "complete_learning_lesson",
  reopenLesson: "reopen_learning_lesson",
  getCourseProgress: "get_learning_course_progress",
  recomputeCourseProgress: "recompute_learning_course_progress",
} as const;

/**
 * Progress-adjacent RPCs from First Course Readiness (20260863). Kept separate
 * so V1 progress tests continue to assert only against 20260835.
 */
export const LEARNING_PROGRESS_READINESS_RPCS = {
  upsertMediaPosition: "upsert_my_learning_lesson_media_position",
  recomputeSectionProgress: "recompute_learning_section_progress",
  getMySectionProgress: "get_my_learning_section_progress",
  getCourseProgressBundle: "get_my_learning_course_progress_bundle",
} as const;

export const LEARNING_PROGRESS_HELPERS = {
  /** Expanded in 20260835 to include parent program enrollment inheritance. */
  hasCourseAccess: "has_learning_course_access",
  recomputeCourse: "learning_progress_recompute_course",
  resolveEnrollment: "learning_progress_resolve_enrollment_id",
  loadLessonContext: "learning_progress_load_lesson_context",
  eventWrite: "learning_progress_event_write",
} as const;

export const LEARNING_PROGRESS_AUDIT_ACTIONS = {
  lessonStart: "progress.lesson_start",
  lessonComplete: "progress.lesson_complete",
  lessonReopen: "progress.lesson_reopen",
} as const;
