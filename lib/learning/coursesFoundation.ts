/**
 * UM Learning OS — Courses Foundation V1 constants & types.
 * DB-authoritative via learning_course_* RPCs; this module mirrors SQL contracts.
 *
 * Hierarchy: Space → Program → Course.
 * Course is a reusable educational unit under exactly one Program (not a folder).
 * Format lives on Program only — no course format column.
 */

export const LEARNING_COURSE_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningCourseStatus = (typeof LEARNING_COURSE_STATUSES)[number];

export const LEARNING_COURSE_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningCourseVisibility =
  (typeof LEARNING_COURSE_VISIBILITIES)[number];

export const LEARNING_COURSE_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type LearningCourseDifficulty =
  (typeof LEARNING_COURSE_DIFFICULTIES)[number];

export const LEARNING_COURSE_STAFF_ROLES = [
  "lead_instructor",
  "instructor",
  "teaching_assistant",
  "content_editor",
] as const;
export type LearningCourseStaffRole =
  (typeof LEARNING_COURSE_STAFF_ROLES)[number];

export const LEARNING_COURSE_STAFF_ROLE_RANKS: Record<
  LearningCourseStaffRole,
  number
> = {
  lead_instructor: 80,
  instructor: 60,
  teaching_assistant: 50,
  content_editor: 40,
};

export const LEARNING_COURSE_STAFF_STATUSES = ["active", "removed"] as const;
export type LearningCourseStaffStatus =
  (typeof LEARNING_COURSE_STAFF_STATUSES)[number];

/** Documented foundation keys for branding_metadata JSON object. */
export const LEARNING_COURSE_BRANDING_KEYS = [
  "cover_url",
  "thumbnail_url",
  "intro_video_url",
  "logo_url",
] as const;

/** Documented foundation keys for seo_metadata JSON object. */
export const LEARNING_COURSE_SEO_KEYS = [
  "title",
  "description",
  "keywords",
] as const;

/** Documented foundation keys for ai_metadata JSON object. */
export const LEARNING_COURSE_AI_KEYS = [
  "skills",
  "outcomes",
  "tags",
] as const;

/** Max serialized JSON size per metadata object (bytes). */
export const LEARNING_COURSE_METADATA_MAX_BYTES = 8192;

/** Per-field length / cardinality limits mirrored in SQL validators. */
export const LEARNING_COURSE_METADATA_LIMITS = {
  brandingUrlMaxChars: 2048,
  seoTitleMaxChars: 512,
  seoDescriptionMaxChars: 2000,
  seoKeywordsMaxItems: 32,
  seoKeywordMaxChars: 80,
  aiArrayMaxItems: 64,
  aiItemMaxChars: 120,
} as const;

export type LearningCourseBrandingMetadata = {
  cover_url?: string;
  thumbnail_url?: string;
  intro_video_url?: string;
  logo_url?: string;
};

export type LearningCourseSeoMetadata = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type LearningCourseAiMetadata = {
  skills?: string[];
  outcomes?: string[];
  tags?: string[];
};

export type LearningCourse = {
  id: string;
  program_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningCourseStatus;
  visibility: LearningCourseVisibility;
  position: number;
  default_language: string;
  category: string | null;
  difficulty: LearningCourseDifficulty | null;
  estimated_duration_minutes: number | null;
  target_audience: string | null;
  supported_languages: string[];
  ai_ready: boolean;
  marketplace_ready: boolean;
  certification_ready: boolean;
  live_ready: boolean;
  branding_metadata: LearningCourseBrandingMetadata;
  seo_metadata: LearningCourseSeoMetadata;
  ai_metadata: LearningCourseAiMetadata;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

export type LearningCourseStaff = {
  id: string;
  course_id: string;
  user_id: string;
  role: LearningCourseStaffRole;
  status: LearningCourseStaffStatus;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningCourseSettings = {
  course_id: string;
  allow_self_enroll: boolean;
  require_program_enrollment: boolean;
  public_syllabus: boolean;
  created_at: string;
  updated_at: string;
};

export const LEARNING_COURSE_RPCS = {
  create: "create_learning_course",
  update: "update_learning_course",
  assignStaff: "assign_learning_course_staff",
  removeStaff: "remove_learning_course_staff",
  publish: "publish_learning_course",
  archive: "archive_learning_course",
  moderate: "moderate_learning_course",
  reorder: "reorder_learning_courses",
} as const;

export const LEARNING_COURSE_HELPERS = {
  staffRoleRank: "learning_course_staff_role_rank",
  isStaff: "is_learning_course_staff",
  staffRole: "learning_course_staff_role",
  canManage: "can_manage_learning_course",
  canCreate: "can_create_learning_course",
} as const;

/** Mirrors SQL learning_course_staff_role_rank — unknown → null. */
export function learningCourseStaffRoleRank(role: string): number | null {
  if ((LEARNING_COURSE_STAFF_ROLES as readonly string[]).includes(role)) {
    return LEARNING_COURSE_STAFF_ROLE_RANKS[role as LearningCourseStaffRole];
  }
  return null;
}
