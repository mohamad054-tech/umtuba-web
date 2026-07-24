/**
 * UM Learning OS — Instructor Authoring Minimal V1.
 *
 * Typed, allowlisted wrappers over existing staff Learning RPCs.
 * DB remains the final authorization authority. No direct table writes.
 * No questions/answer keys, no moderate, no settings expansion, no cascade.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_ACTIVITY_RPCS,
  LEARNING_ACTIVITY_TYPES,
  LEARNING_ACTIVITY_VISIBILITIES,
  type LearningActivityType,
  type LearningActivityVisibility,
} from "./activitiesFoundation";
import {
  LEARNING_COURSE_HELPERS,
  type LearningCourse,
} from "./coursesFoundation";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RPCS,
  type LearningLessonContentBlockType,
} from "./lessonContentBlocksFoundation";
import {
  LEARNING_LESSON_RPCS,
  LEARNING_LESSON_VISIBILITIES,
  type LearningLessonVisibility,
} from "./lessonsFoundation";
import {
  LEARNING_SECTION_RPCS,
  LEARNING_SECTION_VISIBILITIES,
  type LearningSectionVisibility,
} from "./sectionsFoundation";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Authoritative / identity fields callers must never supply. */
export const INSTRUCTOR_AUTHORING_FORBIDDEN_INPUT_KEYS = [
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
  "published_at",
  "suspended_at",
  "archived_at",
  "space_id",
  "program_id",
  "course_id", // except where the operation requires parent course_id
  "section_id",
  "lesson_id",
  "activity_id",
  "status",
  "position",
  "actor_id",
  "user_id",
  "staff_role",
  "role",
  "ownership",
  "audit_actor",
] as const;

export const INSTRUCTOR_AUTHORING_OPERATIONS = [
  "create_section",
  "update_section",
  "publish_section",
  "archive_section",
  "reorder_sections",
  "create_lesson",
  "update_lesson",
  "publish_lesson",
  "archive_lesson",
  "reorder_lessons",
  "create_activity",
  "update_activity",
  "publish_activity",
  "archive_activity",
  "reorder_activities",
  "create_content_block",
  "update_content_block",
  "publish_content_block",
  "unpublish_content_block",
  "archive_content_block",
  "reorder_content_blocks",
] as const;

export type InstructorAuthoringOperation =
  (typeof INSTRUCTOR_AUTHORING_OPERATIONS)[number];

export const INSTRUCTOR_AUTHORING_RPC_BY_OPERATION = {
  create_section: LEARNING_SECTION_RPCS.create,
  update_section: LEARNING_SECTION_RPCS.update,
  publish_section: LEARNING_SECTION_RPCS.publish,
  archive_section: LEARNING_SECTION_RPCS.archive,
  reorder_sections: LEARNING_SECTION_RPCS.reorder,
  create_lesson: LEARNING_LESSON_RPCS.create,
  update_lesson: LEARNING_LESSON_RPCS.update,
  publish_lesson: LEARNING_LESSON_RPCS.publish,
  archive_lesson: LEARNING_LESSON_RPCS.archive,
  reorder_lessons: LEARNING_LESSON_RPCS.reorder,
  create_activity: LEARNING_ACTIVITY_RPCS.create,
  update_activity: LEARNING_ACTIVITY_RPCS.update,
  publish_activity: LEARNING_ACTIVITY_RPCS.publish,
  archive_activity: LEARNING_ACTIVITY_RPCS.archive,
  reorder_activities: LEARNING_ACTIVITY_RPCS.reorder,
  create_content_block: LEARNING_LESSON_CONTENT_BLOCK_RPCS.create,
  update_content_block: LEARNING_LESSON_CONTENT_BLOCK_RPCS.update,
  publish_content_block: LEARNING_LESSON_CONTENT_BLOCK_RPCS.publish,
  unpublish_content_block: LEARNING_LESSON_CONTENT_BLOCK_RPCS.unpublish,
  archive_content_block: LEARNING_LESSON_CONTENT_BLOCK_RPCS.archive,
  reorder_content_blocks: LEARNING_LESSON_CONTENT_BLOCK_RPCS.reorder,
} as const satisfies Record<InstructorAuthoringOperation, string>;

