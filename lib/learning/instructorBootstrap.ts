/**
 * UM Learning OS — Instructor Bootstrap Foundation V1.
 *
 * Creates Space → Program → Course via existing staff RPCs, then hands off
 * to the course-centric authoring path. No migrations. No learner changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_COURSE_RPCS,
  LEARNING_COURSE_VISIBILITIES,
  type LearningCourseVisibility,
} from "./coursesFoundation";
import {
  LEARNING_PROGRAM_FORMATS,
  LEARNING_PROGRAM_RPCS,
  LEARNING_PROGRAM_VISIBILITIES,
  type LearningProgramFormat,
  type LearningProgramVisibility,
} from "./programsFoundation";
import {
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_RPCS,
  LEARNING_SPACE_VISIBILITIES,
  type LearningSpaceMode,
  type LearningSpaceVisibility,
} from "./spacesFoundation";
import { LEARNING_INSTRUCTOR_ROUTES } from "./instructorAuthoring";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export const LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES = {
  hub: "/learning/instructor/bootstrap",
  spaceNew: "/learning/instructor/spaces/new",
  programNew: (spaceId: string) =>
    `/learning/instructor/spaces/${spaceId}/programs/new`,
  courseNew: (programId: string) =>
    `/learning/instructor/programs/${programId}/courses/new`,
  authoring: LEARNING_INSTRUCTOR_ROUTES.course,
} as const;

export type InstructorBootstrapOk<T = unknown> = { ok: true; data: T };
export type InstructorBootstrapErr = { ok: false; message: string };
export type InstructorBootstrapResult<T = unknown> =
  | InstructorBootstrapOk<T>
  | InstructorBootstrapErr;

export type InstructorBootstrapSpace = {
  id: string;
  name: string;
  slug: string;
  status: string;
  mode: string;
  visibility: string;
};

export type InstructorBootstrapProgram = {
  id: string;
  space_id: string;
  name: string;
  slug: string;
  status: string;
  format: string;
  visibility: string;
};

export function isBootstrapUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Derive a SQL-safe slug from a display name (3–64 chars). */
export function slugifyBootstrapName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (base.length >= 3 && SLUG_RE.test(base)) return base;
  const padded = (base || "item").padEnd(3, "x").slice(0, 64);
  return SLUG_RE.test(padded) ? padded : "item-x";
}

export function sanitizeBootstrapRpcError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Request could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("permission") ||
    lower.includes("not allowed") ||
    lower.includes("authentication required")
  ) {
    return "You are not allowed to perform this action.";
  }
  if (lower.includes("not found")) {
    return "The requested item was not found.";
  }
  if (lower.includes("must be active")) {
    return "Activate the learning space before creating programs or courses.";
  }
  if (lower.includes("duplicate") || lower.includes("unique")) {
    return "That slug is already in use. Choose another.";
  }
  if (lower.includes("invalid learning space slug") || lower.includes("invalid learning program slug") || lower.includes("invalid learning course slug")) {
    return "Slug must be 3–64 characters: lowercase letters, numbers, hyphens.";
  }
  if (lower.includes("invalid") && lower.includes("name")) {
    return "Name is required and must be within length limits.";
  }
  if (
    lower.includes("relation ") ||
    lower.includes("column ") ||
    lower.includes("policy") ||
    lower.includes("violates")
  ) {
    return "Request could not be completed.";
  }
  if (raw.length > 180) return "Request could not be completed.";
  return raw;
}

function parseIdFromRpc(
  data: unknown,
  key: "space_id" | "program_id" | "course_id"
): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" && isBootstrapUuid(value) ? value : null;
}

async function callRpc(
  supabase: AnyClient,
  rpcName: string,
  args: Record<string, unknown>
): Promise<InstructorBootstrapResult> {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    return { ok: false, message: sanitizeBootstrapRpcError(error.message) };
  }
  return { ok: true, data };
}

export type CreateSpaceInput = {
  name: string;
  slug?: string;
  description?: string | null;
  mode: LearningSpaceMode;
  visibility?: LearningSpaceVisibility;
  default_language?: string;
  /** When true (default), publish draft → active so programs can be created. */
  publish?: boolean;
};

