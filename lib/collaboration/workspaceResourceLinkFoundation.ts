/**
 * Collaboration Workspace Resource Link Foundation V1.
 *
 * Typed reference/binding metadata over spine table
 * `collaboration_workspace_resource_links` (20260896 schema-only).
 *
 * Workspace → Resource Reference. Not product ownership.
 * No Learning/Commerce/Live binding RPCs. No authenticated writes
 * (table grants: SELECT only for authenticated).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLABORATION_RESOURCE_LINK_RELATIONSHIPS,
  COLLABORATION_RESOURCE_LINK_STATUSES,
  COLLABORATION_RESOURCE_TYPES_RESERVED,
  type CollaborationResourceLinkRelationship,
  type CollaborationResourceLinkStatus,
  type CollaborationResourceType,
} from "./workspaceSpineFoundation";
import { isCollaborationUuid } from "./workspaceMembershipRuntime";

type AnyClient = SupabaseClient;

export type CollaborationResourceLinkResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

/** Opaque metadata bag — never interpreted as product payload. */
export type CollaborationResourceLinkMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

/**
 * Canonical resource reference identity.
 * `resourceType` is the reserved product-plane vocabulary (not a platform id).
 */
export type CollaborationResourceReference = {
  readonly resourceType: CollaborationResourceType;
  readonly resourceId: string;
};

export type CollaborationWorkspaceResourceLinkRecord = {
  readonly id: string;
  readonly workspaceId: string;
  readonly resourceType: CollaborationResourceType;
  readonly resourceId: string;
  readonly relationshipType: CollaborationResourceLinkRelationship;
  readonly status: CollaborationResourceLinkStatus;
  readonly linkedBy: string | null;
  readonly linkedAt: string;
  readonly metadata: CollaborationResourceLinkMetadata;
  readonly createdAt: string;
  readonly updatedAt: string;
};

/** Future mutation intent — validated only; not executed in V1. */
export type CollaborationResourceLinkCreateIntent = {
  readonly workspaceId: string;
  readonly resourceType: CollaborationResourceType;
  readonly resourceId: string;
  readonly relationshipType?: CollaborationResourceLinkRelationship;
  readonly metadata?: CollaborationResourceLinkMetadata;
};

/** Future revoke intent — validated only; not executed in V1. */
export type CollaborationResourceLinkRevokeIntent = {
  readonly workspaceId: string;
  readonly linkId: string;
};

export const COLLABORATION_RESOURCE_LINK_TABLE =
  "collaboration_workspace_resource_links" as const;

export type CollaborationResourceTypeName =
  (typeof COLLABORATION_RESOURCE_TYPES_RESERVED)[number];

export type CollaborationResourceLinkRelationshipName =
  (typeof COLLABORATION_RESOURCE_LINK_RELATIONSHIPS)[number];

export type CollaborationResourceLinkStatusName =
  (typeof COLLABORATION_RESOURCE_LINK_STATUSES)[number];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function isCollaborationResourceType(
  value: string
): value is CollaborationResourceType {
  return (COLLABORATION_RESOURCE_TYPES_RESERVED as readonly string[]).includes(
    value
  );
}

export function isCollaborationResourceLinkRelationship(
  value: string
): value is CollaborationResourceLinkRelationship {
  return (
    COLLABORATION_RESOURCE_LINK_RELATIONSHIPS as readonly string[]
  ).includes(value);
}

export function isCollaborationResourceLinkStatus(
  value: string
): value is CollaborationResourceLinkStatus {
  return (COLLABORATION_RESOURCE_LINK_STATUSES as readonly string[]).includes(
    value
  );
}

export function validateCollaborationResourceReference(
  input: {
    resourceType: string;
    resourceId: string;
  }
): CollaborationResourceLinkResult<CollaborationResourceReference> {
  if (!isCollaborationResourceType(input.resourceType)) {
    return {
      ok: false,
      message: "Unsupported collaboration resource type.",
    };
  }
  if (!isCollaborationUuid(input.resourceId)) {
    return {
      ok: false,
      message: "resource_id must be a valid UUID.",
    };
  }
  return {
    ok: true,
    data: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    },
  };
}

