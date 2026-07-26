/**
 * UM Learning OS — Lesson Content Blocks Foundation V1 constants & types.
 * DB-authoritative via learning_lesson_content_block_* RPCs; this module mirrors
 * the SQL contracts in
 * `supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql`.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson → Content Block.
 *
 * A Content Block is a display CONTENT BODY unit under exactly one Lesson — it is
 * NOT an activity, an interaction result, progress, a question, an attempt, a
 * certificate, or media storage. Authority is INHERITED from the parent
 * Lesson → Section → Course → Space chain; there is no block staff table.
 * `lesson_id`, `block_type`, and `created_by` are immutable after creation.
 *
 * LEARNER READ DIVERGENCE FROM LESSONS: learner content-body reads gate on
 * `has_learning_course_access(course_id)` (admin / course manager / active course
 * enrollment / active parent program enrollment) + published lesson + published
 * block. Plain space members without entitlement or a staff role cannot read the
 * content body. There is NO anonymous SELECT policy in V1.
 */

export const LEARNING_LESSON_CONTENT_BLOCK_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningLessonContentBlockStatus =
  (typeof LEARNING_LESSON_CONTENT_BLOCK_STATUSES)[number];

/**
 * Creatable content block types (13). Expanded in 20260863 with
 * transcript|pdf|downloadable_file. Immutable after create; unknown values
 * fail closed. Media types hold opaque validated http(s) reference strings only.
 */
export const LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES = [
  "rich_text",
  "heading",
  "image",
  "video",
  "audio",
  "quote",
  "divider",
  "callout",
  "external_link",
  "code_block",
  "transcript",
  "pdf",
  "downloadable_file",
] as const;
export type LearningLessonContentBlockCreatableType =
  (typeof LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES)[number];

/**
 * Reserved types — present in the DB allowlist/enum but create is REJECTED in
 * V1 (no behavior implemented). They may be created in a later slice.
 */
export const LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES = [
  "ai_block",
  "interactive_block",
] as const;
export type LearningLessonContentBlockReservedType =
  (typeof LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES)[number];

/**
 * Fully deferred types — intentionally NOT in the DB allowlist, so they fail
 * closed at both the CHECK constraint and the validator. Listed here for
 * documentation/testing only; they must never be accepted in V1.
 * (pdf|downloadable_file moved to creatable in 20260863.)
 */
export const LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES = [
  "gallery",
  "table",
  "embed",
  "html",
] as const;
export type LearningLessonContentBlockDeferredType =
  (typeof LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES)[number];

/**
 * Full immutable DB allowlist = creatable (13) + reserved (2) = 15. This mirrors
 * the `learning_lesson_content_blocks_type_check` constraint (post-20260863).
 * Deferred types are deliberately excluded.
 */
export const LEARNING_LESSON_CONTENT_BLOCK_TYPES = [
  ...LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  ...LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
] as const;
export type LearningLessonContentBlockType =
  (typeof LEARNING_LESSON_CONTENT_BLOCK_TYPES)[number];

/** Allowed heading levels (h1..h6). */
export const LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS = [
  1, 2, 3, 4, 5, 6,
] as const;

/** Allowed callout variants. */
export const LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS = [
  "info",
  "note",
  "tip",
  "success",
  "warning",
  "danger",
] as const;

/** Allowed rich_text formats (no HTML). */
export const LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS = [
  "plain",
  "markdown",
] as const;

/** Allowed divider styles. */
export const LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES = [
  "solid",
  "dashed",
  "dotted",
] as const;

/** Allowed opaque video provider hints (no upload/storage behavior). */
export const LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS = [
  "file",
  "url",
  "youtube",
  "vimeo",
] as const;

/** code_block language identifier pattern (mirrors SQL). */
export const LEARNING_LESSON_CONTENT_BLOCK_CODE_LANGUAGE_PATTERN =
  /^[a-z0-9+#.-]{1,32}$/;

/**
 * Per-type / global content limits mirrored in the SQL validators. Media URLs
 * must be http(s) only (no javascript:/vbscript:/data: schemes) and are opaque
 * references — there is no upload, storage bucket, or signed-URL behavior.
 */
export const LEARNING_LESSON_CONTENT_BLOCK_LIMITS = {
  contentMaxBytes: 16384,
  urlMaxChars: 2048,
  richTextMaxChars: 10000,
  headingMaxChars: 300,
  quoteMaxChars: 2000,
  quoteAttributionMaxChars: 300,
  calloutMaxChars: 4000,
  codeMaxChars: 20000,
  codeLanguageMaxChars: 32,
  imageAltMaxChars: 500,
  captionMaxChars: 1000,
  externalLinkLabelMaxChars: 300,
  externalLinkDescriptionMaxChars: 1000,
} as const;

/** Per-type allowlisted content keys (mirrors the SQL validator). */
export const LEARNING_LESSON_CONTENT_BLOCK_CONTENT_KEYS: Record<
  LearningLessonContentBlockCreatableType,
  readonly string[]
> = {
  rich_text: ["text", "format"],
  heading: ["text", "level"],
  image: ["url", "alt", "caption"],
  video: ["url", "provider", "caption"],
  audio: ["url", "caption"],
  quote: ["text", "attribution"],
  divider: ["style"],
  callout: ["text", "variant"],
  external_link: ["url", "label", "description"],
  code_block: ["code", "language"],
  transcript: ["text", "language", "video_block_id"],
  pdf: ["url", "title", "page_count"],
  downloadable_file: ["url", "title", "filename", "mime_type", "size_bytes"],
} as const;

export type LearningLessonContentBlock = {
  id: string;
  lesson_id: string;
  block_type: LearningLessonContentBlockType;
  status: LearningLessonContentBlockStatus;
  position: number;
  content: Record<string, unknown>;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

export const LEARNING_LESSON_CONTENT_BLOCK_RPCS = {
  create: "create_learning_lesson_content_block",
  update: "update_learning_lesson_content_block",
  publish: "publish_learning_lesson_content_block",
  unpublish: "unpublish_learning_lesson_content_block",
  archive: "archive_learning_lesson_content_block",
  moderate: "moderate_learning_lesson_content_block",
  reorder: "reorder_learning_lesson_content_blocks",
} as const;

export const LEARNING_LESSON_CONTENT_BLOCK_HELPERS = {
  canManage: "can_manage_learning_lesson_content_block",
  canCreate: "can_create_learning_lesson_content_block",
} as const;

export const LEARNING_LESSON_CONTENT_BLOCK_AUDIT_ACTIONS = {
  create: "content_block.create",
  update: "content_block.update",
  publish: "content_block.publish",
  unpublish: "content_block.unpublish",
  archive: "content_block.archive",
  moderation: "content_block.moderation",
  reorder: "content_block.reorder",
} as const;

/**
 * Course entitlement helper used by the learner SELECT policy. Content-body
 * reads for learners are gated on this (NOT plain space membership).
 */
export const LEARNING_LESSON_CONTENT_BLOCK_ACCESS_HELPER =
  "has_learning_course_access";
