/**
 * UM Learning OS — Instructor Authoring Foundation V1 (Phase 0–3 + 4A).
 *
 * Space + Program create / publish / archive via existing RPCs.
 * User JWT only. No service role. No TS authorization substitute.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
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
} as const;

/** Surfaced when creating a program under a non-active space (matches SQL). */
export const LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE =
  "Learning space must be active for program changes" as const;

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
