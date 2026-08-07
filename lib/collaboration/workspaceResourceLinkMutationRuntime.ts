/**
 * Collaboration Workspace Resource Link Mutation Runtime V1.
 *
 * Authenticated client over SECURITY DEFINER RPCs
 * (migration 20260919 — local only until applied).
 * Table grants remain SELECT-only; no service-role from user runtime.
 * No Learning / Commerce / advertiser product binding.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CollaborationResourceLinkCreateIntent,
  type CollaborationResourceLinkMetadata,
  type CollaborationResourceLinkResult,
  type CollaborationResourceLinkRevokeIntent,
  type CollaborationWorkspaceResourceLinkRecord,
  isCollaborationResourceLinkRelationship,
  isCollaborationResourceLinkStatus,
  normalizeCollaborationResourceLinkMetadata,
  normalizeCollaborationWorkspaceResourceLinkRow,
  validateCollaborationResourceLinkCreateIntent,
  validateCollaborationResourceLinkRevokeIntent,
} from "./workspaceResourceLinkFoundation";
import {
  COLLABORATION_RESOURCE_LINK_MUTATION_RPCS,
  type CollaborationResourceLinkRelationship,
  type CollaborationResourceLinkStatus,
} from "./workspaceSpineFoundation";
import { isCollaborationUuid } from "./workspaceMembershipRuntime";

type AnyClient = SupabaseClient;

export { COLLABORATION_RESOURCE_LINK_MUTATION_RPCS };

export type CollaborationResourceLinkUpdateInput = {
  readonly workspaceId: string;
  readonly linkId: string;
  readonly status?: CollaborationResourceLinkStatus;
  readonly relationshipType?: CollaborationResourceLinkRelationship;
  readonly metadata?: CollaborationResourceLinkMetadata;
};

export type CollaborationResourceLinkDeleteResult = {
  readonly workspaceId: string;
  readonly linkId: string;
  readonly deleted: true;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function sanitizeCollaborationResourceLinkMutationError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Workspace resource link mutation failed.";

  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed to manage workspace resource links") ||
    lower.includes("jwt") ||
    lower.includes("permission") ||
    lower.includes("rls")
  ) {
    return "You are not allowed to manage workspace resource links.";
  }
  if (
    lower.includes("already linked") ||
    lower.includes("unique") ||
    lower.includes("duplicate")
  ) {
    return "That resource is already linked to a workspace.";
  }
  if (
    lower.includes("resource link not found") ||
    lower.includes("not found")
  ) {
    if (lower.includes("workspace not found")) {
      return "Workspace is not available for resource link changes.";
    }
    return "Resource link was not found.";
  }
  if (
    lower.includes("not available for resource link") ||
    lower.includes("workspace not found")
  ) {
    return "Workspace is not available for resource link changes.";
  }
  if (
    lower.includes("unsupported collaboration resource") ||
    lower.includes("metadata") ||
    lower.includes("no supported resource link fields")
  ) {
    return "Resource link mutation input is invalid.";
  }
  if (raw.length > 180) return "Workspace resource link mutation failed.";
  return raw;
}

async function callResourceLinkMutationRpc(
  supabase: AnyClient,
  rpc: string,
  args: Record<string, unknown>
): Promise<CollaborationResourceLinkResult<Record<string, unknown>>> {
  const { data, error } = await supabase.rpc(rpc, args);
  if (error) {
    return {
      ok: false,
      message: sanitizeCollaborationResourceLinkMutationError(error.message),
    };
  }
  return { ok: true, data: asRecord(data) ?? {} };
}

function normalizeRpcLinkRow(
  data: Record<string, unknown>
): CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord> {
  const normalized = normalizeCollaborationWorkspaceResourceLinkRow(data);
  if (!normalized.ok) {
    return {
      ok: false,
      message: "Resource link mutation payload is malformed.",
    };
  }
  return normalized;
}

/**
 * Create a workspace → resource reference link (Collaboration plane only).
 */