/** Operations intentionally absent from Minimal V1. */
export const INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS = [
  "create_question",
  "update_question",
  "set_answer_key",
  "moderate_section",
  "moderate_lesson",
  "moderate_activity",
  "moderate_content_block",
  "update_activity_settings",
  "create_program",
  "create_course",
] as const;

export const LEARNING_INSTRUCTOR_ROUTES = {
  hub: "/learning/instructor",
  course: (courseId: string) => `/learning/instructor/courses/${courseId}`,
  lesson: (courseId: string, lessonId: string) =>
    `/learning/instructor/courses/${courseId}/lessons/${lessonId}`,
} as const;

export type InstructorAuthoringOk = {
  ok: true;
  data: unknown;
};

export type InstructorAuthoringErr = {
  ok: false;
  message: string;
};

export type InstructorAuthoringResult =
  | InstructorAuthoringOk
  | InstructorAuthoringErr;

export type InstructorAuthorableCourse = Pick<
  LearningCourse,
  "id" | "name" | "slug" | "status" | "program_id" | "description"
>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function rejectUnknownKeys(
  input: Record<string, unknown>,
  allowed: readonly string[]
): string | null {
  const allow = new Set(allowed);
  for (const key of Object.keys(input)) {
    if (!allow.has(key)) {
      return `Unknown field: ${key}`;
    }
  }
  return null;
}

function rejectForbiddenKeys(input: Record<string, unknown>): string | null {
  for (const key of Object.keys(input)) {
    if (
      (INSTRUCTOR_AUTHORING_FORBIDDEN_INPUT_KEYS as readonly string[]).includes(
        key
      )
    ) {
      // Parent ids are allowed only via explicit allowlists per operation.
      if (
        key === "course_id" ||
        key === "section_id" ||
        key === "lesson_id" ||
        key === "activity_id"
      ) {
        continue;
      }
      return `Forbidden field: ${key}`;
    }
  }
  return null;
}

function requireUuid(value: unknown, label: string): string | null {
  if (typeof value !== "string" || !isUuid(value)) {
    return `${label} must be a valid UUID`;
  }
  return null;
}

function requireSlug(value: unknown): string | null {
  if (typeof value !== "string") return "slug is required";
  const slug = value.trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 64) {
    return "slug must be 3–64 chars of lowercase letters, digits, and hyphens";
  }
  return null;
}

function requireName(value: unknown): string | null {
  if (typeof value !== "string") return "name is required";
  const name = value.trim();
  if (name.length < 1 || name.length > 160) {
    return "name must be 1–160 characters";
  }
  return null;
}

function optionalDescription(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (text.length > 4000) return undefined;
  return text;
}

function parseVisibility(
  value: unknown,
  allowed: readonly string[],
  fallback: string
): string | null {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return null;
  const v = value.trim();
  return (allowed as readonly string[]).includes(v) ? v : null;
}

function parseUuidList(value: unknown, label: string): string[] | null {
  if (!Array.isArray(value) || value.length < 1) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !isUuid(item)) return null;
    out.push(item);
  }
  if (new Set(out).size !== out.length) return null;
  if (label && out.length < 1) return null;
  return out;
}

function sanitizeRpcError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Request could not be completed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("permission") ||
    lower.includes("not allowed") ||
    lower.includes("not entitled") ||
    lower.includes("authentication required")
  ) {
    return "You are not allowed to perform this action.";
  }
  if (lower.includes("not found")) {
    return "The requested item was not found.";
  }
  if (lower.includes("only draft")) {
    return "Only draft items can be published.";
  }
  if (lower.includes("suspended")) {
    return "This item cannot be changed while suspended.";
  }
  if (lower.includes("archived")) {
    return "Archived items cannot be changed this way.";
  }
  if (lower.includes("reorder")) {
    return "Reorder failed. Provide the complete ordered id list.";
  }
  // Strip SQL/schema hints
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

