/**
 * UM Learning OS — Scoring Foundation V1 constants & types.
 * DB-authoritative via `score_learning_attempt`; this module mirrors the SQL
 * contracts in
 * `supabase/migrations/20260839_learning_scoring_foundation_v1.sql`.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson → Activity → Attempt
 *                                                       ↘ Attempt Answers
 *                                                       ↘ Attempt Result
 *                                                          ↘ Answer Results
 *
 * A Score/Result is an evaluation record for a submitted Attempt — NOT a
 * session, Progress mutation, certificate, or learner-facing delivery surface.
 * Results live in SEPARATE tables from `learning_attempts` /
 * `learning_attempt_answers` (Decision D1). Scoring is staff-only auto
 * evaluation (`evaluation_mode = 'auto'`) with exact-match rules only.
 *
 * ANSWER-KEY FIREWALL: keys remain in `learning_question_answer_keys` and are
 * read ONLY inside SECURITY DEFINER scoring helpers. They are never snapshotted
 * into `questions_snapshot` (snapshot gains `points` only), never returned from
 * the score RPC, and never audited as payloads. Learners have NO SELECT policy
 * on result tables and no result-delivery RPC.
 */

/** V1 successful outcome state for attempt results. */
export const LEARNING_ATTEMPT_RESULT_STATUSES = ["scored"] as const;
export type LearningAttemptResultStatus =
  (typeof LEARNING_ATTEMPT_RESULT_STATUSES)[number];

/**
 * Question types scoreable by exact-match auto evaluation. Mirrors Attempts
 * answerable / Questions creatable types.
 */
export const LEARNING_SCORING_ANSWERABLE_TYPES = [
  "multiple_choice_single",
  "multiple_choice_multiple",
  "true_false",
  "short_answer",
  "fill_blank",
  "numeric",
] as const;
export type LearningScoringAnswerableType =
  (typeof LEARNING_SCORING_ANSWERABLE_TYPES)[number];

/**
 * LEARNER-SAFE snapshot element after Scoring Foundation V1 (points only —
 * NEVER answer keys). Pre-extension snapshots missing the `points` key are not
 * scoreable (fail closed).
 */
export type LearningScoringSnapshotQuestion = {
  question_id: string;
  question_type: LearningScoringAnswerableType;
  position: number;
  /** Learner-visible structure only (prompt + options/blanks). */
  content: Record<string, unknown>;
  /** Snapshotted from learning_questions.points at attempt start (null → 0). */
  points: number | null;
};

/**
 * 1:1 evaluation record for a scored attempt. Scope columns are copied from the
 * parent attempt at score time — never client-supplied.
 */
export type LearningAttemptResult = {
  attempt_id: string;
  space_id: string;
  course_id: string;
  activity_id: string;
  user_id: string;
  status: LearningAttemptResultStatus;
  score_earned: number;
  score_max: number;
  /** null when activity passing_score was null at score time. */
  passed: boolean | null;
  max_score_snapshot: number | null;
  passing_score_snapshot: number | null;
  /** Always 'auto' in V1. */
  evaluation_mode_snapshot: "auto";
  scored_at: string;
  scored_by: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Per-question exact-match result. Unanswered → is_correct false, points_earned
 * 0. Never stores answer keys or learner payloads.
 */
export type LearningAttemptAnswerResult = {
  id: string;
  attempt_id: string;
  question_id: string;
  is_correct: boolean;
  points_possible: number;
  points_earned: number;
  created_at: string;
  updated_at: string;
};

/** Staff-safe per-question summary returned by score_learning_attempt. */
export type LearningScoreAnswerResultSummary = {
  question_id: string;
  is_correct: boolean;
  points_earned: number;
  points_possible: number;
};

/** Staff-safe return payload from score_learning_attempt (never keys/payloads). */
export type LearningScoreAttemptResponse = {
  attempt_id: string;
  score_earned: number;
  score_max: number;
  passed: boolean | null;
  scored_at: string;
  answer_results: LearningScoreAnswerResultSummary[];
};

export const LEARNING_SCORING_RPCS = {
  score: "score_learning_attempt",
} as const;

export const LEARNING_SCORING_HELPERS = {
  normalizeShortAnswer: "learning_scoring_normalize_short_answer",
  evaluateAnswer: "learning_scoring_evaluate_answer",
  /** Additive REPLACE in Scoring migration — adds points to snapshot elements. */
  buildSnapshot: "learning_attempt_build_questions_snapshot",
} as const;

export const LEARNING_SCORING_AUDIT_ACTIONS = {
  score: "attempt.score",
} as const;

/**
 * Exact-match rules (documentation / test mirror of SQL). No partial credit.
 */
export const LEARNING_SCORING_EXACT_MATCH_RULES = {
  multiple_choice_single: "selected_key equals answer_key.correct_key",
  multiple_choice_multiple:
    "set equality: selected_keys ≡ correct_keys (order irrelevant)",
  true_false: "value equals answer_key.correct (boolean)",
  short_answer:
    "normalized text equals one of accepted[] (trim / case_sensitive only)",
  fill_blank:
    "every blank equals one accepted string for that blank (all-or-nothing)",
  numeric: "abs(learner.value - answer_key.value) <= coalesce(tolerance, 0)",
} as const;
