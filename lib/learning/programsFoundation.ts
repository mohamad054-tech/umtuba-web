/**
 * UM Learning OS — Programs Foundation V1 constants & types.
 * DB-authoritative via learning_program_* RPCs; this module mirrors SQL contracts.
 */

export const LEARNING_PROGRAM_FORMATS = [
  "self_paced",
  "cohort",
  "live_group",
  "tutoring_1to1",
  "hybrid",
] as const;
export type LearningProgramFormat = (typeof LEARNING_PROGRAM_FORMATS)[number];

export const LEARNING_PROGRAM_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type LearningProgramStatus = (typeof LEARNING_PROGRAM_STATUSES)[number];

export const LEARNING_PROGRAM_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningProgramVisibility =
  (typeof LEARNING_PROGRAM_VISIBILITIES)[number];

export const LEARNING_PROGRAM_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
] as const;
export type LearningProgramDifficulty =
  (typeof LEARNING_PROGRAM_DIFFICULTIES)[number];

export const LEARNING_PROGRAM_STAFF_ROLES = [
  "lead_instructor",
  "instructor",
  "teaching_assistant",
  "content_editor",
] as const;
export type LearningProgramStaffRole =
  (typeof LEARNING_PROGRAM_STAFF_ROLES)[number];

export const LEARNING_PROGRAM_STAFF_ROLE_RANKS: Record<
  LearningProgramStaffRole,
  number
> = {
  lead_instructor: 80,
  instructor: 60,
  teaching_assistant: 50,
  content_editor: 40,
};

export const LEARNING_PROGRAM_STAFF_STATUSES = ["active", "removed"] as const;
export type LearningProgramStaffStatus =
  (typeof LEARNING_PROGRAM_STAFF_STATUSES)[number];

/** Documented foundation keys for branding_metadata JSON object. */
export const LEARNING_PROGRAM_BRANDING_KEYS = [
  "cover_url",
  "thumbnail_url",
  "intro_video_url",
  "logo_url",
] as const;

/** Documented foundation keys for seo_metadata JSON object. */
export const LEARNING_PROGRAM_SEO_KEYS = [
  "title",
  "description",
  "keywords",
] as const;

/** Documented foundation keys for ai_metadata JSON object. */
export const LEARNING_PROGRAM_AI_KEYS = [
  "skills",
  "outcomes",
  "tags",
] as const;

/** Max serialized JSON size per metadata object (bytes). */
export const LEARNING_PROGRAM_METADATA_MAX_BYTES = 8192;

/** Per-field length / cardinality limits mirrored in SQL validators. */
export const LEARNING_PROGRAM_METADATA_LIMITS = {
  brandingUrlMaxChars: 2048,
  seoTitleMaxChars: 512,
  seoDescriptionMaxChars: 2000,
  seoKeywordsMaxItems: 32,
  seoKeywordMaxChars: 80,
  aiArrayMaxItems: 64,
  aiItemMaxChars: 120,
} as const;

export type LearningProgramBrandingMetadata = {
  cover_url?: string;
  thumbnail_url?: string;
  intro_video_url?: string;
  logo_url?: string;
};

export type LearningProgramSeoMetadata = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type LearningProgramAiMetadata = {
  skills?: string[];
  outcomes?: string[];
  tags?: string[];
};

export type LearningProgram = {
  id: string;
  space_id: string;
  slug: string;
  name: string;
  description: string | null;
  format: LearningProgramFormat;
  status: LearningProgramStatus;
  visibility: LearningProgramVisibility;
  default_language: string;
  category: string | null;
  difficulty: LearningProgramDifficulty | null;
  estimated_duration_minutes: number | null;
  target_audience: string | null;
  supported_languages: string[];
  ai_ready: boolean;
  marketplace_ready: boolean;
  certification_ready: boolean;
  live_ready: boolean;
  branding_metadata: LearningProgramBrandingMetadata;
  seo_metadata: LearningProgramSeoMetadata;
  ai_metadata: LearningProgramAiMetadata;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  suspended_at: string | null;
  archived_at: string | null;
};

export type LearningProgramStaff = {
  id: string;
  program_id: string;
  user_id: string;
  role: LearningProgramStaffRole;
  status: LearningProgramStaffStatus;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningProgramSettings = {
  program_id: string;
  allow_self_enroll: boolean;
  require_space_membership: boolean;
  public_syllabus: boolean;
  created_at: string;
  updated_at: string;
};

export const LEARNING_PROGRAM_RPCS = {
  create: "create_learning_program",
  update: "update_learning_program",
  assignStaff: "assign_learning_program_staff",
  removeStaff: "remove_learning_program_staff",
  publish: "publish_learning_program",
  archive: "archive_learning_program",
  moderate: "moderate_learning_program",
} as const;

export const LEARNING_PROGRAM_HELPERS = {
  staffRoleRank: "learning_program_staff_role_rank",
  isStaff: "is_learning_program_staff",
  staffRole: "learning_program_staff_role",
  canManage: "can_manage_learning_program",
  canCreate: "can_create_learning_program",
} as const;

/** Mirrors SQL learning_program_staff_role_rank — unknown → null. */
export function learningProgramStaffRoleRank(role: string): number | null {
  if ((LEARNING_PROGRAM_STAFF_ROLES as readonly string[]).includes(role)) {
    return LEARNING_PROGRAM_STAFF_ROLE_RANKS[role as LearningProgramStaffRole];
  }
  return null;
}