export function validateCreateSpaceInput(
  raw: CreateSpaceInput
): InstructorBootstrapResult<CreateSpaceInput> {
  const name = (raw.name ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    return { ok: false, message: "Name is required (1–120 characters)." };
  }
  const slug = (raw.slug?.trim() || slugifyBootstrapName(name)).toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 64) {
    return {
      ok: false,
      message: "Slug must be 3–64 characters: lowercase letters, numbers, hyphens.",
    };
  }
  if (!(LEARNING_SPACE_MODES as readonly string[]).includes(raw.mode)) {
    return { ok: false, message: "Select a valid space mode." };
  }
  const visibility = (raw.visibility ?? "private") as LearningSpaceVisibility;
  if (!(LEARNING_SPACE_VISIBILITIES as readonly string[]).includes(visibility)) {
    return { ok: false, message: "Select a valid visibility." };
  }
  const language = (raw.default_language ?? "en").trim() || "en";
  if (!LANG_RE.test(language)) {
    return { ok: false, message: "Language must look like en or en-US." };
  }
  const description =
    raw.description == null || String(raw.description).trim() === ""
      ? null
      : String(raw.description).trim();
  if (description && description.length > 4000) {
    return { ok: false, message: "Description is too long." };
  }
  return {
    ok: true,
    data: {
      name,
      slug,
      description,
      mode: raw.mode,
      visibility,
      default_language: language,
      publish: raw.publish !== false,
    },
  };
}

export async function createInstructorSpace(
  supabase: AnyClient,
  raw: CreateSpaceInput
): Promise<InstructorBootstrapResult<{ space_id: string }>> {
  const validated = validateCreateSpaceInput(raw);
  if (!validated.ok) return validated;

  const created = await callRpc(supabase, LEARNING_SPACE_RPCS.create, {
    p_slug: validated.data.slug,
    p_name: validated.data.name,
    p_description: validated.data.description,
    p_mode: validated.data.mode,
    p_visibility: validated.data.visibility,
    p_default_language: validated.data.default_language,
  });
  if (!created.ok) return created;

  const spaceId = parseIdFromRpc(created.data, "space_id");
  if (!spaceId) {
    return { ok: false, message: "Space was created but no id was returned." };
  }

  if (validated.data.publish !== false) {
    const published = await callRpc(supabase, LEARNING_SPACE_RPCS.publish, {
      p_space_id: spaceId,
    });
    if (!published.ok) return published;
  }

  return { ok: true, data: { space_id: spaceId } };
}

export type CreateProgramInput = {
  space_id: string;
  name: string;
  slug?: string;
  format: LearningProgramFormat;
  description?: string | null;
  visibility?: LearningProgramVisibility;
  default_language?: string;
};

export function validateCreateProgramInput(
  raw: CreateProgramInput
): InstructorBootstrapResult<CreateProgramInput> {
  if (!isBootstrapUuid(raw.space_id)) {
    return { ok: false, message: "Valid space id is required." };
  }
  const name = (raw.name ?? "").trim();
  if (name.length < 1 || name.length > 160) {
    return { ok: false, message: "Name is required (1–160 characters)." };
  }
  const slug = (raw.slug?.trim() || slugifyBootstrapName(name)).toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 64) {
    return {
      ok: false,
      message: "Slug must be 3–64 characters: lowercase letters, numbers, hyphens.",
    };
  }
  if (!(LEARNING_PROGRAM_FORMATS as readonly string[]).includes(raw.format)) {
    return { ok: false, message: "Select a valid program format." };
  }
  const visibility = (raw.visibility ?? "private") as LearningProgramVisibility;
  if (
    !(LEARNING_PROGRAM_VISIBILITIES as readonly string[]).includes(visibility)
  ) {
    return { ok: false, message: "Select a valid visibility." };
  }
  const language = (raw.default_language ?? "en").trim() || "en";
  if (!LANG_RE.test(language)) {
    return { ok: false, message: "Language must look like en or en-US." };
  }
  const description =
    raw.description == null || String(raw.description).trim() === ""
      ? null
      : String(raw.description).trim();
  if (description && description.length > 8000) {
    return { ok: false, message: "Description is too long." };
  }
  return {
    ok: true,
    data: {
      space_id: raw.space_id,
      name,
      slug,
      format: raw.format,
      description,
      visibility,
      default_language: language,
    },
  };
}

export async function createInstructorProgram(
  supabase: AnyClient,
  raw: CreateProgramInput
): Promise<InstructorBootstrapResult<{ program_id: string }>> {
  const validated = validateCreateProgramInput(raw);
  if (!validated.ok) return validated;

  const created = await callRpc(supabase, LEARNING_PROGRAM_RPCS.create, {
    p_space_id: validated.data.space_id,
    p_slug: validated.data.slug,
    p_name: validated.data.name,
    p_format: validated.data.format,
    p_description: validated.data.description,
    p_visibility: validated.data.visibility,
    p_default_language: validated.data.default_language,
  });
  if (!created.ok) return created;

  const programId = parseIdFromRpc(created.data, "program_id");
  if (!programId) {
    return { ok: false, message: "Program was created but no id was returned." };
  }
  return { ok: true, data: { program_id: programId } };
}

export type CreateCourseInput = {
  program_id: string;
  name: string;
  slug?: string;
  description?: string | null;
  visibility?: LearningCourseVisibility;
  default_language?: string;
};

