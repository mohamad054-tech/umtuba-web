/**
 * UM Learning OS — Sections Foundation V1 constants & types.
 * DB-authoritative via learning_section_* RPCs; this module mirrors SQL contracts.
 *
 * Hierarchy: Space → Program → Course → Section.
 * Section is an organizational educational module under exactly one Course — it
 * is NOT a lesson. Authority is INHERITED from the parent Course; there is no
 * section staff table. `course_id` is immutable after creation.
 *
 * Section-appropriate metadata surface only: `ai_ready` and `live_ready` — no
 * `marketplace_ready` / `certification_ready` (those stay on Course).
 */

export const LEARNING_SECTION_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningSectionStatus = (typeof LEARNING_SECTION_STATUSES)[number];

export const LEARNING_SECTION_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningSectionVisibility =
  (typeof LEARNING_SECTION_VISIBILITIES)[number];

export const LEARNING_SECTION_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type LearningSectionDifficulty =
  (typeof LEARNING_SECTION_DIFFICULTIES)[number];

/** Documented foundation keys for branding_metadata JSON object. */
export const LEARNING_SECTION_BRANDING_KEYS = [
  "cover_url",
  "thumbnail_url",
  "intro_video_url",
  "logo_url",
] as const;

/** Documented foundation keys for seo_metadata JSON object. */
export const LEARNING_SECTION_SEO_KEYS = [
  "title",
  "description",
  "keywords",
] as const;

/** Documented foundation keys for ai_metadata JSON object. */
export const LEARNING_SECTION_AI_KEYS = ["skills", "outcomes", "tags"] as const;

/** Max serialized JSON size per metadata object (bytes). */
export const LEARNING_SECTION_METADATA_MAX_BYTES = 8192;

/** Per-field length / cardinality limits mirrored in SQL validators. */
export const LEARNING_SECTION_METADATA_LIMITS = {
  brandingUrlMaxChars: 2048,
  seoTitleMaxChars: 512,
  seoDescriptionMaxChars: 2000,
  seoKeywordsMaxItems: 32,
  seoKeywordMaxChars: 80,
  aiArrayMaxItems: 64,
  aiItemMaxChars: 120,
} as const;

export type LearningSectionBrandingMetadata = {
  cover_url?: string;
  thumbnail_url?: string;
  intro_video_url?: string;
  logo_url?: string;
};

export type LearningSectionSeoMetadata = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type LearningSectionAiMetadata = {
  skills?: string[];
  outcomes?: string[];
  tags?: string[];
};

export type LearningSection = {
  id: string;
  course_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningSectionStatus;
  visibility: LearningSectionVisibility;
  position: number;
  default_language: string;
  category: string | null;
  difficulty: LearningSectionDifficulty | null;
  estimated_duration_minutes: number | null;
  target_audience: string | null;
  supported_languages: string[];
  ai_ready: boolean;
  live_ready: boolean;
  branding_metadata: LearningSectionBrandingMetadata;
  seo_metadata: LearningSectionSeoMetadata;
  ai_metadata: LearningSectionAiMetadata;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

/**
 * 1:1 section settings. Reserved flags are INERT contracts in V1 — no lesson
 * unlock / progress / ordering behavior is implemented.
 */
export type LearningSectionSettings = {
  section_id: string;
  is_required: boolean;
  enforce_lesson_order: boolean;
  visible_when_locked: boolean;
  created_at: string;
  updated_at: string;
};

/** Reserved (inert) section settings defaults — mirrors SQL column defaults. */
export const LEARNING_SECTION_SETTINGS_DEFAULTS = {
  is_required: true,
  enforce_lesson_order: false,
  visible_when_locked: true,
} as const;

export const LEARNING_SECTION_RPCS = {
  create: "create_learning_section",
  update: "update_learning_section",
  publish: "publish_learning_section",
  archive: "archive_learning_section",
  moderate: "moderate_learning_section",
  reorder: "reorder_learning_sections",
} as const;

export const LEARNING_SECTION_HELPERS = {
  canManage: "can_manage_learning_section",
  canCreate: "can_create_learning_section",
} as const;

export const LEARNING_SECTION_AUDIT_ACTIONS = {
  create: "section.create",
  update: "section.update",
  publish: "section.publish",
  archive: "section.archive",
  moderation: "section.moderation",
  reorder: "section.reorder",
} as const;