export function validateCollaborationResourceLinkCreateIntent(
  intent: CollaborationResourceLinkCreateIntent
): CollaborationResourceLinkResult<
  Required<
    Pick<
      CollaborationResourceLinkCreateIntent,
      "workspaceId" | "resourceType" | "resourceId" | "relationshipType"
    >
  > & { metadata: CollaborationResourceLinkMetadata }
> {
  if (!isCollaborationUuid(intent.workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }
  const ref = validateCollaborationResourceReference({
    resourceType: intent.resourceType,
    resourceId: intent.resourceId,
  });
  if (!ref.ok) return { ok: false, message: ref.message };

  const relationshipType = intent.relationshipType ?? "linked";
  if (!isCollaborationResourceLinkRelationship(relationshipType)) {
    return {
      ok: false,
      message: "Unsupported collaboration resource relationship.",
    };
  }

  const metadata = normalizeCollaborationResourceLinkMetadata(
    intent.metadata ?? {}
  );
  if (!metadata.ok) return { ok: false, message: metadata.message };

  return {
    ok: true,
    data: {
      workspaceId: intent.workspaceId,
      resourceType: ref.data.resourceType,
      resourceId: ref.data.resourceId,
      relationshipType,
      metadata: metadata.data,
    },
  };
}

export function validateCollaborationResourceLinkRevokeIntent(
  intent: CollaborationResourceLinkRevokeIntent
): CollaborationResourceLinkResult<CollaborationResourceLinkRevokeIntent> {
  if (!isCollaborationUuid(intent.workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }
  if (!isCollaborationUuid(intent.linkId)) {
    return { ok: false, message: "link_id must be a valid UUID." };
  }
  return { ok: true, data: intent };
}

/**
 * V1: authenticated clients cannot mutate resource links (spine grants).
 * Intent validation may pass; execution is fail-closed.
 */
export function rejectCollaborationResourceLinkMutation(): CollaborationResourceLinkResult<never> {
  return {
    ok: false,
    message:
      "Collaboration resource link mutations are not available in foundation V1.",
  };
}

export function normalizeCollaborationResourceLinkMetadata(
  value: unknown
): CollaborationResourceLinkResult<CollaborationResourceLinkMetadata> {
  const record = asRecord(value);
  if (!record) {
    return { ok: false, message: "metadata must be an object." };
  }
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!key || key.length > 64) {
      return { ok: false, message: "metadata key is invalid." };
    }
    if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      out[key] = raw;
      continue;
    }
    return {
      ok: false,
      message: "metadata values must be string, number, boolean, or null.",
    };
  }
  return { ok: true, data: out };
}