async function callRpc(
  supabase: AnyClient,
  rpcName: string,
  args: Record<string, unknown>
): Promise<InstructorAuthoringResult> {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (error) {
    return { ok: false, message: sanitizeRpcError(error.message) };
  }
  return { ok: true, data };
}

/**
 * Validate and map a single authoring operation to an existing RPC call.
 * Unknown operations and unknown fields fail closed.
 */
export function buildInstructorAuthoringRpcCall(
  operation: string,
  rawInput: unknown
):
  | { ok: true; rpc: string; args: Record<string, unknown> }
  | { ok: false; message: string } {
  if (
    !(INSTRUCTOR_AUTHORING_OPERATIONS as readonly string[]).includes(operation)
  ) {
    return { ok: false, message: "Unknown authoring operation." };
  }
  if (
    (INSTRUCTOR_AUTHORING_EXCLUDED_OPERATIONS as readonly string[]).includes(
      operation
    )
  ) {
    return { ok: false, message: "Operation is out of scope for Minimal V1." };
  }
  if (!isPlainObject(rawInput)) {
    return { ok: false, message: "Input must be an object." };
  }

  const forbidden = rejectForbiddenKeys(rawInput);
  if (forbidden) return { ok: false, message: forbidden };

  const op = operation as InstructorAuthoringOperation;
  const rpc = INSTRUCTOR_AUTHORING_RPC_BY_OPERATION[op];

  switch (op) {
    case "create_section": {
      const err =
        rejectUnknownKeys(rawInput, [
          "course_id",
          "slug",
          "name",
          "description",
          "visibility",
          "default_language",
        ]) ??
        requireUuid(rawInput.course_id, "course_id") ??
        requireSlug(rawInput.slug) ??
        requireName(rawInput.name);
      if (err) return { ok: false, message: err };
      const visibility = parseVisibility(
        rawInput.visibility,
        LEARNING_SECTION_VISIBILITIES,
        "private"
      );
      if (!visibility) return { ok: false, message: "Invalid visibility." };
      const description = optionalDescription(rawInput.description);
      if (description === undefined) {
        return { ok: false, message: "Invalid description." };
      }
      const lang =
        typeof rawInput.default_language === "string" &&
        rawInput.default_language.trim()
          ? rawInput.default_language.trim()
          : "en";
      return {
        ok: true,
        rpc,
        args: {
          p_course_id: rawInput.course_id,
          p_slug: String(rawInput.slug).trim().toLowerCase(),
          p_name: String(rawInput.name).trim(),
          p_description: description,
          p_visibility: visibility,
          p_default_language: lang,
        },
      };
    }
    case "update_section": {
      const err =
        rejectUnknownKeys(rawInput, [
          "section_id",
          "name",
          "description",
          "visibility",
          "clear_description",
        ]) ?? requireUuid(rawInput.section_id, "section_id");
      if (err) return { ok: false, message: err };
      const args: Record<string, unknown> = {
        p_section_id: rawInput.section_id,
      };
      if (rawInput.name !== undefined) {
        const nameErr = requireName(rawInput.name);
        if (nameErr) return { ok: false, message: nameErr };
        args.p_name = String(rawInput.name).trim();
      }
      if (rawInput.description !== undefined) {
        const description = optionalDescription(rawInput.description);
        if (description === undefined) {
          return { ok: false, message: "Invalid description." };
        }
        args.p_description = description;
      }
      if (rawInput.visibility !== undefined) {
        const visibility = parseVisibility(
          rawInput.visibility,
          LEARNING_SECTION_VISIBILITIES,
          ""
        );
        if (!visibility) return { ok: false, message: "Invalid visibility." };
        args.p_visibility = visibility as LearningSectionVisibility;
      }
      if (rawInput.clear_description === true) {
        args.p_clear_description = true;
      }
      return { ok: true, rpc, args };
    }
    case "publish_section":
    case "archive_section": {
      const err =
        rejectUnknownKeys(rawInput, ["section_id"]) ??
        requireUuid(rawInput.section_id, "section_id");
      if (err) return { ok: false, message: err };
      return {
        ok: true,
        rpc,
        args: { p_section_id: rawInput.section_id },
      };
    }
    case "reorder_sections": {
      const err =
        rejectUnknownKeys(rawInput, ["course_id", "section_ids"]) ??
        requireUuid(rawInput.course_id, "course_id");
      if (err) return { ok: false, message: err };
      const ids = parseUuidList(rawInput.section_ids, "section_ids");
      if (!ids) {
        return {
          ok: false,
          message: "section_ids must be a non-empty unique UUID list.",
        };
      }
      return {
        ok: true,
        rpc,
        args: { p_course_id: rawInput.course_id, p_section_ids: ids },
      };
    }
    case "create_lesson": {
      const err =
        rejectUnknownKeys(rawInput, [
          "section_id",
          "slug",
          "name",
          "description",
          "visibility",
          "default_language",
        ]) ??
        requireUuid(rawInput.section_id, "section_id") ??
        requireSlug(rawInput.slug) ??
        requireName(rawInput.name);
      if (err) return { ok: false, message: err };
      const visibility = parseVisibility(
        rawInput.visibility,
        LEARNING_LESSON_VISIBILITIES,
        "private"
      );
      if (!visibility) return { ok: false, message: "Invalid visibility." };
      const description = optionalDescription(rawInput.description);
      if (description === undefined) {
        return { ok: false, message: "Invalid description." };
      }
      const lang =
        typeof rawInput.default_language === "string" &&
        rawInput.default_language.trim()
          ? rawInput.default_language.trim()
          : "en";
      return {
        ok: true,
        rpc,
        args: {
          p_section_id: rawInput.section_id,
          p_slug: String(rawInput.slug).trim().toLowerCase(),
          p_name: String(rawInput.name).trim(),
          p_description: description,
          p_visibility: visibility as LearningLessonVisibility,
          p_default_language: lang,
          p_content_type: null,
        },
      };
    }
    case "update_lesson": {
      const err =
        rejectUnknownKeys(rawInput, [
          "lesson_id",
          "name",
          "description",
          "visibility",
          "clear_description",
        ]) ?? requireUuid(rawInput.lesson_id, "lesson_id");
      if (err) return { ok: false, message: err };
      const args: Record<string, unknown> = {
        p_lesson_id: rawInput.lesson_id,
      };
      if (rawInput.name !== undefined) {
        const nameErr = requireName(rawInput.name);
        if (nameErr) return { ok: false, message: nameErr };
        args.p_name = String(rawInput.name).trim();
      }
      if (rawInput.description !== undefined) {
        const description = optionalDescription(rawInput.description);
        if (description === undefined) {
          return { ok: false, message: "Invalid description." };
        }
        args.p_description = description;
      }
      if (rawInput.visibility !== undefined) {
        const visibility = parseVisibility(
          rawInput.visibility,
          LEARNING_LESSON_VISIBILITIES,
          ""
        );
        if (!visibility) return { ok: false, message: "Invalid visibility." };
        args.p_visibility = visibility;
      }
      if (rawInput.clear_description === true) {
        args.p_clear_description = true;
      }
      return { ok: true, rpc, args };
    }
    case "publish_lesson":
    case "archive_lesson": {
      const err =
        rejectUnknownKeys(rawInput, ["lesson_id"]) ??
        requireUuid(rawInput.lesson_id, "lesson_id");
      if (err) return { ok: false, message: err };
      return { ok: true, rpc, args: { p_lesson_id: rawInput.lesson_id } };
    }
    case "reorder_lessons": {
      const err =
        rejectUnknownKeys(rawInput, ["section_id", "lesson_ids"]) ??
        requireUuid(rawInput.section_id, "section_id");
      if (err) return { ok: false, message: err };
      const ids = parseUuidList(rawInput.lesson_ids, "lesson_ids");
      if (!ids) {
        return {
          ok: false,
          message: "lesson_ids must be a non-empty unique UUID list.",
        };
      }
      return {
        ok: true,
        rpc,
        args: { p_section_id: rawInput.section_id, p_lesson_ids: ids },
      };
    }
    case "create_activity": {
      const err =
        rejectUnknownKeys(rawInput, [
          "lesson_id",
          "type",
          "slug",
          "name",
          "description",
          "visibility",
        ]) ??
        requireUuid(rawInput.lesson_id, "lesson_id") ??
        requireSlug(rawInput.slug) ??
        requireName(rawInput.name);
      if (err) return { ok: false, message: err };
      if (
        typeof rawInput.type !== "string" ||
        !(LEARNING_ACTIVITY_TYPES as readonly string[]).includes(rawInput.type)
      ) {
        return { ok: false, message: "Invalid activity type." };
      }
      const visibility = parseVisibility(
        rawInput.visibility,
        LEARNING_ACTIVITY_VISIBILITIES,
        "private"
      );
      if (!visibility) return { ok: false, message: "Invalid visibility." };
      const description = optionalDescription(rawInput.description);
      if (description === undefined) {
        return { ok: false, message: "Invalid description." };
      }
      return {
        ok: true,
        rpc,
        args: {
          p_lesson_id: rawInput.lesson_id,
          p_type: rawInput.type as LearningActivityType,
          p_slug: String(rawInput.slug).trim().toLowerCase(),
          p_name: String(rawInput.name).trim(),
          p_description: description,
          p_visibility: visibility as LearningActivityVisibility,
        },
      };
    }
    case "update_activity": {
      const err =
        rejectUnknownKeys(rawInput, [
          "activity_id",
          "name",
          "description",
          "visibility",
          "clear_description",
        ]) ?? requireUuid(rawInput.activity_id, "activity_id");
      if (err) return { ok: false, message: err };
      const args: Record<string, unknown> = {
        p_activity_id: rawInput.activity_id,
      };
      if (rawInput.name !== undefined) {
        const nameErr = requireName(rawInput.name);
        if (nameErr) return { ok: false, message: nameErr };
        args.p_name = String(rawInput.name).trim();
      }
      if (rawInput.description !== undefined) {
        const description = optionalDescription(rawInput.description);
        if (description === undefined) {
          return { ok: false, message: "Invalid description." };
        }
        args.p_description = description;
      }
      if (rawInput.visibility !== undefined) {
        const visibility = parseVisibility(
          rawInput.visibility,
          LEARNING_ACTIVITY_VISIBILITIES,
          ""
        );
        if (!visibility) return { ok: false, message: "Invalid visibility." };
        args.p_visibility = visibility;
      }
      if (rawInput.clear_description === true) {
        args.p_clear_description = true;
      }
      return { ok: true, rpc, args };
    }
    case "publish_activity":
    case "archive_activity": {
      const err =
        rejectUnknownKeys(rawInput, ["activity_id"]) ??
        requireUuid(rawInput.activity_id, "activity_id");
      if (err) return { ok: false, message: err };
      return { ok: true, rpc, args: { p_activity_id: rawInput.activity_id } };
    }
    case "reorder_activities": {
      const err =
        rejectUnknownKeys(rawInput, ["lesson_id", "activity_ids"]) ??
        requireUuid(rawInput.lesson_id, "lesson_id");
      if (err) return { ok: false, message: err };
      const ids = parseUuidList(rawInput.activity_ids, "activity_ids");
      if (!ids) {
        return {
          ok: false,
          message: "activity_ids must be a non-empty unique UUID list.",
        };
      }
      return {
        ok: true,
        rpc,
        args: { p_lesson_id: rawInput.lesson_id, p_activity_ids: ids },
      };
    }
    case "create_content_block": {
      const err =
        rejectUnknownKeys(rawInput, ["lesson_id", "block_type", "content"]) ??
        requireUuid(rawInput.lesson_id, "lesson_id");
      if (err) return { ok: false, message: err };
      if (
        typeof rawInput.block_type !== "string" ||
        !(
          LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES as readonly string[]
        ).includes(rawInput.block_type)
      ) {
        return { ok: false, message: "Invalid content block type." };
      }
      const content = isPlainObject(rawInput.content)
        ? rawInput.content
        : rawInput.content === undefined
          ? {}
          : null;
      if (content === null) {
        return { ok: false, message: "content must be an object." };
      }
      return {
        ok: true,
        rpc,
        args: {
          p_lesson_id: rawInput.lesson_id,
          p_block_type: rawInput.block_type as LearningLessonContentBlockType,
          p_content: content,
        },
      };
    }
    case "update_content_block": {
      const err =
        rejectUnknownKeys(rawInput, ["block_id", "content"]) ??
        requireUuid(rawInput.block_id, "block_id");
      if (err) return { ok: false, message: err };
      if (!isPlainObject(rawInput.content)) {
        return { ok: false, message: "content is required and must be an object." };
      }
      return {
        ok: true,
        rpc,
        args: {
          p_block_id: rawInput.block_id,
          p_content: rawInput.content,
        },
      };
    }
    case "publish_content_block":
    case "unpublish_content_block":
    case "archive_content_block": {
      const err =
        rejectUnknownKeys(rawInput, ["block_id"]) ??
        requireUuid(rawInput.block_id, "block_id");
      if (err) return { ok: false, message: err };
      return { ok: true, rpc, args: { p_block_id: rawInput.block_id } };
    }
    case "reorder_content_blocks": {
      const err =
        rejectUnknownKeys(rawInput, ["lesson_id", "block_ids"]) ??
        requireUuid(rawInput.lesson_id, "lesson_id");
      if (err) return { ok: false, message: err };
      const ids = parseUuidList(rawInput.block_ids, "block_ids");
      if (!ids) {
        return {
          ok: false,
          message: "block_ids must be a non-empty unique UUID list.",
        };
      }
      return {
        ok: true,
        rpc,
        args: { p_lesson_id: rawInput.lesson_id, p_block_ids: ids },
      };
    }
    default:
      return { ok: false, message: "Unknown authoring operation." };
  }
}

