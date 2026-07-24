/**
 * UM Learning OS — Instructor Authoring Foundation V1 (Phase 0–3).
 *
 * Space dashboard + create / publish / archive via existing RPCs.
 * User JWT only. No service role. No TS authorization substitute.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
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
} as const;

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
