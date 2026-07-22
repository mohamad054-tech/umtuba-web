/**
 * UM Learning OS — Lessons Foundation V1 constants & types.
 * DB-authoritative via learning_lesson_* RPCs; this module mirrors SQL contracts.
 *
 * Hierarchy: Space → Program → Course → Section → Lesson.
 * Lesson is an educational CONTAINER under exactly one Section — it is NOT
 * content body, an Activity, Progress, or a Live Session. Authority is INHERITED
 * from the parent Section → Course → Space chain; there is no lesson staff table.
 * `section_id` is immutable after creation.
 *
 * Lesson-trimmed metadata surface only: `ai_ready` and `live_ready` — no
 * `category` / `target_audience` (those stay on Section) and no
 * `marketplace_ready` / `certification_ready` (those stay on Course).
 */

export const LEARNING_LESSON_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningLessonStatus = (typeof LEARNING_LESSON_STATUSES)[number];

export const LEARNING_LESSON_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningLessonVisibility =
  (typeof LEARNING_LESSON_VISIBILITIES)[number];

export const LEARNING_LESSON_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type LearningLessonDifficulty =
  (typeof LEARNING_LESSON_DIFFICULTIES)[number];

/**
 * Descriptive-only content type allowlist. Nullable; activates NO behavior in
 * V1 (no content storage, players, rendering, or delivery are implemented).
 */
export const LEARNING_LESSON_CONTENT_TYPES = [
  "video",
  "text",
  "audio",
  "document",
  "interactive",
  "live",
] as const;
export type LearningLessonContentType =
  (typeof LEARNING_LESSON_CONTENT_TYPES)[number];

/** Documented foundation keys for branding_metadata JSON object. */
export const LEARNING_LESSON_BRANDING_KEYS = [
  "cover_url",
  "thumbnail_url",
  "intro_video_url",
  "logo_url",
] as const;

/** Documented foundation keys for seo_metadata JSON object. */
export const LEARNING_LESSON_SEO_KEYS = [
  "title",
  "description",
  "keywords",
] as const;

/** Documented foundation keys for ai_metadata JSON object. */
export const LEARNING_LESSON_AI_KEYS = ["skills", "outcomes", "tags"] as const;

/** Max serialized JSON size per metadata object (bytes). */
export const LEARNING_LESSON_METADATA_MAX_BYTES = 8192;

/** Per-field length / cardinality limits mirrored in SQL validators. */
export const LEARNING_LESSON_METADATA_LIMITS = {
  brandingUrlMaxChars: 2048,
  seoTitleMaxChars: 512,
  seoDescriptionMaxChars: 2000,
  seoKeywordsMaxItems: 32,
  seoKeywordMaxChars: 80,
  aiArrayMaxItems: 64,
  aiItemMaxChars: 120,
} as const;

export type LearningLessonBrandingMetadata = {
  cover_url?: string;
  thumbnail_url?: string;
  intro_video_url?: string;
  logo_url?: string;
};

export type LearningLessonSeoMetadata = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type LearningLessonAiMetadata = {
  skills?: string[];
  outcomes?: string[];
  tags?: string[];
};

export type LearningLesson = {
  id: string;
  section_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningLessonStatus;
  visibility: LearningLessonVisibility;
  position: number;
  content_type: LearningLessonContentType | null;
  default_language: string;
  difficulty: LearningLessonDifficulty | null;
  estimated_duration_minutes: number | null;
  supported_languages: string[];
  ai_ready: boolean;
  live_ready: boolean;
  branding_metadata: LearningLessonBrandingMetadata;
  seo_metadata: LearningLessonSeoMetadata;
  ai_metadata: LearningLessonAiMetadata;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

/**
 * 1:1 lesson settings. Reserved flags are INERT contracts in V1 — no completion,
 * preview, comments, or progress behavior is implemented.
 */
export type LearningLessonSettings = {
  lesson_id: string;
  is_required: boolean;
  is_previewable: boolean;
  allow_comments: boolean;
  min_completion_seconds: number | null;
  created_at: string;
  updated_at: string;
};

/** Reserved (inert) lesson settings defaults — mirrors SQL column defaults. */
export const LEARNING_LESSON_SETTINGS_DEFAULTS = {
  is_required: true,
  is_previewable: false,
  allow_comments: false,
  min_completion_seconds: null,
} as const;

export const LEARNING_LESSON_RPCS = {
  create: "create_learning_lesson",
  update: "update_learning_lesson",
  publish: "publish_learning_lesson",
  archive: "archive_learning_lesson",
  moderate: "moderate_learning_lesson",
  reorder: "reorder_learning_lessons",
} as const;

export const LEARNING_LESSON_HELPERS = {
  canManage: "can_manage_learning_lesson",
  canCreate: "can_create_learning_lesson",
} as const;

export const LEARNING_LESSON_AUDIT_ACTIONS = {
  create: "lesson.create",
  update: "lesson.update",
  publish: "lesson.publish",
  archive: "lesson.archive",
  moderation: "lesson.moderation",
  reorder: "lesson.reorder",
} as const;
