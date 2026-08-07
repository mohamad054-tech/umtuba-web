/**
 * Collaboration Workspace Membership & Invitation Runtime V1.
 *
 * Thin authenticated client over spine RPCs (20260896) plus additive
 * revoke/leave RPCs (20260897). Fail-closed validation; no product bindings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLABORATION_WORKSPACE_INVITE_EMAIL_RE,
  COLLABORATION_WORKSPACE_INVITE_ROLES,
  COLLABORATION_WORKSPACE_KINDS,
  COLLABORATION_WORKSPACE_RPCS,
  type CollaborationWorkspaceInviteRole,
  type CollaborationWorkspaceKind,
} from "./workspaceSpineFoundation";

type AnyClient = SupabaseClient;

export const COLLABORATION_MEMBERSHIP_RUNTIME_RPCS = {
  ...COLLABORATION_WORKSPACE_RPCS,
  revokeInvite: "revoke_collaboration_workspace_invite",
  leaveWorkspace: "leave_collaboration_workspace",
  updateSettings: "update_collaboration_workspace_settings",
} as const;

export type CollaborationMembershipResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCollaborationUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function sanitizeCollaborationMembershipError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Workspace membership action failed.";

  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not allowed") ||
    lower.includes("peer-admin") ||
    lower.includes("platform admin required")
  ) {
    return "You are not allowed to perform this workspace action.";
  }
  if (
    lower.includes("transfer ownership before leaving") ||
    lower.includes("cannot remove the active owner") ||
    lower.includes("cannot suspend the active owner") ||
    lower.includes("cannot change the active owner") ||
    lower.includes("use transfer ownership to assign owner")
  ) {
    return "Ownership must be transferred before this membership change.";
  }
  if (
    lower.includes("cannot assign a role above") ||
    lower.includes("invalid role") ||
    lower.includes("not allowed to update member roles")
  ) {
    return "You are not allowed to perform this workspace action.";
  }
  if (
    lower.includes("not allowed to update workspace settings") ||
    lower.includes("only the workspace owner can archive") ||
    lower.includes("only the current owner can transfer")
  ) {
    return "You are not allowed to perform this workspace action.";
  }
  if (
    lower.includes("not available for settings updates") ||
    lower.includes("invalid workspace display_name") ||
    lower.includes("invalid workspace kind")
  ) {
    return "Workspace settings could not be updated.";
  }
  if (
    lower.includes("invite has expired") ||
    lower.includes("invite not found or already used") ||
    lower.includes("invite is not addressed") ||
    lower.includes("invite email does not match")
  ) {
    return "This invite is invalid, expired, or already used.";
  }
  if (
    lower.includes("already an active member") ||
    lower.includes("duplicate")
  ) {
    return "That user is already a member of this workspace.";
  }
  if (
    lower.includes("workspace must be active") ||
    lower.includes("only draft workspaces can be activated") ||
    lower.includes("workspace not found")
  ) {
    return "Workspace is not available for this membership action.";
  }
  if (raw.length > 180) return "Workspace membership action failed.";
  return raw;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<CollaborationMembershipResult<Record<string, unknown>>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(error.message),
    };
  }
  return { ok: true, data: asRecord(data) ?? {} };
}

function requireUuid(
  value: string | undefined | null,
  label: string
): CollaborationMembershipResult<string> {
  if (!value || !isCollaborationUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return { ok: true, data: value };
}

export type CreateCollaborationWorkspaceInput = {
  slug: string;
  displayName: string;
  kind: CollaborationWorkspaceKind | string;
  description?: string | null;
  legalName?: string | null;
  /** When true (default), activate immediately after create. */
  activate?: boolean;
};

export async function createCollaborationWorkspace(
  supabase: AnyClient,
  input: CreateCollaborationWorkspaceInput
): Promise<CollaborationMembershipResult<{ workspace_id: string; status?: string }>> {
  const slug = (input.slug ?? "").trim().toLowerCase();
  if (!SLUG_RE.test(slug) || slug.length < 3 || slug.length > 64) {
    return { ok: false, message: "Invalid workspace slug" };
  }

  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 1 || displayName.length > 120) {
    return { ok: false, message: "Invalid workspace display_name" };
  }

  if (
    !(COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(input.kind)
  ) {
    return { ok: false, message: "Invalid workspace kind" };
  }

  if (input.description != null && input.description.length > 4000) {
    return { ok: false, message: "Description too long" };
  }

  if (input.legalName != null && input.legalName.trim().length > 200) {
    return { ok: false, message: "Legal name too long" };
  }

  const created = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.create,
    {
      p_slug: slug,
      p_display_name: displayName,
      p_kind: input.kind,
      p_description: input.description ?? null,
      p_legal_name: input.legalName?.trim() || null,
    }
  );
  if (!created.ok) return created;

  const workspaceId = asString(created.data.workspace_id);
  if (!workspaceId) {
    return { ok: false, message: "Workspace create payload is malformed." };
  }

  const shouldActivate = input.activate !== false;
  if (!shouldActivate) {
    return { ok: true, data: { workspace_id: workspaceId, status: "draft" } };
  }

  const activated = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.activate,
    { p_workspace_id: workspaceId }
  );
  if (!activated.ok) return activated;

  return {
    ok: true,
    data: {
      workspace_id: workspaceId,
      status: asString(activated.data.status) ?? "active",
    },
  };
}