export async function runInstructorAuthoringOperation(
  supabase: AnyClient,
  operation: string,
  rawInput: unknown
): Promise<InstructorAuthoringResult> {
  const built = buildInstructorAuthoringRpcCall(operation, rawInput);
  if (!built.ok) return built;
  return callRpc(supabase, built.rpc, built.args);
}

/** UX pre-check only — RPC remains authoritative. */
export async function canManageLearningCourseUx(
  supabase: AnyClient,
  courseId: string
): Promise<boolean> {
  if (!isUuid(courseId)) return false;
  const { data, error } = await supabase.rpc(
    LEARNING_COURSE_HELPERS.canManage,
    { p_course_id: courseId }
  );
  if (error) return false;
  return data === true;
}

/**
 * Courses visible to staff via existing SELECT/RLS (manage + staff policies).
 * Never uses service role.
 */
export async function listInstructorAuthorableCourses(
  supabase: AnyClient
): Promise<InstructorAuthoringResult> {
  const { data, error } = await supabase
    .from("learning_courses")
    .select("id, name, slug, status, program_id, description")
    .order("name", { ascending: true });
  if (error) {
    return { ok: false, message: sanitizeRpcError(error.message) };
  }
  return { ok: true, data: (data ?? []) as InstructorAuthorableCourse[] };
}

