/**
 * UM Learning OS — Questions Foundation V1 constants & types.
 * DB-authoritative via learning_question_* RPCs; this module mirrors the SQL
 * contracts in
 * `supabase/migrations/20260837_learning_questions_foundation_v1.sql`.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson → Activity → Question.
 *
 * A Question is an authored assessment definition belonging to EXACTLY ONE
 * Activity — Activity → Question only. There are NO banks, NO shared/reused
 * questions, NO cross-activity reuse, and NO pools. A Question is NOT an attempt,
 * a learner response, a grade, a score, a certificate, or an assignment.
 * Authority is INHERITED from the parent Activity → Lesson → Section → Course →
 * Space chain; there is no question staff table. `activity_id`, `question_type`,
 * and `created_by` are immutable after creation.
 *
 * LEARNER-VISIBLE structure (prompt + options/blanks) lives in `content`;
 * correctness lives in a separate 1:1 `learning_question_answer_keys` table that
 * is STAFF/PLATFORM-ONLY: never exposed to learners via RLS and never returned
 * from non-key RPCs.
 *
 * READS ARE STAFF-ONLY IN V1: there is NO learner SELECT policy on questions or
 * answer keys and NO learner-facing RPC returning either. Ordinary space members
 * get nothing. There is NO anonymous SELECT policy in V1. Learner delivery is
 * deferred to the future Attempts slice.
 */

export const LEARNING_QUESTION_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningQuestionStatus =
  (typeof LEARNING_QUESTION_STATUSES)[number];

/**
 * V1 creatable question types (6). Immutable after create; unknown values fail
 * closed. Correctness never lives in `content` — only in the answer key.
 */
export const LEARNING_QUESTION_CREATABLE_TYPES = [
  "multiple_choice_single",
  "multiple_choice_multiple",
  "true_false",
  "short_answer",
  "fill_blank",
  "numeric",
] as const;
export type LearningQuestionCreatableType =
  (typeof LEARNING_QUESTION_CREATABLE_TYPES)[number];

/**
 * Reserved types — present in the DB allowlist/enum but create is REJECTED in
 * V1 (no behavior implemented). They may be created in a later slice.
 */
export const LEARNING_QUESTION_RESERVED_TYPES = [
  "long_answer",
  "essay",
] as const;
export type LearningQuestionReservedType =
  (typeof LEARNING_QUESTION_RESERVED_TYPES)[number];

/**
 * Fully deferred types — intentionally NOT in the DB allowlist, so they fail
 * closed at both the CHECK constraint and the validator. Listed here for
 * documentation/testing only; they must never be accepted in V1. No matching/
 * ordering validators are implemented.
 */
export const LEARNING_QUESTION_DEFERRED_TYPES = [
  "matching",
  "ordering",
  "file_upload",
  "code_execution",
  "audio_response",
  "video_response",
  "composite",
  "adaptive",
  "ai_generated",
  "ai_graded",
] as const;
export type LearningQuestionDeferredType =
  (typeof LEARNING_QUESTION_DEFERRED_TYPES)[number];

/**
 * Full immutable DB allowlist = creatable (6) + reserved (2) = 8. This mirrors
 * the `learning_questions_type_check` constraint exactly. Deferred types are
 * deliberately excluded.
 */
export const LEARNING_QUESTION_TYPES = [
  ...LEARNING_QUESTION_CREATABLE_TYPES,
  ...LEARNING_QUESTION_RESERVED_TYPES,
] as const;
export type LearningQuestionType = (typeof LEARNING_QUESTION_TYPES)[number];

/** Stable option/blank key pattern (mirrors SQL). */
export const LEARNING_QUESTION_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** Allowed short_answer normalization keys (booleans only; NO client regex). */
export const LEARNING_QUESTION_NORMALIZATION_KEYS = [
  "trim",
  "case_sensitive",
] as const;

/**
 * Per-type / global limits mirrored in the SQL validators. Byte caps apply to
 * both `content` and `answer_key`.
 */
export const LEARNING_QUESTION_LIMITS = {
  contentMaxBytes: 16384,
  answerKeyMaxBytes: 16384,
  promptMaxChars: 4000,
  optionTextMaxChars: 1000,
  minOptions: 2,
  maxOptions: 26,
  maxBlanks: 20,
  shortAnswerMaxAccepted: 20,
  shortAnswerAnswerMaxChars: 200,
  fillBlankMaxAnswersPerBlank: 20,
  fillBlankAnswerMaxChars: 200,
  unitMaxChars: 64,
} as const;

/**
 * Per-type allowlisted `content` keys (LEARNER-VISIBLE structure only — never
 * correctness). Mirrors the SQL content validator.
 */
export const LEARNING_QUESTION_CONTENT_KEYS: Record<
  LearningQuestionCreatableType,
  readonly string[]
> = {
  multiple_choice_single: ["prompt", "options"],
  multiple_choice_multiple: ["prompt", "options"],
  true_false: ["prompt"],
  short_answer: ["prompt"],
  fill_blank: ["prompt", "blanks"],
  numeric: ["prompt", "unit"],
} as const;

/**
 * Per-type allowlisted `answer_key` keys (correct answers / criteria only —
 * NEVER learner results). Mirrors the SQL answer-key validator.
 */
export const LEARNING_QUESTION_ANSWER_KEY_KEYS: Record<
  LearningQuestionCreatableType,
  readonly string[]
> = {
  multiple_choice_single: ["correct_key"],
  multiple_choice_multiple: ["correct_keys"],
  true_false: ["correct"],
  short_answer: ["accepted", "normalization"],
  fill_blank: ["answers"],
  numeric: ["value", "tolerance"],
} as const;

export type LearningQuestion = {
  id: string;
  activity_id: string;
  question_type: LearningQuestionType;
  status: LearningQuestionStatus;
  position: number;
  content: Record<string, unknown>;
  points: number | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

/**
 * 1:1 answer key. STAFF/PLATFORM-ONLY — never exposed to learners and never
 * returned from non-key RPCs. Holds ONLY correct answers/criteria (no learner
 * results/grades/scores).
 */
export type LearningQuestionAnswerKey = {
  question_id: string;
  answer_key: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export const LEARNING_QUESTION_RPCS = {
  create: "create_learning_question",
  update: "update_learning_question",
  publish: "publish_learning_question",
  unpublish: "unpublish_learning_question",
  archive: "archive_learning_question",
  moderate: "moderate_learning_question",
  reorder: "reorder_learning_questions",
  setAnswerKey: "set_learning_question_answer_key",
} as const;

export const LEARNING_QUESTION_HELPERS = {
  canManage: "can_manage_learning_question",
  canCreate: "can_create_learning_question",
} as const;

export const LEARNING_QUESTION_AUDIT_ACTIONS = {
  create: "question.create",
  update: "question.update",
  publish: "question.publish",
  unpublish: "question.unpublish",
  archive: "question.archive",
  moderation: "question.moderation",
  reorder: "question.reorder",
  answerKeySet: "question.answer_key_set",
} as const;
