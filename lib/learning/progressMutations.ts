/**
 * UM Learning OS — Progress Mutations After Scored Attempts V1.
 *
 * DB-authoritative. Lesson-level progress only (no activity_progress table).
 * Triggered after trusted scored state inside learning_scoring_apply_attempt_result.
 *
 * Locked decisions:
 * - passing_score IS NULL + completion_mode='score' → scored is enough
 * - First qualifying attempt per (user, activity) applies progress once
 */

export const LEARNING_PROGRESS_MUTATIONS_MIGRATION =
  "20260845_learning_progress_mutations_v1.sql" as const;

/** Extended completion_source (foundation had manual only). */
export const LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES = [
  "manual",
  "scored_attempt",
] as const;
export type LearningProgressMutationsCompletionSource =
  (typeof LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES)[number];

/** Only this completion_mode participates in Progress Mutations V1. */
export const LEARNING_PROGRESS_MUTATIONS_COMPLETION_MODE = "score" as const;

/** Modes explicitly left unchanged by this slice. */
export const LEARNING_PROGRESS_MUTATIONS_UNCHANGED_COMPLETION_MODES = [
  "view",
  "submit",
  "manual",
] as const;

export const LEARNING_PROGRESS_MUTATIONS_INTERNAL_HELPERS = {
  tryApplyFromScoredAttempt:
    "learning_progress_try_apply_from_scored_attempt",
  completeLessonFromScoredAttempt:
    "learning_progress_complete_lesson_from_scored_attempt",
} as const;

/** Hook host — scoring apply remains the single write path that triggers apply. */
export const LEARNING_PROGRESS_MUTATIONS_HOOK_HOST =
  "learning_scoring_apply_attempt_result" as const;

export const LEARNING_PROGRESS_MUTATIONS_APPLICATION_TABLE =
  "learning_attempt_progress_applications" as const;

export const LEARNING_PROGRESS_MUTATIONS_APPLY_STATUSES = [
  "applied",
  "idempotent",
  "skipped",
] as const;
export type LearningProgressMutationsApplyStatus =
  (typeof LEARNING_PROGRESS_MUTATIONS_APPLY_STATUSES)[number];

export const LEARNING_PROGRESS_MUTATIONS_SKIP_REASONS = [
  "attempt_not_submitted",
  "completion_mode_not_score",
  "attempt_not_scored",
  "passing_score_not_met",
  "activity_already_applied",
  "activity_already_applied_concurrent",
] as const;
export type LearningProgressMutationsSkipReason =
  (typeof LEARNING_PROGRESS_MUTATIONS_SKIP_REASONS)[number];

export const LEARNING_PROGRESS_MUTATIONS_AUDIT_ACTIONS = {
  lessonCompleteScoredAttempt: "progress.lesson_complete_scored_attempt",
  attemptScoredApply: "progress.attempt_scored_apply",
} as const;

export type LearningAttemptProgressApplication = {
  attempt_id: string;
  user_id: string;
  activity_id: string;
  lesson_id: string;
  course_id: string;
  space_id: string;
  applied_at: string;
  applied_by: string;
  created_at: string;
};

/**
 * Pass gate for completion_mode='score' (mirrors SQL).
 * - passing_score null → scored is enough
 * - passing_score set → require passed === true
 */
export function learningProgressScoreCompletes(input: {
  completionMode: string;
  passingScore: number | null;
  resultStatus: string;
  passed: boolean | null;
}): boolean {
  if (input.completionMode !== LEARNING_PROGRESS_MUTATIONS_COMPLETION_MODE) {
    return false;
  }
  if (input.resultStatus !== "scored") {
    return false;
  }
  if (input.passingScore == null) {
    return true;
  }
  return input.passed === true;
}
