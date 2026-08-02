/**
 * Collaboration Workspace read helpers (RLS SELECT only).
 * Mutations stay on workspaceMembershipRuntime RPCs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLABORATION_WORKSPACE_INVITE_STATUSES,
  COLLABORATION_WORKSPACE_KINDS,
  COLLABORATION_WORKSPACE_MEMBER_STATUSES,
  COLLABORATION_WORKSPACE_ROLES,
  COLLABORATION_WORKSPACE_STATUSES,
  type CollaborationWorkspaceInviteStatus,
  type CollaborationWorkspaceKind,
  type CollaborationWorkspaceMemberStatus,
  type CollaborationWorkspaceRole,
  type CollaborationWorkspaceStatus,
} from "./workspaceSpineFoundation";
import {
  isCollaborationUuid,
  sanitizeCollaborationMembershipError,
} from "./workspaceMembershipRuntime";

type AnyClient = SupabaseClient;

export type CollaborationQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type CollaborationWorkspaceSummary = {
  id: string;
  slug: string;
  status: CollaborationWorkspaceStatus;
  ownerUserId: string;
  kind: CollaborationWorkspaceKind;
  displayName: string;
  description: string | null;
  myRole: CollaborationWorkspaceRole;
  myStatus: CollaborationWorkspaceMemberStatus;
};

export type CollaborationWorkspaceDetail = CollaborationWorkspaceSummary & {
  legalName: string | null;
  createdAt: string;
};

export type CollaborationWorkspaceMemberRow = {
  userId: string;
  role: CollaborationWorkspaceRole;
  status: CollaborationWorkspaceMemberStatus;
  joinedAt: string | null;
};

export type CollaborationWorkspaceInviteRow = {
  id: string;
  invitedUserId: string | null;
  invitedEmail: string | null;
  role: string;
  status: CollaborationWorkspaceInviteStatus;
  expiresAt: string;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRole(value: unknown): CollaborationWorkspaceRole | null {
  const s = asString(value);
  if (!s) return null;
  return (COLLABORATION_WORKSPACE_ROLES as readonly string[]).includes(s)
    ? (s as CollaborationWorkspaceRole)
    : null;
}

function asMemberStatus(
  value: unknown
): CollaborationWorkspaceMemberStatus | null {
  const s = asString(value);
  if (!s) return null;
  return (COLLABORATION_WORKSPACE_MEMBER_STATUSES as readonly string[]).includes(
    s
  )
    ? (s as CollaborationWorkspaceMemberStatus)
    : null;
}

function asWorkspaceStatus(
  value: unknown
): CollaborationWorkspaceStatus | null {
  const s = asString(value);
  if (!s) return null;
  return (COLLABORATION_WORKSPACE_STATUSES as readonly string[]).includes(s)
    ? (s as CollaborationWorkspaceStatus)
    : null;
}

function asKind(value: unknown): CollaborationWorkspaceKind | null {
  const s = asString(value);
  if (!s) return null;
  return (COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(s)
    ? (s as CollaborationWorkspaceKind)
    : null;
}

function asInviteStatus(
  value: unknown
): CollaborationWorkspaceInviteStatus | null {
  const s = asString(value);
  if (!s) return null;
  return (COLLABORATION_WORKSPACE_INVITE_STATUSES as readonly string[]).includes(
    s
  )
    ? (s as CollaborationWorkspaceInviteStatus)
    : null;
}

export async function listMyCollaborationWorkspaces(
  supabase: AnyClient,
  userId: string
): Promise<CollaborationQueryResult<CollaborationWorkspaceSummary[]>> {
  if (!isCollaborationUuid(userId)) {
    return { ok: false, message: "user_id must be a valid UUID" };
  }

  const { data: memberships, error: memErr } = await supabase
    .from("collaboration_workspace_members")
    .select("workspace_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (memErr) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(memErr.message),
    };
  }

  const rows = memberships ?? [];
  if (rows.length === 0) return { ok: true, data: [] };

  const roleMap = new Map<string, CollaborationWorkspaceRole>();
  const statusMap = new Map<string, CollaborationWorkspaceMemberStatus>();
  for (const row of rows) {
    const rec = asRecord(row);
    if (!rec) continue;
    const workspaceId = asString(rec.workspace_id);
    const role = asRole(rec.role);
    const status = asMemberStatus(rec.status);
    if (!workspaceId || !role || !status) continue;
    roleMap.set(workspaceId, role);
    statusMap.set(workspaceId, status);
  }

  const ids = [...roleMap.keys()];
  if (ids.length === 0) return { ok: true, data: [] };

  const { data: workspaces, error: wsErr } = await supabase
    .from("collaboration_workspaces")
    .select("id, slug, status, owner_user_id, created_at")
    .in("id", ids)
    .order("created_at", { ascending: false });

  if (wsErr) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(wsErr.message),
    };
  }

  const { data: profiles, error: profileErr } = await supabase
    .from("collaboration_workspace_profiles")
    .select("workspace_id, kind, display_name, description, legal_name")
    .in("workspace_id", ids);

  if (profileErr) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(profileErr.message),
    };
  }

  const profileMap = new Map<string, Record<string, unknown>>();
  for (const profile of profiles ?? []) {
    const rec = asRecord(profile);
    const workspaceId = asString(rec?.workspace_id);
    if (workspaceId && rec) profileMap.set(workspaceId, rec);
  }

  const list: CollaborationWorkspaceSummary[] = [];
  for (const workspace of workspaces ?? []) {
    const rec = asRecord(workspace);
    if (!rec) continue;
    const id = asString(rec.id);
    if (!id) continue;
    const profile = profileMap.get(id);
    const kind = asKind(profile?.kind) ?? "team";
    const status = asWorkspaceStatus(rec.status);
    const myRole = roleMap.get(id);
    const myStatus = statusMap.get(id);
    const slug = asString(rec.slug);
    const ownerUserId = asString(rec.owner_user_id);
    const displayName =
      asString(profile?.display_name) ?? slug ?? "Workspace";
    if (!status || !myRole || !myStatus || !slug || !ownerUserId) continue;
    list.push({
      id,
      slug,
      status,
      ownerUserId,
      kind,
      displayName,
      description: asString(profile?.description),
      myRole,
      myStatus,
    });
  }

  return { ok: true, data: list };
}

export async function getCollaborationWorkspaceDetail(
  supabase: AnyClient,
  workspaceId: string,
  userId: string
): Promise<CollaborationQueryResult<CollaborationWorkspaceDetail>> {
  if (!isCollaborationUuid(workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID" };
  }
  if (!isCollaborationUuid(userId)) {
    return { ok: false, message: "user_id must be a valid UUID" };
  }

  const list = await listMyCollaborationWorkspaces(supabase, userId);
  if (!list.ok) return list;

  const summary = list.data.find((item) => item.id === workspaceId);
  if (!summary) {
    return { ok: false, message: "Workspace is not available for this membership action." };
  }

  const { data: workspace, error } = await supabase
    .from("collaboration_workspaces")
    .select("id, created_at")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(error.message),
    };
  }

  const { data: profile } = await supabase
    .from("collaboration_workspace_profiles")
    .select("legal_name")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return {
    ok: true,
    data: {
      ...summary,
      legalName: asString(asRecord(profile)?.legal_name),
      createdAt: asString(asRecord(workspace)?.created_at) ?? "",
    },
  };
}

export async function listCollaborationWorkspaceMembers(
  supabase: AnyClient,
  workspaceId: string
): Promise<CollaborationQueryResult<CollaborationWorkspaceMemberRow[]>> {
  if (!isCollaborationUuid(workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID" };
  }

  const { data, error } = await supabase
    .from("collaboration_workspace_members")
    .select("user_id, role, status, joined_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["active", "suspended"])
    .order("joined_at", { ascending: true });

  if (error) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(error.message),
    };
  }

  const members: CollaborationWorkspaceMemberRow[] = [];
  for (const row of data ?? []) {
    const rec = asRecord(row);
    if (!rec) continue;
    const userId = asString(rec.user_id);
    const role = asRole(rec.role);
    const status = asMemberStatus(rec.status);
    if (!userId || !role || !status) continue;
    members.push({
      userId,
      role,
      status,
      joinedAt: asString(rec.joined_at),
    });
  }

  return { ok: true, data: members };
}

export async function listCollaborationWorkspaceInvites(
  supabase: AnyClient,
  workspaceId: string
): Promise<CollaborationQueryResult<CollaborationWorkspaceInviteRow[]>> {
  if (!isCollaborationUuid(workspaceId)) {
    return { ok: false, message: "workspace_id must be a valid UUID" };
  }

  const { data, error } = await supabase
    .from("collaboration_workspace_invites")
    .select(
      "id, invited_user_id, invited_email, role, status, expires_at, created_at"
    )
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      message: sanitizeCollaborationMembershipError(error.message),
    };
  }

  const invites: CollaborationWorkspaceInviteRow[] = [];
  for (const row of data ?? []) {
    const rec = asRecord(row);
    if (!rec) continue;
    const id = asString(rec.id);
    const status = asInviteStatus(rec.status);
    const role = asString(rec.role);
    const expiresAt = asString(rec.expires_at);
    const createdAt = asString(rec.created_at);
    if (!id || !status || !role || !expiresAt || !createdAt) continue;
    invites.push({
      id,
      invitedUserId: asString(rec.invited_user_id),
      invitedEmail: asString(rec.invited_email),
      role,
      status,
      expiresAt,
      createdAt,
    });
  }

  return { ok: true, data: invites };
}
