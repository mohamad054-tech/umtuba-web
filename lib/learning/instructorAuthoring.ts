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

/** SECURITY DEFINER authoring tree read — avoids nested FORCE RLS SELECTs. */
export const LEARNING_INSTRUCTOR_COURSE_TREE_RPC =
  "get_instructor_learning_course_tree" as const;

export type InstructorCourseTreePayload = {
  tree: InstructorCourseTree;
  canManage: boolean;
};

function parseActivity(raw: unknown): InstructorCourseTree["sections"][number]["lessons"][number]["activities"][number] | null {
  if (!isPlainObject(raw)) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.slug !== "string" ||
    typeof raw.status !== "string" ||
    typeof raw.position !== "number" ||
    typeof raw.type !== "string"
  ) {
    return null;
  }
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status: raw.status,
    position: raw.position,
    type: raw.type,
    description:
      raw.description === null || typeof raw.description === "string"
        ? (raw.description as string | null)
        : null,
  };
}

function parseLesson(raw: unknown): InstructorCourseTree["sections"][number]["lessons"][number] | null {
  if (!isPlainObject(raw)) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.slug !== "string" ||
    typeof raw.status !== "string" ||
    typeof raw.position !== "number"
  ) {
    return null;
  }
  const activitiesRaw = Array.isArray(raw.activities) ? raw.activities : [];
  const activities: InstructorCourseTree["sections"][number]["lessons"][number]["activities"] =
    [];
  for (const item of activitiesRaw) {
    const parsed = parseActivity(item);
    if (!parsed) return null;
    activities.push(parsed);
  }
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status: raw.status,
    position: raw.position,
    description:
      raw.description === null || typeof raw.description === "string"
        ? (raw.description as string | null)
        : null,
    activities,
  };
}

function parseSection(raw: unknown): InstructorCourseTree["sections"][number] | null {
  if (!isPlainObject(raw)) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.slug !== "string" ||
    typeof raw.status !== "string" ||
    typeof raw.position !== "number"
  ) {
    return null;
  }
  const lessonsRaw = Array.isArray(raw.lessons) ? raw.lessons : [];
  const lessons: InstructorCourseTree["sections"][number]["lessons"] = [];
  for (const item of lessonsRaw) {
    const parsed = parseLesson(item);
    if (!parsed) return null;
    lessons.push(parsed);
  }
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status: raw.status,
    position: raw.position,
    description:
      raw.description === null || typeof raw.description === "string"
        ? (raw.description as string | null)
        : null,
    lessons,
  };
}

/** Parse RPC payload from get_instructor_learning_course_tree. */
export function parseInstructorCourseTreePayload(
  raw: unknown
): InstructorCourseTreePayload | null {
  if (!isPlainObject(raw)) return null;
  const treeRaw = raw.tree;
  if (!isPlainObject(treeRaw)) return null;
  const courseRaw = treeRaw.course;
  if (!isPlainObject(courseRaw)) return null;
  if (
    typeof courseRaw.id !== "string" ||
    typeof courseRaw.name !== "string" ||
    typeof courseRaw.slug !== "string" ||
    typeof courseRaw.status !== "string" ||
    typeof courseRaw.program_id !== "string"
  ) {
    return null;
  }
  const sectionsRaw = Array.isArray(treeRaw.sections) ? treeRaw.sections : null;
  if (!sectionsRaw) return null;
  const sections: InstructorCourseTree["sections"] = [];
  for (const item of sectionsRaw) {
    const parsed = parseSection(item);
    if (!parsed) return null;
    sections.push(parsed);
  }
  const canManage =
    typeof raw.can_manage === "boolean"
      ? raw.can_manage
      : typeof raw.canManage === "boolean"
        ? raw.canManage
        : null;
  if (canManage === null) return null;
  return {
    canManage,
    tree: {
      course: {
        id: courseRaw.id,
        name: courseRaw.name,
        slug: courseRaw.slug,
        status: courseRaw.status as InstructorAuthorableCourse["status"],
        program_id: courseRaw.program_id,
        description:
          courseRaw.description === null ||
          typeof courseRaw.description === "string"
            ? (courseRaw.description as string | null)
            : null,
      },
      sections,
    },
  };
}