export function validateCreateCourseInput(
  raw: CreateCourseInput
): InstructorBootstrapResult<CreateCourseInput> {
  if (!isBootstrapUuid(raw.program_id)) {
    return { ok: false, message: "Valid program id is required." };
  }
  const name = (raw.name ?? "").trim();
  if (name.length < 1 || name.length > 160) {
    return { ok: false, message: "Name is required (1–160 characters)." };
  }
  const slug = (raw.slug?.trim() || slugifyBootstrapName(name)).toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 64) {
    return {
      ok: false,
      message: "Slug must be 3–64 characters: lowercase letters, numbers, hyphens.",
    };
  }
  const visibility = (raw.visibility ?? "private") as LearningCourseVisibility;
  if (!(LEARNING_COURSE_VISIBILITIES as readonly string[]).includes(visibility)) {
    return { ok: false, message: "Select a valid visibility." };
  }
  const language = (raw.default_language ?? "en").trim() || "en";
  if (!LANG_RE.test(language)) {
    return { ok: false, message: "Language must look like en or en-US." };
  }
  const description =
    raw.description == null || String(raw.description).trim() === ""
      ? null
      : String(raw.description).trim();
  if (description && description.length > 8000) {
    return { ok: false, message: "Description is too long." };
  }
  return {
    ok: true,
    data: {
      program_id: raw.program_id,
      name,
      slug,
      description,
      visibility,
      default_language: language,
    },
  };
}

export async function createInstructorCourse(
  supabase: AnyClient,
  raw: CreateCourseInput
): Promise<InstructorBootstrapResult<{ course_id: string }>> {
  const validated = validateCreateCourseInput(raw);
  if (!validated.ok) return validated;

  const created = await callRpc(supabase, LEARNING_COURSE_RPCS.create, {
    p_program_id: validated.data.program_id,
    p_slug: validated.data.slug,
    p_name: validated.data.name,
    p_description: validated.data.description,
    p_visibility: validated.data.visibility,
    p_default_language: validated.data.default_language,
  });
  if (!created.ok) return created;

  const courseId = parseIdFromRpc(created.data, "course_id");
  if (!courseId) {
    return { ok: false, message: "Course was created but no id was returned." };
  }
  return { ok: true, data: { course_id: courseId } };
}

/** Spaces the user can read via RLS (member / owner). */
export async function listMyInstructorSpaces(
  supabase: AnyClient
): Promise<InstructorBootstrapResult<InstructorBootstrapSpace[]>> {
  const { data, error } = await supabase
    .from("learning_spaces")
    .select("id, name, slug, status, mode, visibility")
    .order("name", { ascending: true });
  if (error) {
    return { ok: false, message: sanitizeBootstrapRpcError(error.message) };
  }
  return { ok: true, data: (data ?? []) as InstructorBootstrapSpace[] };
}

export async function listProgramsForSpace(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorBootstrapResult<InstructorBootstrapProgram[]>> {
  if (!isBootstrapUuid(spaceId)) {
    return { ok: false, message: "Valid space id is required." };
  }
  const { data, error } = await supabase
    .from("learning_programs")
    .select("id, space_id, name, slug, status, format, visibility")
    .eq("space_id", spaceId)
    .order("name", { ascending: true });
  if (error) {
    return { ok: false, message: sanitizeBootstrapRpcError(error.message) };
  }
  return { ok: true, data: (data ?? []) as InstructorBootstrapProgram[] };
}

export async function getBootstrapSpace(
  supabase: AnyClient,
  spaceId: string
): Promise<InstructorBootstrapResult<InstructorBootstrapSpace>> {
  if (!isBootstrapUuid(spaceId)) {
    return { ok: false, message: "Valid space id is required." };
  }
  const { data, error } = await supabase
    .from("learning_spaces")
    .select("id, name, slug, status, mode, visibility")
    .eq("id", spaceId)
    .maybeSingle();
  if (error) {
    return { ok: false, message: sanitizeBootstrapRpcError(error.message) };
  }
  if (!data) {
    return { ok: false, message: "The requested item was not found." };
  }
  return { ok: true, data: data as InstructorBootstrapSpace };
}

export async function getBootstrapProgram(
  supabase: AnyClient,
  programId: string
): Promise<InstructorBootstrapResult<InstructorBootstrapProgram>> {
  if (!isBootstrapUuid(programId)) {
    return { ok: false, message: "Valid program id is required." };
  }
  const { data, error } = await supabase
    .from("learning_programs")
    .select("id, space_id, name, slug, status, format, visibility")
    .eq("id", programId)
    .maybeSingle();
  if (error) {
    return { ok: false, message: sanitizeBootstrapRpcError(error.message) };
  }
  if (!data) {
    return { ok: false, message: "The requested item was not found." };
  }
  return { ok: true, data: data as InstructorBootstrapProgram };
}