export async function createCollaborationWorkspaceResourceLink(
  supabase: AnyClient,
  intent: CollaborationResourceLinkCreateIntent
): Promise<
  CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord>
> {
  const validated = validateCollaborationResourceLinkCreateIntent(intent);
  if (!validated.ok) return { ok: false, message: validated.message };

  const result = await callResourceLinkMutationRpc(
    supabase,
    COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.create,
    {
      p_workspace_id: validated.data.workspaceId,
      p_resource_type: validated.data.resourceType,
      p_resource_id: validated.data.resourceId,
      p_relationship_type: validated.data.relationshipType,
      p_metadata: validated.data.metadata,
    }
  );
  if (!result.ok) return result;
  return normalizeRpcLinkRow(result.data);
}

/**
 * Update whitelist fields only: status, relationshipType, metadata.
 */
export async function updateCollaborationWorkspaceResourceLink(
  supabase: AnyClient,
  input: CollaborationResourceLinkUpdateInput
): Promise<
  CollaborationResourceLinkResult<CollaborationWorkspaceResourceLinkRecord>
> {
  if (!isCollaborationUuid(input.workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID." };
  }
  if (!isCollaborationUuid(input.linkId)) {
    return { ok: false, message: "link_id must be a valid UUID." };
  }

  const hasStatus = input.status !== undefined;
  const hasRelationship = input.relationshipType !== undefined;
  const hasMetadata = input.metadata !== undefined;
  if (!hasStatus && !hasRelationship && !hasMetadata) {
    return {
      ok: false,
      message: "No supported resource link fields to update.",
    };
  }

  if (hasStatus && !isCollaborationResourceLinkStatus(input.status as string)) {
    return {
      ok: false,
      message: "Unsupported collaboration resource status.",
    };
  }
  if (
    hasRelationship &&
    !isCollaborationResourceLinkRelationship(input.relationshipType as string)
  ) {
    return {
      ok: false,
      message: "Unsupported collaboration resource relationship.",
    };
  }

  let metadataPayload: CollaborationResourceLinkMetadata | null = null;
  if (hasMetadata) {
    const metadata = normalizeCollaborationResourceLinkMetadata(input.metadata);
    if (!metadata.ok) return { ok: false, message: metadata.message };
    metadataPayload = metadata.data;
  }

  const result = await callResourceLinkMutationRpc(
    supabase,
    COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.update,
    {
      p_workspace_id: input.workspaceId,
      p_link_id: input.linkId,
      p_status: hasStatus ? input.status : null,
      p_relationship_type: hasRelationship ? input.relationshipType : null,
      p_metadata: metadataPayload,
    }
  );
  if (!result.ok) return result;
  return normalizeRpcLinkRow(result.data);
}

/**
 * Hard-delete / unlink a resource link (frees unique resource key).
 */
export async function deleteCollaborationWorkspaceResourceLink(
  supabase: AnyClient,
  intent: CollaborationResourceLinkRevokeIntent
): Promise<CollaborationResourceLinkResult<CollaborationResourceLinkDeleteResult>> {
  const validated = validateCollaborationResourceLinkRevokeIntent(intent);
  if (!validated.ok) return { ok: false, message: validated.message };

  const result = await callResourceLinkMutationRpc(
    supabase,
    COLLABORATION_RESOURCE_LINK_MUTATION_RPCS.delete,
    {
      p_workspace_id: validated.data.workspaceId,
      p_link_id: validated.data.linkId,
    }
  );
  if (!result.ok) return result;

  const workspaceId = asString(result.data.workspace_id);
  const linkId = asString(result.data.link_id);
  if (!workspaceId || !linkId || result.data.deleted !== true) {
    return {
      ok: false,
      message: "Resource link mutation payload is malformed.",
    };
  }

  return {
    ok: true,
    data: {
      workspaceId,
      linkId,
      deleted: true,
    },
  };
}