export async function loadInstructorCourseTree(
  supabase: AnyClient,
  courseId: string
): Promise<InstructorAuthoringResult> {
  if (!isUuid(courseId)) {
    return { ok: false, message: "course_id must be a valid UUID" };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_INSTRUCTOR_COURSE_TREE_RPC,
    { p_course_id: courseId }
  );
  if (error) {
    return { ok: false, message: sanitizeRpcError(error.message) };
  }

  const parsed = parseInstructorCourseTreePayload(data);
  if (!parsed) {
    return { ok: false, message: "Course tree payload is malformed." };
  }

  return {
    ok: true,
    data: { tree: parsed.tree, canManage: parsed.canManage },
  };
}

/** SECURITY DEFINER lesson blocks read — avoids nested FORCE RLS SELECTs. */
export const LEARNING_INSTRUCTOR_LESSON_BLOCKS_RPC =
  "get_instructor_learning_lesson_blocks" as const;

export type InstructorLessonBlockRow = {
  id: string;
  lesson_id: string;
  block_type: string;
  status: string;
  position: number;
  content: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type InstructorLessonBlocksLesson = {
  id: string;
  name: string;
  slug: string;
  status: string;
  section_id: string;
  course_id: string;
  description: string | null;
  position: number;
};

export type InstructorLessonBlocksPayload = {
  lesson: InstructorLessonBlocksLesson;
  blocks: InstructorLessonBlockRow[];
  canManage: boolean;
};

function parseLessonBlockRow(raw: unknown): InstructorLessonBlockRow | null {
  if (!isPlainObject(raw)) return null;
  if (
    typeof raw.id !== "string" ||
    typeof raw.lesson_id !== "string" ||
    typeof raw.block_type !== "string" ||
    typeof raw.status !== "string" ||
    typeof raw.position !== "number"
  ) {
    return null;
  }
  const content =
    raw.content === null
      ? null
      : isPlainObject(raw.content)
        ? raw.content
        : null;
  return {
    id: raw.id,
    lesson_id: raw.lesson_id,
    block_type: raw.block_type,
    status: raw.status,
    position: raw.position,
    content,
    created_at: typeof raw.created_at === "string" ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : undefined,
  };
}

/** Parse RPC payload from get_instructor_learning_lesson_blocks. */
export function parseInstructorLessonBlocksPayload(
  raw: unknown
): InstructorLessonBlocksPayload | null {
  if (!isPlainObject(raw)) return null;
  const lessonRaw = raw.lesson;
  if (!isPlainObject(lessonRaw)) return null;
  if (
    typeof lessonRaw.id !== "string" ||
    typeof lessonRaw.name !== "string" ||
    typeof lessonRaw.slug !== "string" ||
    typeof lessonRaw.status !== "string" ||
    typeof lessonRaw.section_id !== "string" ||
    typeof lessonRaw.course_id !== "string" ||
    typeof lessonRaw.position !== "number"
  ) {
    return null;
  }
  const blocksRaw = Array.isArray(raw.blocks) ? raw.blocks : null;
  if (!blocksRaw) return null;
  const blocks: InstructorLessonBlockRow[] = [];
  for (const item of blocksRaw) {
    const parsed = parseLessonBlockRow(item);
    if (!parsed) return null;
    blocks.push(parsed);
  }
  const canManage =
    typeof raw.can_manage === "boolean"
      ? raw.can_manage
      : typeof raw.canManage === "boolean"
        ? raw.canManage
        : null;
  if (canManage === null) return null;
  return {
    canManage,
    lesson: {
      id: lessonRaw.id,
      name: lessonRaw.name,
      slug: lessonRaw.slug,
      status: lessonRaw.status,
      section_id: lessonRaw.section_id,
      course_id: lessonRaw.course_id,
      position: lessonRaw.position,
      description:
        lessonRaw.description === null ||
        typeof lessonRaw.description === "string"
          ? (lessonRaw.description as string | null)
          : null,
    },
    blocks,
  };
}

export async function loadInstructorLessonBlocks(
  supabase: AnyClient,
  lessonId: string
): Promise<InstructorAuthoringResult> {
  if (!isUuid(lessonId)) {
    return { ok: false, message: "lesson_id must be a valid UUID" };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_INSTRUCTOR_LESSON_BLOCKS_RPC,
    { p_lesson_id: lessonId }
  );
  if (error) {
    return { ok: false, message: sanitizeRpcError(error.message) };
  }

  const parsed = parseInstructorLessonBlocksPayload(data);
  if (!parsed) {
    return { ok: false, message: "Lesson blocks payload is malformed." };
  }

  return { ok: true, data: parsed };
}