export async function inviteCollaborationWorkspaceMember(
  supabase: AnyClient,
  input: {
    workspaceId: string;
    role: CollaborationWorkspaceInviteRole | string;
    invitedUserId?: string | null;
    invitedEmail?: string | null;
  }
): Promise<
  CollaborationMembershipResult<{
    invite_id: string;
    token?: string;
    expires_at?: string;
  }>
> {
  const workspace = requireUuid(input.workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;

  if (
    !(COLLABORATION_WORKSPACE_INVITE_ROLES as readonly string[]).includes(
      input.role
    )
  ) {
    return { ok: false, message: "Invalid invite role" };
  }

  const invitedUserId = input.invitedUserId?.trim() || null;
  const invitedEmail = input.invitedEmail?.trim().toLowerCase() || null;

  if (!invitedUserId && !invitedEmail) {
    return {
      ok: false,
      message: "invited_user_id or invited_email is required",
    };
  }
  if (invitedUserId && !isCollaborationUuid(invitedUserId)) {
    return { ok: false, message: "invited_user_id must be a valid UUID" };
  }
  if (
    invitedEmail &&
    (invitedEmail.length < 3 ||
      invitedEmail.length > 320 ||
      !COLLABORATION_WORKSPACE_INVITE_EMAIL_RE.test(invitedEmail))
  ) {
    return { ok: false, message: "Invite email is invalid" };
  }

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.invite,
    {
      p_workspace_id: workspace.data,
      p_role: input.role,
      p_invited_user_id: invitedUserId,
      p_invited_email: invitedEmail,
    }
  );
  if (!result.ok) return result;

  const inviteId = asString(result.data.invite_id);
  if (!inviteId) {
    return { ok: false, message: "Invite payload is malformed." };
  }

  return {
    ok: true,
    data: {
      invite_id: inviteId,
      token: asString(result.data.token) ?? undefined,
      expires_at:
        typeof result.data.expires_at === "string"
          ? result.data.expires_at
          : undefined,
    },
  };
}

export async function acceptCollaborationWorkspaceInvite(
  supabase: AnyClient,
  token: string
): Promise<
  CollaborationMembershipResult<{ workspace_id: string; role: string }>
> {
  const trimmed = (token ?? "").trim();
  if (!trimmed) {
    return { ok: false, message: "Invite token is required" };
  }

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.acceptInvite,
    { p_token: trimmed }
  );
  if (!result.ok) return result;

  const workspaceId = asString(result.data.workspace_id);
  const role = asString(result.data.role);
  if (!workspaceId || !role) {
    return { ok: false, message: "Accept invite payload is malformed." };
  }
  return { ok: true, data: { workspace_id: workspaceId, role } };
}

export async function declineCollaborationWorkspaceInvite(
  supabase: AnyClient,
  token: string
): Promise<
  CollaborationMembershipResult<{ invite_id: string; status: string }>
> {
  const trimmed = (token ?? "").trim();
  if (!trimmed) {
    return { ok: false, message: "Invite token is required" };
  }

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.declineInvite,
    { p_token: trimmed }
  );
  if (!result.ok) return result;

  const inviteId = asString(result.data.invite_id);
  const status = asString(result.data.status) ?? "declined";
  if (!inviteId) {
    return { ok: false, message: "Decline invite payload is malformed." };
  }
  return { ok: true, data: { invite_id: inviteId, status } };
}

export async function revokeCollaborationWorkspaceInvite(
  supabase: AnyClient,
  inviteId: string
): Promise<
  CollaborationMembershipResult<{ invite_id: string; status: string }>
> {
  const id = requireUuid(inviteId, "invite_id");
  if (!id.ok) return id;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.revokeInvite,
    { p_invite_id: id.data }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      invite_id: asString(result.data.invite_id) ?? id.data,
      status: asString(result.data.status) ?? "revoked",
    },
  };
}