export type InstructorCourseTree = {
  course: InstructorAuthorableCourse;
  sections: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    position: number;
    description: string | null;
    lessons: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      position: number;
      description: string | null;
      activities: Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
        position: number;
        type: string;
        description: string | null;
      }>;
    }>;
  }>;
};

export async function loadInstructorCourseTree(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult> {
  if (!isUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }

  const { data: course, error: courseError } = await supabase
    .from("learning_courses")
    .select("id, name, slug, status, program_id, description")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError) {
    return { ok: false, message: sanitizeRpcError(courseError.message) };
  }
  if (!course) {
    return { ok: false, message: "Course not found or unavailable." };
  }

  const canManage = await canManageLearningCourseUx(supabase, courseId);
  // Staff with update (not manage) may still read via RLS; keep tree readable
  // when SELECT succeeds. Manage gate is for control visibility in UI.

  const { data: sections, error: sectionsError } = await supabase
    .from("learning_sections")
    .select("id, name, slug, status, position, description")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  if (sectionsError) {
    return { ok: false, message: sanitizeRpcError(sectionsError.message) };
  }

  const sectionRows = sections ?? [];
  const sectionIds = sectionRows.map((s) => s.id as string);

  let lessonRows: Array<Record<string, unknown>> = [];
  if (sectionIds.length > 0) {
    const { data: lessons, error: lessonsError } = await supabase
      .from("learning_lessons")
      .select("id, section_id, name, slug, status, position, description")
      .in("section_id", sectionIds)
      .order("position", { ascending: true });
    if (lessonsError) {
      return { ok: false, message: sanitizeRpcError(lessonsError.message) };
    }
    lessonRows = (lessons ?? []) as Array<Record<string, unknown>>;
  }

  const lessonIds = lessonRows.map((l) => l.id as string);
  let activityRows: Array<Record<string, unknown>> = [];
  if (lessonIds.length > 0) {
    const { data: activities, error: activitiesError } = await supabase
      .from("learning_activities")
      .select("id, lesson_id, name, slug, status, position, type, description")
      .in("lesson_id", lessonIds)
      .order("position", { ascending: true });
    if (activitiesError) {
      return { ok: false, message: sanitizeRpcError(activitiesError.message) };
    }
    activityRows = (activities ?? []) as Array<Record<string, unknown>>;
  }

  const tree: InstructorCourseTree = {
    course: course as InstructorAuthorableCourse,
    sections: sectionRows.map((section) => {
      const lessons = lessonRows
        .filter((l) => l.section_id === section.id)
        .map((lesson) => ({
          id: lesson.id as string,
          name: lesson.name as string,
          slug: lesson.slug as string,
          status: lesson.status as string,
          position: lesson.position as number,
          description: (lesson.description as string | null) ?? null,
          activities: activityRows
            .filter((a) => a.lesson_id === lesson.id)
            .map((activity) => ({
              id: activity.id as string,
              name: activity.name as string,
              slug: activity.slug as string,
              status: activity.status as string,
              position: activity.position as number,
              type: activity.type as string,
              description: (activity.description as string | null) ?? null,
            })),
        }));
      return {
        id: section.id as string,
        name: section.name as string,
        slug: section.slug as string,
        status: section.status as string,
        position: section.position as number,
        description: (section.description as string | null) ?? null,
        lessons,
      };
    }),
  };

  return {
    ok: true,
    data: { tree, canManage },
  };
}

export async function loadInstructorLessonBlocks(
  supabase: AnyClient,
  lessonId: string
): Promise<InstructorAuthoringResult> {
  if (!isUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }
  const { data, error } = await supabase
    .from("learning_lesson_content_blocks")
    .select(
      "id, lesson_id, block_type, status, position, content, created_at, updated_at"
    )
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });
  if (error) {
    return { ok: false, message: sanitizeRpcError(error.message) };
  }
  return { ok: true, data: data ?? [] };
}
