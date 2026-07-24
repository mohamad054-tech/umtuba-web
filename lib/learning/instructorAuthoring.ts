/**
 * UM Learning OS — Instructor Authoring Foundation V1
 * (Phase 0–3 + 4A + 4B + 4C + 4D).
 *
 * Space + Program + Course + Section + Lesson create / publish / archive via
 * existing RPCs. User JWT only. No service role. No TS authorization substitute.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_COURSE_RPCS,
  LEARNING_COURSE_STATUSES,
  LEARNING_COURSE_VISIBILITIES,
  type LearningCourseStatus,
  type LearningCourseVisibility,
} from "./coursesFoundation";
import {
  LEARNING_LESSON_RPCS,
  LEARNING_LESSON_STATUSES,
  LEARNING_LESSON_VISIBILITIES,
  type LearningLessonStatus,
  type LearningLessonVisibility,
} from "./lessonsFoundation";
import {
  LEARNING_PROGRAM_FORMATS,
  LEARNING_PROGRAM_RPCS,
  LEARNING_PROGRAM_STATUSES,
  LEARNING_PROGRAM_VISIBILITIES,
  type LearningProgramFormat,
  type LearningProgramStatus,
  type LearningProgramVisibility,
} from "./programsFoundation";
import {
  LEARNING_SECTION_RPCS,
  LEARNING_SECTION_STATUSES,
  LEARNING_SECTION_VISIBILITIES,
  type LearningSectionStatus,
  type LearningSectionVisibility,
} from "./sectionsFoundation";
import {
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_RPCS,
  LEARNING_SPACE_STATUSES,
  LEARNING_SPACE_VISIBILITIES,
  type LearningSpaceMode,
  type LearningSpaceStatus,
  type LearningSpaceVisibility,
} from "./spacesFoundation";

type AnyClient = SupabaseClient;

/** Routes owned by this slice (APP_ROUTES / learner routes untouched). */
export const LEARNING_INSTRUCTOR_ROUTES = {
  hub: "/learning/instructor",
  spaceNew: "/learning/instructor/spaces/new",
  space: (spaceId: string) => `/learning/instructor/spaces/${spaceId}`,
  programNew: (spaceId: string) =>
    `/learning/instructor/spaces/${spaceId}/programs/new`,
  program: (programId: string) =>
    `/learning/instructor/programs/${programId}`,
  courseNew: (programId: string) =>
    `/learning/instructor/programs/${programId}/courses/new`,
  course: (courseId: string) => `/learning/instructor/courses/${courseId}`,
  sectionNew: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/sections/new`,
  section: (sectionId: string) =>
    `/learning/instructor/sections/${sectionId}`,
  lessonNew: (sectionId: string) =>
    `/learning/instructor/sections/${sectionId}/lessons/new`,
  lesson: (lessonId: string) => `/learning/instructor/lessons/${lessonId}`,
} as const;

/** Surfaced when creating a program under a non-active space (matches SQL). */
export const LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE =
  "Learning space must be active for program changes" as const;

/** Surfaced when creating a course under a non-active space (matches SQL). */
export const LEARNING_COURSE_REQUIRES_ACTIVE_SPACE =
  "Learning space must be active for course changes" as const;

/** Surfaced when parent program is not draft|published (matches SQL). */
export const LEARNING_COURSE_REQUIRES_VALID_PROGRAM =
  "Parent program must be draft or published for course changes" as const;

/** Surfaced when creating a section under a non-active space (matches SQL). */
export const LEARNING_SECTION_REQUIRES_ACTIVE_SPACE =
  "Learning space must be active for section changes" as const;

/** Surfaced when parent course is not draft|published (matches SQL). */
export const LEARNING_SECTION_REQUIRES_VALID_COURSE =
  "Parent course must be draft or published for section changes" as const;

/** Surfaced when parent program is not draft|published for sections (matches SQL). */
export const LEARNING_SECTION_REQUIRES_VALID_PROGRAM =
  "Parent program must be draft or published for section changes" as const;

/** Surfaced when creating a lesson under a non-active space (matches SQL). */
export const LEARNING_LESSON_REQUIRES_ACTIVE_SPACE =
  "Learning space must be active for lesson changes" as const;

/** Surfaced when parent section is not draft|published (matches SQL). */
export const LEARNING_LESSON_REQUIRES_VALID_SECTION =
  "Parent section must be draft or published for lesson changes" as const;

/** Surfaced when parent course is not draft|published for lessons (matches SQL). */
export const LEARNING_LESSON_REQUIRES_VALID_COURSE =
  "Parent course must be draft or published for lesson changes" as const;

/** Surfaced when parent program is not draft|published for lessons (matches SQL). */
export const LEARNING_LESSON_REQUIRES_VALID_PROGRAM =
  "Parent program must be draft or published for lesson changes" as const;

export type InstructorAuthoringResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type InstructorSpaceSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  mode: LearningSpaceMode;
  status: LearningSpaceStatus;
  visibility: LearningSpaceVisibility;
  default_language: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
};

export type CreateLearningSpaceInput = {
  slug: string;
  name: string;
  description?: string | null;
  mode: LearningSpaceMode;
  visibility?: LearningSpaceVisibility;
  default_language?: string;
};

export type InstructorProgramSummary = {
  id: string;
  space_id: string;
  slug: string;
  name: string;
  description: string | null;
  format: LearningProgramFormat;
  status: LearningProgramStatus;
  visibility: LearningProgramVisibility;
  default_language: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type CreateLearningProgramInput = {
  space_id: string;
  slug: string;
  name: string;
  format: LearningProgramFormat;
  description?: string | null;
  visibility?: LearningProgramVisibility;
  default_language?: string;
};

export type InstructorCourseSummary = {
  id: string;
  program_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningCourseStatus;
  visibility: LearningCourseVisibility;
  position: number;
  default_language: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type CreateLearningCourseInput = {
  program_id: string;
  slug: string;
  name: string;
  description?: string | null;
  visibility?: LearningCourseVisibility;
  default_language?: string;
};

export type InstructorSectionSummary = {
  id: string;
  course_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningSectionStatus;
  visibility: LearningSectionVisibility;
  position: number;
  default_language: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type CreateLearningSectionInput = {
  course_id: string;
  slug: string;
  name: string;
  description?: string | null;
  visibility?: LearningSectionVisibility;
  default_language?: string;
};

export type InstructorLessonSummary = {
  id: string;
  section_id: string;
  slug: string;
  name: string;
  description: string | null;
  status: LearningLessonStatus;
  visibility: LearningLessonVisibility;
  position: number;
  default_language: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type CreateLearningLessonInput = {
  section_id: string;
  slug: string;
  name: string;
  description?: string | null;
  visibility?: LearningLessonVisibility;
  default_language?: string;
};

function errMessage(error: { message?: string } | null, fallback: string) {
  const msg = error?.message?.trim();
  return msg && msg.length > 0 ? msg : fallback;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function isSpaceMode(value: string): value is LearningSpaceMode {
  return (LEARNING_SPACE_MODES as readonly string[]).includes(value);
}

function isSpaceStatus(value: string): value is LearningSpaceStatus {
  return (LEARNING_SPACE_STATUSES as readonly string[]).includes(value);
}

function isSpaceVisibility(value: string): value is LearningSpaceVisibility {
  return (LEARNING_SPACE_VISIBILITIES as readonly string[]).includes(value);
}

function isProgramFormat(value: string): value is LearningProgramFormat {
  return (LEARNING_PROGRAM_FORMATS as readonly string[]).includes(value);
}

function isProgramStatus(value: string): value is LearningProgramStatus {
  return (LEARNING_PROGRAM_STATUSES as readonly string[]).includes(value);
}

function isProgramVisibility(
  value: string
): value is LearningProgramVisibility {
  return (LEARNING_PROGRAM_VISIBILITIES as readonly string[]).includes(value);
}

function isCourseStatus(value: string): value is LearningCourseStatus {
  return (LEARNING_COURSE_STATUSES as readonly string[]).includes(value);
}

function isCourseVisibility(
  value: string
): value is LearningCourseVisibility {
  return (LEARNING_COURSE_VISIBILITIES as readonly string[]).includes(value);
}

function isSectionStatus(value: string): value is LearningSectionStatus {
  return (LEARNING_SECTION_STATUSES as readonly string[]).includes(value);
}

function isSectionVisibility(
  value: string
): value is LearningSectionVisibility {
  return (LEARNING_SECTION_VISIBILITIES as readonly string[]).includes(value);
}

function isLessonStatus(value: string): value is LearningLessonStatus {
  return (LEARNING_LESSON_STATUSES as readonly string[]).includes(value);
}

function isLessonVisibility(
  value: string
): value is LearningLessonVisibility {
  return (LEARNING_LESSON_VISIBILITIES as readonly string[]).includes(value);
}

function parsePosition(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return NaN;
}

function mapCourseRow(
  row: Record<string, unknown>
): InstructorCourseSummary | null {
  const id = asString(row.id);
  const program_id = asString(row.program_id);
  const slug = asString(row.slug);
  const name = asString(row.name);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  const default_language = asString(row.default_language) ?? "en";
  const created_at = asString(row.created_at) ?? "";
  const updated_at = asString(row.updated_at) ?? "";
  const position = parsePosition(row.position);
  if (
    !id ||
    !program_id ||
    !slug ||
    !name ||
    !status ||
    !visibility ||
    !Number.isFinite(position) ||
    !isCourseStatus(status) ||
    !isCourseVisibility(visibility)
  ) {
    return null;
  }
  return {
    id,
    program_id,
    slug,
    name,
    description: asString(row.description),
    status,
    visibility,
    position,
    default_language,
    created_at,
    updated_at,
    published_at: asString(row.published_at),
  };
}

function mapSectionRow(
  row: Record<string, unknown>
): InstructorSectionSummary | null {
  const id = asString(row.id);
  const course_id = asString(row.course_id);
  const slug = asString(row.slug);
  const name = asString(row.name);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  const default_language = asString(row.default_language) ?? "en";
  const created_at = asString(row.created_at) ?? "";
  const updated_at = asString(row.updated_at) ?? "";
  const position = parsePosition(row.position);
  if (
    !id ||
    !course_id ||
    !slug ||
    !name ||
    !status ||
    !visibility ||
    !Number.isFinite(position) ||
    !isSectionStatus(status) ||
    !isSectionVisibility(visibility)
  ) {
    return null;
  }
  return {
    id,
    course_id,
    slug,
    name,
    description: asString(row.description),
    status,
    visibility,
    position,
    default_language,
    created_at,
    updated_at,
    published_at: asString(row.published_at),
  };
}

function mapLessonRow(
  row: Record<string, unknown>
): InstructorLessonSummary | null {
  const id = asString(row.id);
  const section_id = asString(row.section_id);
  const slug = asString(row.slug);
  const name = asString(row.name);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  const default_language = asString(row.default_language) ?? "en";
  const created_at = asString(row.created_at) ?? "";
  const updated_at = asString(row.updated_at) ?? "";
  const position = parsePosition(row.position);
  if (
    !id ||
    !section_id ||
    !slug ||
    !name ||
    !status ||
    !visibility ||
    !Number.isFinite(position) ||
    !isLessonStatus(status) ||
    !isLessonVisibility(visibility)
  ) {
    return null;
  }
  return {
    id,
    section_id,
    slug,
    name,
    description: asString(row.description),
    status,
    visibility,
    position,
    default_language,
    created_at,
    updated_at,
    published_at: asString(row.published_at),
  };
}

function mapProgramRow(
  row: Record<string, unknown>
): InstructorProgramSummary | null {
  const id = asString(row.id);
  const space_id = asString(row.space_id);
  const slug = asString(row.slug);
  const name = asString(row.name);
  const format = asString(row.format);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  const default_language = asString(row.default_language) ?? "en";
  const created_at = asString(row.created_at) ?? "";
  const updated_at = asString(row.updated_at) ?? "";
  if (
    !id ||
    !space_id ||
    !slug ||
    !name ||
    !format ||
    !status ||
    !visibility ||
    !isProgramFormat(format) ||
    !isProgramStatus(status) ||
    !isProgramVisibility(visibility)
  ) {
    return null;
  }
  return {
    id,
    space_id,
    slug,
    name,
    description: asString(row.description),
    format,
    status,
    visibility,
    default_language,
    created_at,
    updated_at,
    published_at: asString(row.published_at),
  };
}

function mapSpaceRow(row: Record<string, unknown>): InstructorSpaceSummary | null {
  const id = asString(row.id);
  const slug = asString(row.slug);
  const name = asString(row.name);
  const mode = asString(row.mode);
  const status = asString(row.status);
  const visibility = asString(row.visibility);
  const owner_user_id = asString(row.owner_user_id);
  const default_language = asString(row.default_language) ?? "en";
  const created_at = asString(row.created_at) ?? "";
  const updated_at = asString(row.updated_at) ?? "";
  if (
    !id ||
    !slug ||
    !name ||
    !mode ||
    !status ||
    !visibility ||
    !owner_user_id ||
    !isSpaceMode(mode) ||
    !isSpaceStatus(status) ||
    !isSpaceVisibility(visibility)
  ) {
    return null;
  }
  return {
    id,
    slug,
    name,
    description: asString(row.description),
    mode,
    status,
    visibility,
    default_language,
    owner_user_id,
    created_at,
    updated_at,
  };
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Client-side gate mirroring SQL slug rules (DB remains authoritative). */
export function validateLearningSpaceSlug(slug: string): string | null {
  const v = slug.trim().toLowerCase();
  if (!SLUG_RE.test(v) || v.length < 3 || v.length > 64) {
    return "Slug must be 3–64 chars: lowercase letters, numbers, hyphens";
  }
  return null;
}

export function validateLearningSpaceName(name: string): string | null {
  const v = name.trim();
  if (v.length < 1 || v.length > 120) {
    return "Name must be 1–120 characters";
  }
  return null;
}

export function validateLearningProgramSlug(slug: string): string | null {
  return validateLearningSpaceSlug(slug);
}

export function validateLearningProgramName(name: string): string | null {
  const v = name.trim();
  if (v.length < 1 || v.length > 160) {
    return "Name must be 1–160 characters";
  }
  return null;
}

export function validateLearningCourseSlug(slug: string): string | null {
  return validateLearningSpaceSlug(slug);
}

export function validateLearningCourseName(name: string): string | null {
  return validateLearningProgramName(name);
}

export function validateLearningSectionSlug(slug: string): string | null {
  return validateLearningSpaceSlug(slug);
}

export function validateLearningSectionName(name: string): string | null {
  return validateLearningProgramName(name);
}

export function validateLearningLessonSlug(slug: string): string | null {
  return validateLearningSpaceSlug(slug);
}

export function validateLearningLessonName(name: string): string | null {
  return validateLearningProgramName(name);
}

function programAllowsCourseCreate(status: LearningProgramStatus): boolean {
  return status === "draft" || status === "published";
}

function courseAllowsSectionCreate(status: LearningCourseStatus): boolean {
  return status === "draft" || status === "published";
}

function sectionAllowsLessonCreate(status: LearningSectionStatus): boolean {
  return status === "draft" || status === "published";
}

/**
 * Spaces the caller can read via RLS (member or platform admin).
 * Includes draft spaces the owner/member can see — not public catalog.
 */
export async function listInstructorSpaces(
  supabase: AnyClient
): Promise<InstructorAuthoringResult<InstructorSpaceSummary[]>> {
  const { data, error } = await supabase
    .from("learning_spaces")
    .select(
      "id, slug, name, description, mode, status, visibility, default_language, owner_user_id, created_at, updated_at"
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning spaces"),
    };
  }

  const spaces: InstructorSpaceSummary[] = [];
  for (const row of data ?? []) {
    const mapped = mapSpaceRow(row as Record<string, unknown>);
    if (mapped) spaces.push(mapped);
  }
  return { ok: true, data: spaces };
}

export async function getInstructorSpace(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorAuthoringResult<InstructorSpaceSummary>> {
  const id = spaceId.trim();
  if (!id) {
    return { ok: false, message: "Space id is required" };
  }

  const { data, error } = await supabase
    .from("learning_spaces")
    .select(
      "id, slug, name, description, mode, status, visibility, default_language, owner_user_id, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning space"),
    };
  }
  if (!data) {
    return { ok: false, message: "Learning space not found" };
  }

  const mapped = mapSpaceRow(data as Record<string, unknown>);
  if (!mapped) {
    return { ok: false, message: "Learning space row is invalid" };
  }
  return { ok: true, data: mapped };
}

export async function createLearningSpace(
  supabase: AnyClient,
  input: CreateLearningSpaceInput
): Promise<InstructorAuthoringResult<{ space_id: string }>> {
  const slugErr = validateLearningSpaceSlug(input.slug);
  if (slugErr) return { ok: false, message: slugErr };
  const nameErr = validateLearningSpaceName(input.name);
  if (nameErr) return { ok: false, message: nameErr };
  if (!isSpaceMode(input.mode)) {
    return { ok: false, message: "Invalid learning space mode" };
  }
  const visibility = input.visibility ?? "private";
  if (!isSpaceVisibility(visibility)) {
    return { ok: false, message: "Invalid learning space visibility" };
  }

  const { data, error } = await supabase.rpc(LEARNING_SPACE_RPCS.create, {
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_mode: input.mode,
    p_visibility: visibility,
    p_default_language: input.default_language?.trim() || "en",
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to create learning space"),
    };
  }

  const record = asRecord(data);
  const space_id = asString(record?.space_id);
  if (!space_id) {
    return { ok: false, message: "Create space returned no space_id" };
  }
  return { ok: true, data: { space_id } };
}

export async function publishLearningSpace(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorAuthoringResult<{ space_id: string; status: string }>> {
  const id = spaceId.trim();
  if (!id) return { ok: false, message: "Space id is required" };

  const { data, error } = await supabase.rpc(LEARNING_SPACE_RPCS.publish, {
    p_space_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to publish learning space"),
    };
  }

  const record = asRecord(data);
  const space_id = asString(record?.space_id) ?? id;
  const status = asString(record?.status) ?? "active";
  return { ok: true, data: { space_id, status } };
}

export async function archiveLearningSpace(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorAuthoringResult<{ space_id: string; status: string }>> {
  const id = spaceId.trim();
  if (!id) return { ok: false, message: "Space id is required" };

  const { data, error } = await supabase.rpc(LEARNING_SPACE_RPCS.archive, {
    p_space_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to archive learning space"),
    };
  }

  const record = asRecord(data);
  const space_id = asString(record?.space_id) ?? id;
  const status = asString(record?.status) ?? "archived";
  return { ok: true, data: { space_id, status } };
}

/**
 * Programs in a space visible via RLS (space manager / program staff / published).
 */
export async function listInstructorPrograms(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorAuthoringResult<InstructorProgramSummary[]>> {
  const id = spaceId.trim();
  if (!id) return { ok: false, message: "Space id is required" };

  const { data, error } = await supabase
    .from("learning_programs")
    .select(
      "id, space_id, slug, name, description, format, status, visibility, default_language, created_at, updated_at, published_at"
    )
    .eq("space_id", id)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning programs"),
    };
  }

  const programs: InstructorProgramSummary[] = [];
  for (const row of data ?? []) {
    const mapped = mapProgramRow(row as Record<string, unknown>);
    if (mapped) programs.push(mapped);
  }
  return { ok: true, data: programs };
}

export async function getInstructorProgram(
  supabase: AnyClient,
  programId: string
): Promise<InstructorAuthoringResult<InstructorProgramSummary>> {
  const id = programId.trim();
  if (!id) return { ok: false, message: "Program id is required" };

  const { data, error } = await supabase
    .from("learning_programs")
    .select(
      "id, space_id, slug, name, description, format, status, visibility, default_language, created_at, updated_at, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning program"),
    };
  }
  if (!data) {
    return { ok: false, message: "Learning program not found" };
  }

  const mapped = mapProgramRow(data as Record<string, unknown>);
  if (!mapped) {
    return { ok: false, message: "Learning program row is invalid" };
  }
  return { ok: true, data: mapped };
}

export async function createLearningProgram(
  supabase: AnyClient,
  input: CreateLearningProgramInput
): Promise<
  InstructorAuthoringResult<{
    program_id: string;
    space_id: string;
    status: string;
  }>
> {
  const spaceId = input.space_id.trim();
  if (!spaceId) return { ok: false, message: "Space id is required" };

  const slugErr = validateLearningProgramSlug(input.slug);
  if (slugErr) return { ok: false, message: slugErr };
  const nameErr = validateLearningProgramName(input.name);
  if (nameErr) return { ok: false, message: nameErr };
  if (!isProgramFormat(input.format)) {
    return { ok: false, message: "Invalid learning program format" };
  }
  const visibility = input.visibility ?? "private";
  if (!isProgramVisibility(visibility)) {
    return { ok: false, message: "Invalid learning program visibility" };
  }

  // Parent gate (DB is authoritative; this avoids a confusing RPC round-trip).
  const space = await getInstructorSpace(supabase, spaceId);
  if (!space.ok) return space;
  if (space.data.status !== "active") {
    return { ok: false, message: LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE };
  }

  const { data, error } = await supabase.rpc(LEARNING_PROGRAM_RPCS.create, {
    p_space_id: spaceId,
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_format: input.format,
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_visibility: visibility,
    p_default_language: input.default_language?.trim() || "en",
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to create learning program"),
    };
  }

  const record = asRecord(data);
  const program_id = asString(record?.program_id);
  if (!program_id) {
    return { ok: false, message: "Create program returned no program_id" };
  }
  return {
    ok: true,
    data: {
      program_id,
      space_id: asString(record?.space_id) ?? spaceId,
      status: asString(record?.status) ?? "draft",
    },
  };
}

export async function publishLearningProgram(
  supabase: AnyClient,
  programId: string
): Promise<InstructorAuthoringResult<{ program_id: string; status: string }>> {
  const id = programId.trim();
  if (!id) return { ok: false, message: "Program id is required" };

  const { data, error } = await supabase.rpc(LEARNING_PROGRAM_RPCS.publish, {
    p_program_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to publish learning program"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      program_id: asString(record?.program_id) ?? id,
      status: asString(record?.status) ?? "published",
    },
  };
}

export async function archiveLearningProgram(
  supabase: AnyClient,
  programId: string
): Promise<InstructorAuthoringResult<{ program_id: string; status: string }>> {
  const id = programId.trim();
  if (!id) return { ok: false, message: "Program id is required" };

  const { data, error } = await supabase.rpc(LEARNING_PROGRAM_RPCS.archive, {
    p_program_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to archive learning program"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      program_id: asString(record?.program_id) ?? id,
      status: asString(record?.status) ?? "archived",
    },
  };
}

/**
 * Courses in a program visible via RLS (managers / staff / published paths).
 */
export async function listInstructorCourses(
  supabase: AnyClient,
  programId: string
): Promise<InstructorAuthoringResult<InstructorCourseSummary[]>> {
  const id = programId.trim();
  if (!id) return { ok: false, message: "Program id is required" };

  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      "id, program_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("program_id", id)
    .order("position", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning courses"),
    };
  }

  const courses: InstructorCourseSummary[] = [];
  for (const row of data ?? []) {
    const mapped = mapCourseRow(row as Record<string, unknown>);
    if (mapped) courses.push(mapped);
  }
  return { ok: true, data: courses };
}

export async function getInstructorCourse(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult<InstructorCourseSummary>> {
  const id = courseId.trim();
  if (!id) return { ok: false, message: "Course id is required" };

  const { data, error } = await supabase
    .from("learning_courses")
    .select(
      "id, program_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning course"),
    };
  }
  if (!data) {
    return { ok: false, message: "Learning course not found" };
  }

  const mapped = mapCourseRow(data as Record<string, unknown>);
  if (!mapped) {
    return { ok: false, message: "Learning course row is invalid" };
  }
  return { ok: true, data: mapped };
}

export async function createLearningCourse(
  supabase: AnyClient,
  input: CreateLearningCourseInput
): Promise<
  InstructorAuthoringResult<{
    course_id: string;
    program_id: string;
    status: string;
    position: number;
  }>
> {
  const programId = input.program_id.trim();
  if (!programId) return { ok: false, message: "Program id is required" };

  const slugErr = validateLearningCourseSlug(input.slug);
  if (slugErr) return { ok: false, message: slugErr };
  const nameErr = validateLearningCourseName(input.name);
  if (nameErr) return { ok: false, message: nameErr };
  const visibility = input.visibility ?? "private";
  if (!isCourseVisibility(visibility)) {
    return { ok: false, message: "Invalid learning course visibility" };
  }

  // Parent gates (DB authoritative; preflight for clearer UX).
  const program = await getInstructorProgram(supabase, programId);
  if (!program.ok) return program;
  if (!programAllowsCourseCreate(program.data.status)) {
    return { ok: false, message: LEARNING_COURSE_REQUIRES_VALID_PROGRAM };
  }
  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok) return space;
  if (space.data.status !== "active") {
    return { ok: false, message: LEARNING_COURSE_REQUIRES_ACTIVE_SPACE };
  }

  const { data, error } = await supabase.rpc(LEARNING_COURSE_RPCS.create, {
    p_program_id: programId,
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_visibility: visibility,
    p_default_language: input.default_language?.trim() || "en",
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to create learning course"),
    };
  }

  const record = asRecord(data);
  const course_id = asString(record?.course_id);
  if (!course_id) {
    return { ok: false, message: "Create course returned no course_id" };
  }
  const positionRaw = record?.position;
  const position =
    typeof positionRaw === "number"
      ? positionRaw
      : typeof positionRaw === "string"
        ? Number(positionRaw)
        : 0;

  return {
    ok: true,
    data: {
      course_id,
      program_id: asString(record?.program_id) ?? programId,
      status: asString(record?.status) ?? "draft",
      position: Number.isFinite(position) ? position : 0,
    },
  };
}

export async function publishLearningCourse(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult<{ course_id: string; status: string }>> {
  const id = courseId.trim();
  if (!id) return { ok: false, message: "Course id is required" };

  const { data, error } = await supabase.rpc(LEARNING_COURSE_RPCS.publish, {
    p_course_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to publish learning course"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      course_id: asString(record?.course_id) ?? id,
      status: asString(record?.status) ?? "published",
    },
  };
}

export async function archiveLearningCourse(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult<{ course_id: string; status: string }>> {
  const id = courseId.trim();
  if (!id) return { ok: false, message: "Course id is required" };

  const { data, error } = await supabase.rpc(LEARNING_COURSE_RPCS.archive, {
    p_course_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to archive learning course"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      course_id: asString(record?.course_id) ?? id,
      status: asString(record?.status) ?? "archived",
    },
  };
}

/**
 * Sections in a course visible via RLS (managers / staff / published paths).
 */
export async function listInstructorSections(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult<InstructorSectionSummary[]>> {
  const id = courseId.trim();
  if (!id) return { ok: false, message: "Course id is required" };

  const { data, error } = await supabase
    .from("learning_sections")
    .select(
      "id, course_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("course_id", id)
    .order("position", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning sections"),
    };
  }

  const sections: InstructorSectionSummary[] = [];
  for (const row of data ?? []) {
    const mapped = mapSectionRow(row as Record<string, unknown>);
    if (mapped) sections.push(mapped);
  }
  return { ok: true, data: sections };
}

export async function getInstructorSection(
  supabase: AnyClient,
  sectionId: string
): Promise<InstructorAuthoringResult<InstructorSectionSummary>> {
  const id = sectionId.trim();
  if (!id) return { ok: false, message: "Section id is required" };

  const { data, error } = await supabase
    .from("learning_sections")
    .select(
      "id, course_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning section"),
    };
  }
  if (!data) {
    return { ok: false, message: "Learning section not found" };
  }

  const mapped = mapSectionRow(data as Record<string, unknown>);
  if (!mapped) {
    return { ok: false, message: "Learning section row is invalid" };
  }
  return { ok: true, data: mapped };
}

export async function createLearningSection(
  supabase: AnyClient,
  input: CreateLearningSectionInput
): Promise<
  InstructorAuthoringResult<{
    section_id: string;
    course_id: string;
    status: string;
    position: number;
  }>
> {
  const courseId = input.course_id.trim();
  if (!courseId) return { ok: false, message: "Course id is required" };

  const slugErr = validateLearningSectionSlug(input.slug);
  if (slugErr) return { ok: false, message: slugErr };
  const nameErr = validateLearningSectionName(input.name);
  if (nameErr) return { ok: false, message: nameErr };
  const visibility = input.visibility ?? "private";
  if (!isSectionVisibility(visibility)) {
    return { ok: false, message: "Invalid learning section visibility" };
  }

  const course = await getInstructorCourse(supabase, courseId);
  if (!course.ok) return course;
  if (!courseAllowsSectionCreate(course.data.status)) {
    return { ok: false, message: LEARNING_SECTION_REQUIRES_VALID_COURSE };
  }

  const program = await getInstructorProgram(supabase, course.data.program_id);
  if (!program.ok) return program;
  if (!programAllowsCourseCreate(program.data.status)) {
    return { ok: false, message: LEARNING_SECTION_REQUIRES_VALID_PROGRAM };
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok) return space;
  if (space.data.status !== "active") {
    return { ok: false, message: LEARNING_SECTION_REQUIRES_ACTIVE_SPACE };
  }

  const { data, error } = await supabase.rpc(LEARNING_SECTION_RPCS.create, {
    p_course_id: courseId,
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_visibility: visibility,
    p_default_language: input.default_language?.trim() || "en",
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to create learning section"),
    };
  }

  const record = asRecord(data);
  const section_id = asString(record?.section_id);
  if (!section_id) {
    return { ok: false, message: "Create section returned no section_id" };
  }
  const position = parsePosition(record?.position);

  return {
    ok: true,
    data: {
      section_id,
      course_id: asString(record?.course_id) ?? courseId,
      status: asString(record?.status) ?? "draft",
      position: Number.isFinite(position) ? position : 0,
    },
  };
}

export async function publishLearningSection(
  supabase: AnyClient,
  sectionId: string
): Promise<InstructorAuthoringResult<{ section_id: string; status: string }>> {
  const id = sectionId.trim();
  if (!id) return { ok: false, message: "Section id is required" };

  const { data, error } = await supabase.rpc(LEARNING_SECTION_RPCS.publish, {
    p_section_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to publish learning section"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      section_id: asString(record?.section_id) ?? id,
      status: asString(record?.status) ?? "published",
    },
  };
}

export async function archiveLearningSection(
  supabase: AnyClient,
  sectionId: string
): Promise<InstructorAuthoringResult<{ section_id: string; status: string }>> {
  const id = sectionId.trim();
  if (!id) return { ok: false, message: "Section id is required" };

  const { data, error } = await supabase.rpc(LEARNING_SECTION_RPCS.archive, {
    p_section_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to archive learning section"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      section_id: asString(record?.section_id) ?? id,
      status: asString(record?.status) ?? "archived",
    },
  };
}

/**
 * Lessons in a section visible via RLS (managers / staff / published paths).
 */
export async function listInstructorLessons(
  supabase: AnyClient,
  sectionId: string
): Promise<InstructorAuthoringResult<InstructorLessonSummary[]>> {
  const id = sectionId.trim();
  if (!id) return { ok: false, message: "Section id is required" };

  const { data, error } = await supabase
    .from("learning_lessons")
    .select(
      "id, section_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("section_id", id)
    .order("position", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning lessons"),
    };
  }

  const lessons: InstructorLessonSummary[] = [];
  for (const row of data ?? []) {
    const mapped = mapLessonRow(row as Record<string, unknown>);
    if (mapped) lessons.push(mapped);
  }
  return { ok: true, data: lessons };
}

export async function getInstructorLesson(
  supabase: AnyClient,
  lessonId: string
): Promise<InstructorAuthoringResult<InstructorLessonSummary>> {
  const id = lessonId.trim();
  if (!id) return { ok: false, message: "Lesson id is required" };

  const { data, error } = await supabase
    .from("learning_lessons")
    .select(
      "id, section_id, slug, name, description, status, visibility, position, default_language, created_at, updated_at, published_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to load learning lesson"),
    };
  }
  if (!data) {
    return { ok: false, message: "Learning lesson not found" };
  }

  const mapped = mapLessonRow(data as Record<string, unknown>);
  if (!mapped) {
    return { ok: false, message: "Learning lesson row is invalid" };
  }
  return { ok: true, data: mapped };
}

export async function createLearningLesson(
  supabase: AnyClient,
  input: CreateLearningLessonInput
): Promise<
  InstructorAuthoringResult<{
    lesson_id: string;
    section_id: string;
    status: string;
    position: number;
  }>
> {
  const sectionId = input.section_id.trim();
  if (!sectionId) return { ok: false, message: "Section id is required" };

  const slugErr = validateLearningLessonSlug(input.slug);
  if (slugErr) return { ok: false, message: slugErr };
  const nameErr = validateLearningLessonName(input.name);
  if (nameErr) return { ok: false, message: nameErr };
  const visibility = input.visibility ?? "private";
  if (!isLessonVisibility(visibility)) {
    return { ok: false, message: "Invalid learning lesson visibility" };
  }

  const section = await getInstructorSection(supabase, sectionId);
  if (!section.ok) return section;
  if (!sectionAllowsLessonCreate(section.data.status)) {
    return { ok: false, message: LEARNING_LESSON_REQUIRES_VALID_SECTION };
  }

  const course = await getInstructorCourse(supabase, section.data.course_id);
  if (!course.ok) return course;
  if (!courseAllowsSectionCreate(course.data.status)) {
    return { ok: false, message: LEARNING_LESSON_REQUIRES_VALID_COURSE };
  }

  const program = await getInstructorProgram(supabase, course.data.program_id);
  if (!program.ok) return program;
  if (!programAllowsCourseCreate(program.data.status)) {
    return { ok: false, message: LEARNING_LESSON_REQUIRES_VALID_PROGRAM };
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok) return space;
  if (space.data.status !== "active") {
    return { ok: false, message: LEARNING_LESSON_REQUIRES_ACTIVE_SPACE };
  }

  const { data, error } = await supabase.rpc(LEARNING_LESSON_RPCS.create, {
    p_section_id: sectionId,
    p_slug: input.slug.trim().toLowerCase(),
    p_name: input.name.trim(),
    p_description: input.description?.trim() ? input.description.trim() : null,
    p_visibility: visibility,
    p_default_language: input.default_language?.trim() || "en",
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to create learning lesson"),
    };
  }

  const record = asRecord(data);
  const lesson_id = asString(record?.lesson_id);
  if (!lesson_id) {
    return { ok: false, message: "Create lesson returned no lesson_id" };
  }
  const position = parsePosition(record?.position);

  return {
    ok: true,
    data: {
      lesson_id,
      section_id: asString(record?.section_id) ?? sectionId,
      status: asString(record?.status) ?? "draft",
      position: Number.isFinite(position) ? position : 0,
    },
  };
}

export async function publishLearningLesson(
  supabase: AnyClient,
  lessonId: string
): Promise<InstructorAuthoringResult<{ lesson_id: string; status: string }>> {
  const id = lessonId.trim();
  if (!id) return { ok: false, message: "Lesson id is required" };

  const { data, error } = await supabase.rpc(LEARNING_LESSON_RPCS.publish, {
    p_lesson_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to publish learning lesson"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      lesson_id: asString(record?.lesson_id) ?? id,
      status: asString(record?.status) ?? "published",
    },
  };
}

export async function archiveLearningLesson(
  supabase: AnyClient,
  lessonId: string
): Promise<InstructorAuthoringResult<{ lesson_id: string; status: string }>> {
  const id = lessonId.trim();
  if (!id) return { ok: false, message: "Lesson id is required" };

  const { data, error } = await supabase.rpc(LEARNING_LESSON_RPCS.archive, {
    p_lesson_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: errMessage(error, "Failed to archive learning lesson"),
    };
  }

  const record = asRecord(data);
  return {
    ok: true,
    data: {
      lesson_id: asString(record?.lesson_id) ?? id,
      status: asString(record?.status) ?? "archived",
    },
  };
}
