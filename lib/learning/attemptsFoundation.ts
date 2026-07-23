/**
 * UM Learning OS — Attempts Foundation V1 constants & types.
 * DB-authoritative via learning_attempt* RPCs; this module mirrors the SQL
 * contracts in
 * `supabase/migrations/20260838_learning_attempts_foundation_v1.sql`.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson → Activity → Attempt.
 *
 * An Attempt is a learner's server-owned session against EXACTLY ONE published
 * Activity (Activity → Attempt → Attempt Answers). It is NOT a score, a grade, a
 * correctness/pass-fail record, or a certificate — V1 stores NO scoring of any
 * kind. Scope (`space_id`/`course_id`/`lesson_id`/`activity_id`) and identity
 * (`user_id`) are server-derived and immutable, mirroring the Progress
 * foundation's denormalization.
 *
 * ANSWER-KEY FIREWALL: learner delivery uses a server-generated LEARNER-SAFE
 * `questions_snapshot` (published questions only; prompt + options/blanks). No
 * RPC ever reads/joins/returns `learning_question_answer_keys`, and there is no
 * learner SELECT policy on questions or answer keys. Correctness is entirely out
 * of scope for V1.
 */

/**
 * Attempt lifecycle. There is NO `draft`. `active` is the only live state;
 * `submitted`, `expired`, and `cancelled` are terminal (no reopen to `active`).
 */
export const LEARNING_ATTEMPT_STATUSES = [
  "active",
  "submitted",
  "expired",
  "cancelled",
] as const;
export type LearningAttemptStatus = (typeof LEARNING_ATTEMPT_STATUSES)[number];

/**
 * Terminal statuses that COUNT toward `max_attempts`. The `active` attempt is
 * resumed (returned), never double-created, so it is not counted here.
 */
export const LEARNING_ATTEMPT_TERMINAL_STATUSES = [
  "submitted",
  "expired",
  "cancelled",
] as const;
export type LearningAttemptTerminalStatus =
  (typeof LEARNING_ATTEMPT_TERMINAL_STATUSES)[number];

/**
 * Question types that can appear in a `questions_snapshot`. Only published,
 * creatable Question types (see Questions Foundation V1) are ever snapshotted;
 * reserved/deferred types can never be attempted.
 */
export const LEARNING_ATTEMPT_ANSWERABLE_TYPES = [
  "multiple_choice_single",
  "multiple_choice_multiple",
  "true_false",
  "short_answer",
  "fill_blank",
  "numeric",
] as const;
export type LearningAttemptAnswerableType =
  (typeof LEARNING_ATTEMPT_ANSWERABLE_TYPES)[number];

/**
 * Per-type allowlisted `answer_payload` keys (LEARNER RESPONSE only — never
 * correctness/score/grade). Mirrors the SQL response validator. Validation is
 * STRUCTURAL only; responses are NEVER compared to any answer key in V1.
 */
export const LEARNING_ATTEMPT_ANSWER_PAYLOAD_KEYS: Record<
  LearningAttemptAnswerableType,
  readonly string[]
> = {
  multiple_choice_single: ["selected_key"],
  multiple_choice_multiple: ["selected_keys"],
  true_false: ["value"],
  short_answer: ["text"],
  fill_blank: ["blanks"],
  numeric: ["value"],
} as const;

/**
 * Limits mirrored in the SQL response validator (byte cap applies to
 * `answer_payload`).
 */
export const LEARNING_ATTEMPT_LIMITS = {
  answerPayloadMaxBytes: 16384,
  shortAnswerTextMaxChars: 5000,
  fillBlankTextMaxChars: 1000,
} as const;

/** LEARNER-SAFE snapshot element (published question; NEVER an answer key). */
export type LearningAttemptSnapshotQuestion = {
  question_id: string;
  question_type: LearningAttemptAnswerableType;
  position: number;
  /** Learner-visible structure only (prompt + options/blanks). */
  content: Record<string, unknown>;
};

export type LearningAttempt = {
  id: string;
  space_id: string;
  course_id: string;
  lesson_id: string;
  activity_id: string;
  user_id: string;
  enrollment_id: string | null;
  status: LearningAttemptStatus;
  attempt_number: number;
  started_at: string;
  last_activity_at: string;
  submitted_at: string | null;
  expired_at: string | null;
  cancelled_at: string | null;
  /** Immutable copy of the activity time limit at start (lazy-expiry only). */
  time_limit_seconds_snapshot: number | null;
  /** Immutable copy of the activity max_attempts at start (record only). */
  max_attempts_snapshot: number | null;
  /** Server-generated LEARNER-SAFE payload; NEVER answer keys. */
  questions_snapshot: LearningAttemptSnapshotQuestion[];
  created_at: string;
  updated_at: string;
};

/**
 * One saved learner response per (attempt, question). Holds ONLY the learner
 * response — never an answer key, correctness, score, or grade.
 */
export type LearningAttemptAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_payload: Record<string, unknown>;
  first_answered_at: string;
  last_saved_at: string;
  created_at: string;
  updated_at: string;
};

export const LEARNING_ATTEMPT_RPCS = {
  start: "start_learning_attempt",
  saveAnswer: "save_learning_attempt_answer",
  getMine: "get_my_learning_attempt",
  submit: "submit_learning_attempt",
  cancel: "cancel_learning_attempt",
} as const;

export const LEARNING_ATTEMPT_HELPERS = {
  buildSnapshot: "learning_attempt_build_questions_snapshot",
  validateAnswer: "learning_attempt_validate_answer",
  expireIfDue: "learning_attempt_expire_if_due",
  assertSafeText: "learning_attempt_assert_safe_text",
  snapshotOptionKeys: "learning_attempt_snapshot_option_keys",
  snapshotBlankKeys: "learning_attempt_snapshot_blank_keys",
} as const;

export const LEARNING_ATTEMPT_AUDIT_ACTIONS = {
  start: "attempt.start",
  answerSave: "attempt.answer_save",
  submit: "attempt.submit",
  expire: "attempt.expire",
  cancel: "attempt.cancel",
} as const;