export async function suspendCollaborationWorkspaceMember(
  supabase: AnyClient,
  workspaceId: string,
  userId: string
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    user_id: string;
    status: string;
  }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;
  const user = requireUuid(userId, "user_id");
  if (!user.ok) return user;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.suspendMember,
    { p_workspace_id: workspace.data, p_user_id: user.data }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      user_id: user.data,
      status: asString(result.data.status) ?? "suspended",
    },
  };
}

export async function removeCollaborationWorkspaceMember(
  supabase: AnyClient,
  workspaceId: string,
  userId: string
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    user_id: string;
    status: string;
  }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;
  const user = requireUuid(userId, "user_id");
  if (!user.ok) return user;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.removeMember,
    { p_workspace_id: workspace.data, p_user_id: user.data }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      user_id: user.data,
      status: asString(result.data.status) ?? "removed",
    },
  };
}

export async function updateCollaborationWorkspaceMemberRole(
  supabase: AnyClient,
  workspaceId: string,
  userId: string,
  role: CollaborationWorkspaceInviteRole | string
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    user_id: string;
    role: string;
  }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;
  const user = requireUuid(userId, "user_id");
  if (!user.ok) return user;

  if (
    !(COLLABORATION_WORKSPACE_INVITE_ROLES as readonly string[]).includes(role)
  ) {
    return { ok: false, message: "Invalid role" };
  }

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.updateMemberRole,
    {
      p_workspace_id: workspace.data,
      p_user_id: user.data,
      p_role: role,
    }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      user_id: user.data,
      role: asString(result.data.role) ?? role,
    },
  };
}

export async function transferCollaborationWorkspaceOwnership(
  supabase: AnyClient,
  workspaceId: string,
  newOwnerUserId: string
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    owner_user_id: string;
  }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;
  const owner = requireUuid(newOwnerUserId, "new_owner_user_id");
  if (!owner.ok) return owner;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.transferOwnership,
    {
      p_workspace_id: workspace.data,
      p_new_owner_user_id: owner.data,
    }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      owner_user_id: asString(result.data.owner_user_id) ?? owner.data,
    },
  };
}

export async function leaveCollaborationWorkspace(
  supabase: AnyClient,
  workspaceId: string
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    user_id?: string;
    status: string;
  }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.leaveWorkspace,
    { p_workspace_id: workspace.data }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      user_id: asString(result.data.user_id) ?? undefined,
      status: asString(result.data.status) ?? "left",
    },
  };
}

export async function archiveCollaborationWorkspace(
  supabase: AnyClient,
  workspaceId: string
): Promise<
  CollaborationMembershipResult<{ workspace_id: string; status: string }>
> {
  const workspace = requireUuid(workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.archive,
    { p_workspace_id: workspace.data }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      status: asString(result.data.status) ?? "archived",
    },
  };
}

export type UpdateCollaborationWorkspaceSettingsInput = {
  workspaceId: string;
  displayName: string;
  description?: string | null;
  kind: CollaborationWorkspaceKind | string;
  allowMemberInvites?: boolean | null;
  publicMemberDirectory?: boolean | null;
};

export async function updateCollaborationWorkspaceSettings(
  supabase: AnyClient,
  input: UpdateCollaborationWorkspaceSettingsInput
): Promise<
  CollaborationMembershipResult<{
    workspace_id: string;
    display_name: string;
    description: string | null;
    kind: string;
    allow_member_invites: boolean;
    public_member_directory: boolean;
  }>
> {
  const workspace = requireUuid(input.workspaceId, "workspace_id");
  if (!workspace.ok) return workspace;

  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 1 || displayName.length > 120) {
    return { ok: false, message: "Invalid workspace display_name" };
  }

  if (
    !(COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(input.kind)
  ) {
    return { ok: false, message: "Invalid workspace kind" };
  }

  const description =
    input.description == null ? null : String(input.description);
  if (description != null && description.length > 4000) {
    return { ok: false, message: "Description too long" };
  }

  const result = await callRpc(
    supabase,
    COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.updateSettings,
    {
      p_workspace_id: workspace.data,
      p_display_name: displayName,
      p_description: description,
      p_kind: input.kind,
      p_allow_member_invites:
        typeof input.allowMemberInvites === "boolean"
          ? input.allowMemberInvites
          : null,
      p_public_member_directory:
        typeof input.publicMemberDirectory === "boolean"
          ? input.publicMemberDirectory
          : null,
    }
  );
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      workspace_id: workspace.data,
      display_name: asString(result.data.display_name) ?? displayName,
      description: asString(result.data.description),
      kind: asString(result.data.kind) ?? String(input.kind),
      allow_member_invites: Boolean(result.data.allow_member_invites),
      public_member_directory: Boolean(result.data.public_member_directory),
    },
  };
}
