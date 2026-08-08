/**
 * Collaboration ↔ Learning Workspace Resource Binding V1.
 *
 * Maps Learning Space identities onto Collaboration resource links.
 * Boundary: Workspace → Learning resource reference.
 * Does NOT own or mutate Learning product lifecycle.
 *
 * Writes go through existing Collaboration mutation runtime RPCs.
 * Learning authorization uses existing `can_manage_learning_space`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LEARNING_SPACE_HELPERS,
} from "../learning/spacesFoundation";
import {
  type CollaborationResourceLinkCreateIntent,
  type CollaborationResourceLinkMetadata,
  type CollaborationResourceLinkResult,
  type CollaborationResourceReference,
  type CollaborationWorkspaceResourceLinkRecord,
  getCollaborationWorkspaceResourceLinkByResource,
  listCollaborationWorkspaceResourceLinks,
  validateCollaborationResourceReference,
} from "./workspaceResourceLinkFoundation";
import {
  createCollaborationWorkspaceResourceLink,
  deleteCollaborationWorkspaceResourceLink,
} from "./workspaceResourceLinkMutationRuntime";
import { isCollaborationUuid } from "./workspaceMembershipRuntime";

type AnyClient = SupabaseClient;

/** Canonical Collaboration resource_type for Learning Spaces. */
export const LEARNING_WORKSPACE_RESOURCE_TYPE = "learning_space" as const;

export const LEARNING_WORKSPACE_RESOURCE_PLATFORM = "learning" as const;

/**
 * Stable Learning instructor entry scoped to a space.
 * Reuses the existing space-scoped instructor route (no new Learning routes).
 */
export function learningSpaceResourceHref(spaceId: string): string {
  return `/learning/instructor/spaces/${spaceId.trim()}/programs/new`;
}

export type LearningSpaceResourceIdentity = {
  readonly spaceId: string;
};

export type LearningWorkspaceResourceResolved = {
  readonly resourceType: typeof LEARNING_WORKSPACE_RESOURCE_TYPE;
  readonly resourceId: string;
  readonly platform: typeof LEARNING_WORKSPACE_RESOURCE_PLATFORM;
  readonly displayLabel: string;
  readonly slug: string;
  readonly status: string;
  readonly mode: string;
  readonly href: string;
};

export type CreateLearningWorkspaceResourceReferenceInput = {
  readonly workspaceId: string;
  readonly spaceId: string;
  readonly relationshipType?: CollaborationResourceLinkCreateIntent["relationshipType"];
};

export type LinkedLearningWorkspaceResource = {
  readonly linkId: string;
  readonly workspaceId: string;
  readonly relationshipType: CollaborationWorkspaceResourceLinkRecord["relationshipType"];
  readonly status: CollaborationWorkspaceResourceLinkRecord["status"];
  readonly linkedAt: string;
  readonly resource: LearningWorkspaceResourceResolved;
};

/** Learning Space roles that satisfy `can_manage_learning_space`. */
const LEARNING_SPACE_MANAGE_ROLES = ["owner", "admin"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeLearningWorkspaceBindingError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Learning workspace resource binding failed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication") ||
    lower.includes("not allowed") ||
    lower.includes("permission") ||
    lower.includes("jwt") ||
    lower.includes("rls")
  ) {
    return "You are not allowed to bind this Learning space.";
  }
  if (lower.includes("not found") || lower.includes("does not exist")) {
    return "Learning space was not found.";
  }
  if (raw.length > 180) return "Learning workspace resource binding failed.";
  return raw;
}

/**
 * Validate + map a Learning Space UUID to the Collaboration reference model.
 */
export function createLearningWorkspaceResourceReferenceModel(
  identity: LearningSpaceResourceIdentity
): CollaborationResourceLinkResult<CollaborationResourceReference> {
  const spaceId = (identity.spaceId ?? "").trim();
  if (!isCollaborationUuid(spaceId)) {
    return {
      ok: false,
      message: "Learning space id must be a valid UUID.",
    };
  }
  return validateCollaborationResourceReference({
    resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
    resourceId: spaceId,
  });
}

export function buildLearningSpaceLinkMetadata(input: {
  name: string;
  slug: string;
  status: string;
  mode: string;
  href: string;
}): CollaborationResourceLinkResult<CollaborationResourceLinkMetadata> {
  const name = input.name.trim();
  const slug = input.slug.trim();
  if (!name || name.length > 120) {
    return { ok: false, message: "Learning space display label is invalid." };
  }
  if (!slug || slug.length > 64) {
    return { ok: false, message: "Learning space slug is invalid." };
  }
  return {
    ok: true,
    data: {
      platform: LEARNING_WORKSPACE_RESOURCE_PLATFORM,
      product: LEARNING_WORKSPACE_RESOURCE_TYPE,
      display_name: name,
      slug,
      status: input.status,
      mode: input.mode,
      href: input.href,
    },
  };
}

/**
 * Prove the actor can manage the Learning Space (Learning auth boundary).
 */
