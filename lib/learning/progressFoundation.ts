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

export const LEARNING_LESSON_COMPLETION_SOURCES = ["manual"] as const;
export type LearningLessonCompletionSource =
  (typeof LEARNING_LESSON_COMPLETION_SOURCES)[number];

export const LEARNING_PROGRESS_EVENT_TYPES = [
  "lesson_started",
  "lesson_resumed",
  "lesson_completed",
  "lesson_reopened",
  "lesson_touched",
  "course_rollup_updated",
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
  /** Reserved; always null in V1 (no activity progress). */
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
