/**
 * UM Learning OS — Progress Mutations + Completion-mode Progress V1.
 *
 * DB-authoritative. Lesson-level progress only (no activity_progress table).
 *
 * Score path (20260845): after trusted scored state inside
 * learning_scoring_apply_attempt_result.
 *
 * Submit path (20260848): after trusted submitted state inside
 * submit_learning_attempt when completion_mode='submit'.
 *
 * Locked decisions:
 * - passing_score IS NULL + completion_mode='score' → scored is enough
 * - completion_mode='submit' → attempt.status='submitted' is enough
 * - completion_mode view|manual remain blocked (no auto-apply)
 * - First qualifying attempt per (user, activity) applies progress once
 */

export const LEARNING_PROGRESS_MUTATIONS_MIGRATION =
  "20260845_learning_progress_mutations_v1.sql" as const;

export const LEARNING_COMPLETION_MODE_PROGRESS_MIGRATION =
  "20260848_learning_completion_mode_progress_v1.sql" as const;

/** Extended completion_source (foundation had manual only). */
export const LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES = [
  "manual",
  "scored_attempt",
  "submitted_attempt",
] as const;
export type LearningProgressMutationsCompletionSource =
  (typeof LEARNING_PROGRESS_MUTATIONS_COMPLETION_SOURCES)[number];

/** Score-path completion_mode (Progress Mutations V1). */
export const LEARNING_PROGRESS_MUTATIONS_COMPLETION_MODE = "score" as const;

/** Submit-path completion_mode (Completion-mode Progress V1). */
export const LEARNING_COMPLETION_MODE_PROGRESS_SUBMIT_MODE = "submit" as const;

/** Modes that participate in automatic progress apply. */
export const LEARNING_COMPLETION_MODE_PROGRESS_ENABLED_MODES = [
  "score",
  "submit",
] as const;

/** Modes explicitly blocked from automatic progress apply. */
export const LEARNING_COMPLETION_MODE_PROGRESS_BLOCKED_MODES = [
  "view",
  "manual",
] as const;

/**
 * Modes left unchanged by Progress Mutations V1 migration 20260845
 * (submit enabled later in 20260848).
 */
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

export const LEARNING_COMPLETION_MODE_PROGRESS_INTERNAL_HELPERS = {
  tryApplyFromSubmittedAttempt:
    "learning_progress_try_apply_from_submitted_attempt",
  completeLessonFromSubmittedAttempt:
    "learning_progress_complete_lesson_from_submitted_attempt",
} as const;

/** Hook host — scoring apply remains the score write path that triggers apply. */
export const LEARNING_PROGRESS_MUTATIONS_HOOK_HOST =
  "learning_scoring_apply_attempt_result" as const;

/** Hook host — submit RPC triggers submit-mode progress apply. */
export const LEARNING_COMPLETION_MODE_PROGRESS_HOOK_HOST =
  "submit_learning_attempt" as const;

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

export const LEARNING_COMPLETION_MODE_PROGRESS_SKIP_REASONS = [
  "attempt_not_submitted",
  "completion_mode_not_submit",
  "activity_already_applied",
  "activity_already_applied_concurrent",
] as const;
export type LearningCompletionModeProgressSkipReason =
  (typeof LEARNING_COMPLETION_MODE_PROGRESS_SKIP_REASONS)[number];

export const LEARNING_PROGRESS_MUTATIONS_AUDIT_ACTIONS = {
  lessonCompleteScoredAttempt: "progress.lesson_complete_scored_attempt",
  attemptScoredApply: "progress.attempt_scored_apply",
} as const;

export const LEARNING_COMPLETION_MODE_PROGRESS_AUDIT_ACTIONS = {
  lessonCompleteSubmittedAttempt: "progress.lesson_complete_submitted_attempt",
  attemptSubmittedApply: "progress.attempt_submitted_apply",
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

/**
 * Gate for completion_mode='submit' (mirrors SQL).
 * Trusted submitted attempt status is enough.
 */
export function learningProgressSubmitCompletes(input: {
  completionMode: string;
  attemptStatus: string;
}): boolean {
  if (input.completionMode !== LEARNING_COMPLETION_MODE_PROGRESS_SUBMIT_MODE) {
    return false;
  }
  return input.attemptStatus === "submitted";
}
