/**
 * UM Learning OS — Activities Foundation V1 constants & types.
 * DB-authoritative via learning_activity_* RPCs; this module mirrors SQL contracts.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson → Activity.
 * An Activity is a generic educational INTERACTION CONTAINER under exactly one
 * Lesson — it is NOT a question, attempt, submission, answer, grade, progress
 * record, certificate, live session, or AI execution. Authority is INHERITED
 * from the parent Lesson → Section → Course → Space chain; there is no activity
 * staff table. `lesson_id` and `type` are immutable after creation.
 *
 * CRITICAL DIVERGENCE FROM LESSONS: there is NO anonymous/public SELECT policy
 * in V1 (privacy-safe for assessments). `visibility` is kept for forward
 * compatibility but has no anon effect.
 */

export const LEARNING_ACTIVITY_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningActivityStatus =
  (typeof LEARNING_ACTIVITY_STATUSES)[number];

export const LEARNING_ACTIVITY_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningActivityVisibility =
  (typeof LEARNING_ACTIVITY_VISIBILITIES)[number];

/**
 * Immutable activity type allowlist (16). Required at create; unknown values
 * fail closed. Activates NO type engine and adds NO type-specific columns in V1.
 */
export const LEARNING_ACTIVITY_TYPES = [
  "quiz",
  "assignment",
  "practice",
  "coding",
  "essay",
  "discussion",
  "reflection",
  "survey",
  "oral",
  "upload",
  "matching",
  "flashcards",
  "ai_task",
  "project",
  "lab",
  "live_check",
] as const;
export type LearningActivityType = (typeof LEARNING_ACTIVITY_TYPES)[number];

/** Inert evaluation modes on the settings sidecar. No behavior in V1. */
export const LEARNING_ACTIVITY_EVALUATION_MODES = [
  "none",
  "auto",
  "manual",
  "hybrid",
] as const;
export type LearningActivityEvaluationMode =
  (typeof LEARNING_ACTIVITY_EVALUATION_MODES)[number];

/** Inert completion modes on the settings sidecar. No behavior in V1. */
export const LEARNING_ACTIVITY_COMPLETION_MODES = [
  "view",
  "submit",
  "score",
  "manual",
] as const;
export type LearningActivityCompletionMode =
  (typeof LEARNING_ACTIVITY_COMPLETION_MODES)[number];

/** Inert result-visibility policies on the settings sidecar. No behavior in V1. */
export const LEARNING_ACTIVITY_SHOW_RESULT_POLICIES = [
  "never",
  "immediately",
  "after_submit",
  "after_close",
  "manual",
] as const;
export type LearningActivityShowResultPolicy =
  (typeof LEARNING_ACTIVITY_SHOW_RESULT_POLICIES)[number];

/** Documented foundation keys for ai_metadata JSON object (lean container). */
export const LEARNING_ACTIVITY_AI_KEYS = ["skills", "outcomes", "tags"] as const;

/** Max serialized JSON size for ai_metadata (bytes). */
export const LEARNING_ACTIVITY_METADATA_MAX_BYTES = 8192;

/** Per-field limits for ai_metadata mirrored in the SQL validator. */
export const LEARNING_ACTIVITY_METADATA_LIMITS = {
  aiArrayMaxItems: 64,
  aiItemMaxChars: 120,
} as const;

/**
 * config jsonb limits (settings sidecar) mirrored in the SQL validator.
 * Object-only; shallow (max depth 2); scalar or short-array values only.
 * Must NOT store questions/answers/submissions/rubrics/files/code/large
 * content/AI outputs.
 */
export const LEARNING_ACTIVITY_CONFIG_LIMITS = {
  maxBytes: 8192,
  maxTopLevelKeys: 32,
  maxDepth: 2,
  maxArrayItems: 64,
  maxStringChars: 512,
} as const;

export type LearningActivityAiMetadata = {
  skills?: string[];
  outcomes?: string[];
  tags?: string[];
};

export type LearningActivity = {
  id: string;
  lesson_id: string;
  type: LearningActivityType;
  slug: string;
  name: string;
  description: string | null;
  status: LearningActivityStatus;
  visibility: LearningActivityVisibility;
  position: number;
  ai_metadata: LearningActivityAiMetadata;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

/**
 * 1:1 activity settings. All scoring/attempt fields and `config` are INERT
 * contracts in V1 — no attempt, submission, scoring, grading, completion, or
 * progress behavior is implemented anywhere.
 */
export type LearningActivitySettings = {
  activity_id: string;
  is_required: boolean;
  max_score: number | null;
  passing_score: number | null;
  max_attempts: number | null;
  time_limit_seconds: number | null;
  evaluation_mode: LearningActivityEvaluationMode;
  completion_mode: LearningActivityCompletionMode;
  allow_late_submission: boolean;
  show_result_policy: LearningActivityShowResultPolicy;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Inert activity settings defaults — mirrors SQL column defaults. */
export const LEARNING_ACTIVITY_SETTINGS_DEFAULTS = {
  is_required: true,
  max_score: null,
  passing_score: null,
  max_attempts: null,
  time_limit_seconds: null,
  evaluation_mode: "none",
  completion_mode: "view",
  allow_late_submission: false,
  show_result_policy: "never",
  config: {},
} as const;

export const LEARNING_ACTIVITY_RPCS = {
  create: "create_learning_activity",
  update: "update_learning_activity",
  updateSettings: "update_learning_activity_settings",
  publish: "publish_learning_activity",
  archive: "archive_learning_activity",
  moderate: "moderate_learning_activity",
  reorder: "reorder_learning_activities",
} as const;

export const LEARNING_ACTIVITY_HELPERS = {
  canManage: "can_manage_learning_activity",
  canCreate: "can_create_learning_activity",
} as const;

export const LEARNING_ACTIVITY_AUDIT_ACTIONS = {
  create: "activity.create",
  update: "activity.update",
  publish: "activity.publish",
  archive: "activity.archive",
  moderation: "activity.moderation",
  reorder: "activity.reorder",
  settingsUpdate: "activity.settings_update",
} as const;
