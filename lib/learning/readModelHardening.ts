/**
 * UM Learning OS — Read Model Hardening V1 constants.
 * DB-authoritative via RLS policy replacement in
 * `supabase/migrations/20260840_learning_read_model_hardening_v1.sql`.
 *
 * Aligns learner-facing SELECT on the course tree + settings with
 * `has_learning_course_access` / `has_learning_program_access`. Plain space
 * membership is NOT a substitute for course entitlement on the protected tree.
 *
 * Program CATALOG browse for space members is intentionally retained.
 * There is no TypeScript authorization layer — RLS remains the sole gate.
 */

/** Migration filename for this slice (must be unique / unused before apply). */
export const LEARNING_READ_MODEL_HARDENING_MIGRATION =
  "20260840_learning_read_model_hardening_v1.sql";

/** Live entitlement helpers used by entitled-learner SELECT policies. */
export const LEARNING_READ_MODEL_ACCESS_HELPERS = {
  course: "has_learning_course_access",
  program: "has_learning_program_access",
} as const;

/**
 * Course-tree tables whose learner SELECT no longer uses plain space membership.
 * Programs catalog (`learning_programs`) is intentionally excluded.
 */
export const LEARNING_READ_MODEL_COURSE_TREE_TABLES = [
  "learning_courses",
  "learning_sections",
  "learning_lessons",
  "learning_activities",
] as const;

/** Settings tables tightened to entitled-or-staff (no plain space member). */
export const LEARNING_READ_MODEL_SETTINGS_TABLES = [
  "learning_program_settings",
  "learning_course_settings",
  "learning_section_settings",
  "learning_lesson_settings",
  "learning_activity_settings",
] as const;

/** Old learner/member policies dropped by this migration. */
export const LEARNING_READ_MODEL_DROPPED_POLICIES = [
  "Space members read accessible courses",
  "Space members read accessible sections",
  "Space members read accessible lessons",
  "Space members read accessible activities",
  "Members read course settings",
  "Members read section settings",
  "Members read lesson settings",
  "Members read activity settings",
  "Members read program settings",
] as const;

/**
 * Program catalog policy intentionally retained — space members may still browse
 * published programs without enrollment.
 */
export const LEARNING_READ_MODEL_RETAINED_PROGRAM_CATALOG_POLICY =
  "Space members read accessible programs";

/** Public discovery policies that must remain (programs/courses/sections/lessons). */
export const LEARNING_READ_MODEL_PUBLIC_DISCOVERY_POLICIES = [
  "Public read published public programs",
  "Public read published public courses",
  "Public read published public sections",
  "Public read published public lessons",
] as const;

/** New entitled-learner SELECT policies (published chain + entitlement). */
export const LEARNING_READ_MODEL_ENTITLED_POLICIES = [
  "Entitled learners read published courses",
  "Entitled learners read published sections",
  "Entitled learners read published lessons",
  "Entitled learners read published activities",
  "Entitled learners read published course settings",
  "Entitled learners read published section settings",
  "Entitled learners read published lesson settings",
  "Entitled learners read published activity settings",
  "Entitled learners read published program settings",
] as const;

/**
 * Staff-scoped SELECT policies added so instructors/editors retain draft-in-scope
 * reads after space-member learner policies are removed.
 */
export const LEARNING_READ_MODEL_STAFF_POLICIES = [
  "Course staff read scoped courses",
  "Course staff read scoped sections",
  "Course staff read scoped lessons",
  "Course staff read scoped activities",
  "Staff read course settings",
  "Staff read section settings",
  "Staff read lesson settings",
  "Staff read activity settings",
  "Staff read program settings",
] as const;

/** Prior Learning migrations this slice must not rewrite. */
export const LEARNING_READ_MODEL_PRIOR_MIGRATIONS = [
  "20260828_learning_spaces_membership_foundation_v1.sql",
  "20260829_learning_programs_foundation_v1.sql",
  "20260830_learning_courses_foundation_v1.sql",
  "20260831_learning_sections_foundation_v1.sql",
  "20260832_learning_lessons_foundation_v1.sql",
  "20260833_learning_activities_foundation_v1.sql",
  "20260834_learning_enrollments_foundation_v1.sql",
  "20260835_learning_progress_foundation_v1.sql",
  "20260836_learning_lesson_content_blocks_foundation_v1.sql",
  "20260837_learning_questions_foundation_v1.sql",
  "20260838_learning_attempts_foundation_v1.sql",
  "20260839_learning_scoring_foundation_v1.sql",
] as const;
