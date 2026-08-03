/**
 * UMTUBA Collaboration Platform — Workspace Spine Foundation V1.
 *
 * TypeScript contracts mirroring
 * `supabase/migrations/20260896_collaboration_workspace_spine_foundation_v1.sql`.
 *
 * Overlay only: does not replace Learning Spaces, Store members, Advertiser
 * accounts, UEOS, or Messaging identity. Resource links are schema-only in V1
 * (no product binding RPCs).
 */

/**
 * Compile-time default for Collaboration Platform UI.
 * Runtime exposure is gated by `isCollaborationPlatformEnabled()`
 * (`COLLABORATION_PLATFORM_ENABLED` env, default false).
 */
export const COLLABORATION_PLATFORM_ENABLED = false;

export const COLLABORATION_WORKSPACE_KINDS = [
  "team",
  "company",
  "school",
  "academy",
] as const;
export type CollaborationWorkspaceKind =
  (typeof COLLABORATION_WORKSPACE_KINDS)[number];

export const COLLABORATION_WORKSPACE_STATUSES = [
  "draft",
  "active",
  "suspended",
  "archived",
] as const;
export type CollaborationWorkspaceStatus =
  (typeof COLLABORATION_WORKSPACE_STATUSES)[number];

export const COLLABORATION_WORKSPACE_ROLES = [
  "owner",
  "admin",
  "manager",
  "billing_manager",
  "member",
  "auditor",
] as const;
export type CollaborationWorkspaceRole =
  (typeof COLLABORATION_WORKSPACE_ROLES)[number];

/** Invite roles exclude owner (ownership transfer RPC only). */
export const COLLABORATION_WORKSPACE_INVITE_ROLES = [
  "admin",
  "manager",
  "billing_manager",
  "member",
  "auditor",
] as const;
export type CollaborationWorkspaceInviteRole =
  (typeof COLLABORATION_WORKSPACE_INVITE_ROLES)[number];

export const COLLABORATION_WORKSPACE_ROLE_RANKS: Record<
  CollaborationWorkspaceRole,
  number
> = {
  owner: 100,
  admin: 80,
  manager: 60,
  billing_manager: 50,
  member: 40,
  auditor: 30,
};

export const COLLABORATION_WORKSPACE_MEMBER_STATUSES = [
  "invited",
  "active",
  "suspended",
  "removed",
  "left",
] as const;
export type CollaborationWorkspaceMemberStatus =
  (typeof COLLABORATION_WORKSPACE_MEMBER_STATUSES)[number];

export const COLLABORATION_WORKSPACE_INVITE_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
] as const;
export type CollaborationWorkspaceInviteStatus =
  (typeof COLLABORATION_WORKSPACE_INVITE_STATUSES)[number];

/** Reserved future product types — V1 has no binding RPCs. */
export const COLLABORATION_RESOURCE_TYPES_RESERVED = [
  "learning_space",
  "store",
  "advertiser_account",
] as const;

export const COLLABORATION_RESOURCE_LINK_RELATIONSHIPS = [
  "linked",
  "manages",
  "owns",
] as const;

export const COLLABORATION_RESOURCE_LINK_STATUSES = [
  "active",
  "revoked",
] as const;

/** Fixed RBAC capability matrix (workspace plane only). */
export const COLLABORATION_WORKSPACE_PERMISSIONS = {
  manage_workspace: ["owner", "admin"],
  manage_members: ["owner", "admin"],
  invite_members: ["owner", "admin", "manager"],
  view_members: ["owner", "admin", "manager", "member", "billing_manager", "auditor"],
  view_audit: ["owner", "admin", "auditor"],
  manage_billing_settings: ["owner", "billing_manager"],
  transfer_ownership: ["owner"],
} as const satisfies Record<string, readonly CollaborationWorkspaceRole[]>;

export type CollaborationWorkspacePermission =
  keyof typeof COLLABORATION_WORKSPACE_PERMISSIONS;

/** Spine foundation RPCs (20260896). */
export const COLLABORATION_WORKSPACE_SPINE_RPCS = {
  create: "create_collaboration_workspace",
  activate: "activate_collaboration_workspace",
  archive: "archive_collaboration_workspace",
  moderate: "moderate_collaboration_workspace",
  invite: "invite_collaboration_workspace_member",
  acceptInvite: "accept_collaboration_workspace_invite",
  declineInvite: "decline_collaboration_workspace_invite",
  updateMemberRole: "update_collaboration_workspace_member_role",
  suspendMember: "suspend_collaboration_workspace_member",
  removeMember: "remove_collaboration_workspace_member",
  transferOwnership: "transfer_collaboration_workspace_ownership",
} as const;

/** Full membership RPC catalog (spine + additive revoke/leave/settings). */
export const COLLABORATION_WORKSPACE_RPCS = {
  ...COLLABORATION_WORKSPACE_SPINE_RPCS,
  revokeInvite: "revoke_collaboration_workspace_invite",
  leaveWorkspace: "leave_collaboration_workspace",
  updateSettings: "update_collaboration_workspace_settings",
} as const;

export const COLLABORATION_WORKSPACE_HELPERS = {
  roleRank: "collaboration_workspace_role_rank",
  roleAtLeast: "collaboration_workspace_role_at_least",
  isMember: "is_collaboration_workspace_member",
  memberRole: "collaboration_workspace_member_role",
  canManage: "can_manage_collaboration_workspace",
  auditWrite: "collaboration_workspace_audit_write",
} as const;

export const COLLABORATION_WORKSPACE_INVITE_EMAIL_RE = /^\S+@\S+\.\S+$/;

export function collaborationWorkspaceRoleRank(
  role: string
): number | null {
  if ((COLLABORATION_WORKSPACE_ROLES as readonly string[]).includes(role)) {
    return COLLABORATION_WORKSPACE_ROLE_RANKS[
      role as CollaborationWorkspaceRole
    ];
  }
  return null;
}

export function collaborationWorkspaceRoleAtLeast(
  role: string,
  minimum: string
): boolean {
  const roleRank = collaborationWorkspaceRoleRank(role);
  const minRank = collaborationWorkspaceRoleRank(minimum);
  if (roleRank === null || minRank === null) return false;
  return roleRank >= minRank;
}

export function collaborationWorkspaceAllows(
  role: string,
  permission: CollaborationWorkspacePermission
): boolean {
  if (!(COLLABORATION_WORKSPACE_ROLES as readonly string[]).includes(role)) {
    return false;
  }
  const allowed = COLLABORATION_WORKSPACE_PERMISSIONS[permission];
  return (allowed as readonly string[]).includes(role);
}

/** Peer-admin protection: actor rank must be strictly greater than target. */
export function collaborationWorkspaceCanMutatePeer(
  actorRole: string,
  targetRole: string
): boolean {
  const actor = collaborationWorkspaceRoleRank(actorRole);
  const target = collaborationWorkspaceRoleRank(targetRole);
  if (actor === null || target === null) return false;
  return actor > target;
}