export async function assertCanManageLearningSpaceForBinding(
  supabase: AnyClient,
  spaceId: string
): Promise<CollaborationResourceLinkResult<true>> {
  if (!isCollaborationUuid(spaceId)) {
    return {
      ok: false,
      message: "Learning space id must be a valid UUID.",
    };
  }

  const { data, error } = await supabase.rpc(
    LEARNING_SPACE_HELPERS.canManage,
    { p_space_id: spaceId }
  );

  if (error) {
    return {
      ok: false,
      message: sanitizeLearningWorkspaceBindingError(error.message),
    };
  }

  if (data !== true) {
    return {
      ok: false,
      message: "You are not allowed to bind this Learning space.",
    };
  }

  return { ok: true, data: true };
}

/**
 * Resolve a Learning Space into display/navigation metadata via Learning SELECT RLS.
 */
export async function resolveLearningWorkspaceResourceReference(
  supabase: AnyClient,
  identity: LearningSpaceResourceIdentity
): Promise<CollaborationResourceLinkResult<LearningWorkspaceResourceResolved>> {
  const reference = createLearningWorkspaceResourceReferenceModel(identity);
  if (!reference.ok) return { ok: false, message: reference.message };

  const { data, error } = await supabase
    .from("learning_spaces")
    .select("id, name, slug, status, mode")
    .eq("id", reference.data.resourceId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: sanitizeLearningWorkspaceBindingError(error.message),
    };
  }

  const row = asRecord(data);
  if (!row) {
    return { ok: false, message: "Learning space was not found." };
  }

  const id = asString(row.id);
  const name = asString(row.name);
  const slug = asString(row.slug);
  const status = asString(row.status) ?? "draft";
  const mode = asString(row.mode) ?? "general_academy";
  if (!id || !name || !slug) {
    return { ok: false, message: "Learning space payload is malformed." };
  }

  const href = learningSpaceResourceHref(id);
  return {
    ok: true,
    data: {
      resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
      resourceId: id,
      platform: LEARNING_WORKSPACE_RESOURCE_PLATFORM,
      displayLabel: name,
      slug,
      status,
      mode,
      href,
    },
  };
}

/**
 * Link a Learning Space into a Collaboration workspace (reference only).
 * Requires Learning manage rights + Collaboration mutation RPC authz.
 */
export async function createLearningWorkspaceResourceReference(
  supabase: AnyClient,
  input: CreateLearningWorkspaceResourceReferenceInput
): Promise<
  CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord>
> {
  const reference = createLearningWorkspaceResourceReferenceModel({
    spaceId: input.spaceId,
  });
  if (!reference.ok) return { ok: false, message: reference.message };

  const allowed = await assertCanManageLearningSpaceForBinding(
    supabase,
    reference.data.resourceId
  );
  if (!allowed.ok) return { ok: false, message: allowed.message };

  const resolved = await resolveLearningWorkspaceResourceReference(supabase, {
    spaceId: reference.data.resourceId,
  });
  if (!resolved.ok) return { ok: false, message: resolved.message };

  const metadata = buildLearningSpaceLinkMetadata({
    name: resolved.data.displayLabel,
    slug: resolved.data.slug,
    status: resolved.data.status,
    mode: resolved.data.mode,
    href: resolved.data.href,
  });
  if (!metadata.ok) return { ok: false, message: metadata.message };

  return createCollaborationWorkspaceResourceLink(supabase, {
    workspaceId: input.workspaceId,
    resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
    resourceId: reference.data.resourceId,
    relationshipType: input.relationshipType ?? "linked",
    metadata: metadata.data,
  });
}

/**
 * Unlink a Learning Space reference from a Collaboration workspace.
 * Uses existing mutation runtime delete path (hard unlink).
 */
export async function unlinkLearningWorkspaceResourceReference(
  supabase: AnyClient,
  input: { workspaceId: string; spaceId: string }
): Promise<
  CollaborationResourceLinkResult<{
    workspaceId: string;
    linkId: string;
    deleted: true;
  }>
