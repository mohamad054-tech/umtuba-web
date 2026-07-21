/**
 * UM Learning OS — Spaces & Membership Foundation V1 constants.
 * DB-authoritative via learning_* RPCs; this module mirrors SQL contracts.
 */

export const LEARNING_SPACE_MODES = [
  "university",
  "school",
  "bootcamp",
  "company_training",
  "creator_academy",
  "personal_learning",
  "general_academy",
] as const;
export type LearningSpaceMode = (typeof LEARNING_SPACE_MODES)[number];

export const LEARNING_SPACE_STATUSES = [
  "draft",
  "active",
  "suspended",
  "archived",
] as const;
export type LearningSpaceStatus = (typeof LEARNING_SPACE_STATUSES)[number];

export const LEARNING_SPACE_VISIBILITIES = [
  "private",
  "unlisted",
  "public",
] as const;
export type LearningSpaceVisibility =
  (typeof LEARNING_SPACE_VISIBILITIES)[number];

export const LEARNING_SPACE_ROLES = [
  "owner",
  "admin",
  "instructor",
  "teaching_assistant",
  "content_editor",
  "reviewer",
  "viewer",
] as const;
export type LearningSpaceRole = (typeof LEARNING_SPACE_ROLES)[number];

/** Invite roles exclude owner (transfer RPC only). */
export const LEARNING_SPACE_INVITE_ROLES = [
  "admin",
  "instructor",
  "teaching_assistant",
  "content_editor",
  "reviewer",
  "viewer",
] as const;
export type LearningSpaceInviteRole =
  (typeof LEARNING_SPACE_INVITE_ROLES)[number];

export const LEARNING_SPACE_ROLE_RANKS: Record<LearningSpaceRole, number> = {
  owner: 100,
  admin: 80,
  instructor: 60,
  teaching_assistant: 50,
  content_editor: 40,
  reviewer: 30,
  viewer: 20,
};

export const LEARNING_SPACE_MEMBER_STATUSES = [
  "invited",
  "active",
  "suspended",
  "removed",
] as const;
export type LearningSpaceMemberStatus =
  (typeof LEARNING_SPACE_MEMBER_STATUSES)[number];

export const LEARNING_SPACE_INVITE_STATUSES = [
  "pending",
  "accepted",
  "revoked",
  "expired",
] as const;
export type LearningSpaceInviteStatus =
  (typeof LEARNING_SPACE_INVITE_STATUSES)[number];

export const LEARNING_SPACE_DEFAULT_MEMBER_ROLES = [
  "viewer",
  "reviewer",
  "content_editor",
] as const;

export const LEARNING_SPACE_RPCS = {
  create: "create_learning_space",
  invite: "invite_learning_space_member",
  acceptInvite: "accept_learning_space_invite",
  updateMemberRole: "update_learning_space_member_role",
  suspendMember: "suspend_learning_space_member",
  removeMember: "remove_learning_space_member",
  transferOwnership: "transfer_learning_space_ownership",
  publish: "publish_learning_space",
  archive: "archive_learning_space",
  moderate: "moderate_learning_space",
} as const;

export const LEARNING_SPACE_HELPERS = {
  roleRank: "learning_space_role_rank",
  roleAtLeast: "learning_space_role_at_least",
  isMember: "is_learning_space_member",
  memberRole: "learning_space_member_role",
  canManage: "can_manage_learning_space",
  auditWrite: "learning_audit_write",
} as const;

/** Mirrors SQL learning_space_role_rank — unknown → null (fail-closed). */
export function learningSpaceRoleRank(role: string): number | null {
  if ((LEARNING_SPACE_ROLES as readonly string[]).includes(role)) {
    return LEARNING_SPACE_ROLE_RANKS[role as LearningSpaceRole];
  }
  return null;
}

/** Mirrors SQL learning_space_role_at_least — unknown roles → false. */
export function learningSpaceRoleAtLeast(
  role: string,
  minimum: string
): boolean {
  const roleRank = learningSpaceRoleRank(role);
  const minRank = learningSpaceRoleRank(minimum);
  if (roleRank === null || minRank === null) return false;
  return roleRank >= minRank;
}