export function normalizeCollaborationWorkspaceResourceLinkRow(
  row: unknown
): CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord> {
  const r = asRecord(row);
  if (!r) {
    return { ok: false, message: "Resource link row is malformed." };
  }

  const id = asString(r.id);
  const workspaceId = asString(r.workspace_id);
  const resourceType = asString(r.resource_type);
  const resourceId = asString(r.resource_id);
  const relationshipType = asString(r.relationship_type) ?? "linked";
  const status = asString(r.status) ?? "active";
  const linkedAt = asString(r.linked_at);
  const createdAt = asString(r.created_at);
  const updatedAt = asString(r.updated_at);
  const linkedBy = asString(r.linked_by);

  if (!id || !isCollaborationUuid(id)) {
    return { ok: false, message: "Resource link id is invalid." };
  }
  if (!workspaceId || !isCollaborationUuid(workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }
  if (!resourceType || !isCollaborationResourceType(resourceType)) {
    return { ok: false, message: "Unsupported collaboration resource type." };
  }
  if (!resourceId || !isCollaborationUuid(resourceId)) {
    return { ok: false, message: "resource_id must be a valid UUID." };
  }
  if (!isCollaborationResourceLinkRelationship(relationshipType)) {
    return {
      ok: false,
      message: "Unsupported collaboration resource relationship.",
    };
  }
  if (!isCollaborationResourceLinkStatus(status)) {
    return { ok: false, message: "Unsupported collaboration resource status." };
  }
  if (!linkedAt || !createdAt || !updatedAt) {
    return { ok: false, message: "Resource link timestamps are required." };
  }
  if (linkedBy != null && !isCollaborationUuid(linkedBy)) {
    return { ok: false, message: "linked_by must be a valid UUID." };
  }

  const metadata = normalizeCollaborationResourceLinkMetadata(
    r.metadata ?? {}
  );
  if (!metadata.ok) return { ok: false, message: metadata.message };

  return {
    ok: true,
    data: {
      id,
      workspaceId,
      resourceType,
      resourceId,
      relationshipType,
      status,
      linkedBy,
      linkedAt,
      metadata: metadata.data,
      createdAt,
      updatedAt,
    },
  };
}

function sanitizeResourceLinkQueryError(message: string | undefined): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Workspace resource link query failed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("jwt") ||
    lower.includes("auth") ||
    lower.includes("permission") ||
    lower.includes("rls") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to view workspace resource links.";
  }
  if (raw.length > 180) return "Workspace resource link query failed.";
  return raw;
}

/**
 * List resource links for a workspace (RLS member/admin SELECT).
 * Does not mutate external products.
 */
export async function listCollaborationWorkspaceResourceLinks(
  supabase: AnyClient,
  workspaceId: string,
  options?: { status?: CollaborationResourceLinkStatus }
): Promise<
  CollaborationResourceLinkResult<
    readonly CollaborationWorkspaceResourceLinkRecord[]
  >
> {
  if (!isCollaborationUuid(workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }
  if (
    options?.status != null &&
    !isCollaborationResourceLinkStatus(options.status)
  ) {
    return { ok: false, message: "Unsupported collaboration resource status." };
  }

  let query = supabase
    .from(COLLABORATION_RESOURCE_LINK_TABLE)
    .select(
      "id, workspace_id, resource_type, resource_id, relationship_type, status, linked_by, linked_at, metadata, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) {
    return {
      ok: false,
      message: sanitizeResourceLinkQueryError(error.message),
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const normalized: CollaborationWorkspaceResourceLinkRecord[] = [];
  for (const row of rows) {
    const item = normalizeCollaborationWorkspaceResourceLinkRow(row);
    if (!item.ok) {
      return { ok: false, message: item.message };
    }
    normalized.push(item.data);
  }
  return { ok: true, data: normalized };
}

export async function getCollaborationWorkspaceResourceLinkByResource(
  supabase: AnyClient,
  reference: { resourceType: string; resourceId: string }
): Promise<
  CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord | null>
> {
  const ref = validateCollaborationResourceReference(reference);
  if (!ref.ok) return { ok: false, message: ref.message };

  const { data, error } = await supabase
    .from(COLLABORATION_RESOURCE_LINK_TABLE)
    .select(
      "id, workspace_id, resource_type, resource_id, relationship_type, status, linked_by, linked_at, metadata, created_at, updated_at"
    )
    .eq("resource_type", ref.data.resourceType)
    .eq("resource_id", ref.data.resourceId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: sanitizeResourceLinkQueryError(error.message),
    };
  }
  if (!data) {
    return { ok: true, data: null };
  }
  return normalizeCollaborationWorkspaceResourceLinkRow(data);
}

/** Deterministic sort key for resource references. */
export function collaborationResourceReferenceKey(
  reference: CollaborationResourceReference
): string {
  return `${reference.resourceType}:${reference.resourceId}`;
}