> {
  const reference = createLearningWorkspaceResourceReferenceModel({
    spaceId: input.spaceId,
  });
  if (!reference.ok) return { ok: false, message: reference.message };

  if (!isCollaborationUuid(input.workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }

  const allowed = await assertCanManageLearningSpaceForBinding(
    supabase,
    reference.data.resourceId
  );
  if (!allowed.ok) return { ok: false, message: allowed.message };

  const existing = await getCollaborationWorkspaceResourceLinkByResource(
    supabase,
    reference.data
  );
  if (!existing.ok) return { ok: false, message: existing.message };
  if (!existing.data) {
    return { ok: false, message: "Resource link was not found." };
  }
  if (existing.data.workspaceId !== input.workspaceId) {
    return {
      ok: false,
      message: "Resource link does not belong to this workspace.",
    };
  }

  return deleteCollaborationWorkspaceResourceLink(supabase, {
    workspaceId: input.workspaceId,
    linkId: existing.data.id,
  });
}

/**
 * Resolve presentation fields from an already-loaded Collaboration link row.
 * Prefers stored lightweight metadata; falls back to canonical href builder.
 */
export function resolveLearningWorkspaceResourceFromLink(
  link: CollaborationWorkspaceResourceLinkRecord
): CollaborationResourceLinkResult<LearningWorkspaceResourceResolved> {
  if (link.resourceType !== LEARNING_WORKSPACE_RESOURCE_TYPE) {
    return {
      ok: false,
      message: "Unsupported collaboration resource type.",
    };
  }

  const displayLabel =
    asString(link.metadata.display_name) ??
    asString(link.metadata.slug) ??
    link.resourceId;
  const slug = asString(link.metadata.slug) ?? "";
  const status = asString(link.metadata.status) ?? "unknown";
  const mode = asString(link.metadata.mode) ?? "unknown";
  const href =
    asString(link.metadata.href) ?? learningSpaceResourceHref(link.resourceId);

  return {
    ok: true,
    data: {
      resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
      resourceId: link.resourceId,
      platform: LEARNING_WORKSPACE_RESOURCE_PLATFORM,
      displayLabel,
      slug,
      status,
      mode,
      href,
    },
  };
}

/**
 * List Learning Space links currently bound to a Collaboration workspace.
 * Non-Learning resource types are ignored (Commerce/advertiser stay deferred).
 */
export async function listLinkedLearningWorkspaceResources(
  supabase: AnyClient,
  workspaceId: string
): Promise<
  CollaborationResourceLinkResult<readonly LinkedLearningWorkspaceResource[]>
> {
  const listed = await listCollaborationWorkspaceResourceLinks(
    supabase,
    workspaceId,
    { status: "active" }
  );
  if (!listed.ok) return { ok: false, message: listed.message };

  const linked: LinkedLearningWorkspaceResource[] = [];
  for (const link of listed.data) {
    if (link.resourceType !== LEARNING_WORKSPACE_RESOURCE_TYPE) continue;
    const resolved = resolveLearningWorkspaceResourceFromLink(link);
    if (!resolved.ok) return { ok: false, message: resolved.message };
    linked.push({
      linkId: link.id,
      workspaceId: link.workspaceId,
      relationshipType: link.relationshipType,
      status: link.status,
      linkedAt: link.linkedAt,
      resource: resolved.data,
    });
  }
  return { ok: true, data: linked };
}

/**
 * Learning Spaces the actor can manage that are not already linked on this
 * workspace. Cross-workspace uniqueness remains enforced by mutation RPCs.
 */
export async function listEligibleLearningSpacesForBinding(
  supabase: AnyClient,
  input: { userId: string; workspaceId: string }
): Promise<
  CollaborationResourceLinkResult<readonly LearningWorkspaceResourceResolved[]>
> {
  if (!isCollaborationUuid(input.userId)) {
    return { ok: false, message: "user_id must be a valid UUID." };
  }
  if (!isCollaborationUuid(input.workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }

  const { data: memberships, error: memErr } = await supabase
    .from("learning_space_members")
    .select("space_id, role")
    .eq("user_id", input.userId)
    .eq("status", "active")
    .in("role", [...LEARNING_SPACE_MANAGE_ROLES]);

  if (memErr) {
    return {
      ok: false,
      message: sanitizeLearningWorkspaceBindingError(memErr.message),
    };
  }

  const spaceIds = new Set<string>();
  for (const row of memberships ?? []) {
    const rec = asRecord(row);
    const spaceId = asString(rec?.space_id);
    if (spaceId && isCollaborationUuid(spaceId)) spaceIds.add(spaceId);
  }
  if (spaceIds.size === 0) return { ok: true, data: [] };

  const ids = [...spaceIds];
  const { data: spaces, error: spaceErr } = await supabase
    .from("learning_spaces")
    .select("id, name, slug, status, mode")
    .in("id", ids)
    .order("name", { ascending: true });

  if (spaceErr) {
    return {
      ok: false,
      message: sanitizeLearningWorkspaceBindingError(spaceErr.message),
    };
  }

  const alreadyLinked = await listLinkedLearningWorkspaceResources(
    supabase,
    input.workspaceId
  );
  if (!alreadyLinked.ok) {
    return { ok: false, message: alreadyLinked.message };
  }
  const linkedIds = new Set(
    alreadyLinked.data.map((item) => item.resource.resourceId)
  );

  const eligible: LearningWorkspaceResourceResolved[] = [];
  for (const row of spaces ?? []) {
    const rec = asRecord(row);
    if (!rec) continue;
    const id = asString(rec.id);
    const name = asString(rec.name);
    const slug = asString(rec.slug);
    if (!id || !name || !slug) continue;
    if (linkedIds.has(id)) continue;
    eligible.push({
      resourceType: LEARNING_WORKSPACE_RESOURCE_TYPE,
      resourceId: id,
      platform: LEARNING_WORKSPACE_RESOURCE_PLATFORM,
      displayLabel: name,
      slug,
      status: asString(rec.status) ?? "draft",
      mode: asString(rec.mode) ?? "general_academy",
      href: learningSpaceResourceHref(id),
    });
  }

  return { ok: true, data: eligible };
}
