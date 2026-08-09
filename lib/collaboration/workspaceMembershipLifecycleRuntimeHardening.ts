/** Wave8 A2 — workspace membership lifecycle runtime hardening (no ownership transfer). */
export type MembershipRole = "owner" | "admin" | "member";
export type MembershipState = "active" | "inactive" | "removed";

export const MEMBERSHIP_STATES_SUPPORTED: MembershipState[] = ["active", "inactive", "removed"];

export function canRemoveMember(input: {
  actorRole: MembershipRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: MembershipRole;
  sameWorkspace: boolean;
  ownerCount: number;
}): { allowed: boolean; reason: string } {
  if (!input.sameWorkspace) return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  if (input.actorRole === "member" && input.actorUserId !== input.targetUserId) {
    return { allowed: false, reason: "MEMBER_CANNOT_REMOVE_OTHERS" };
  }
  if (input.actorRole === "member" && input.actorUserId === input.targetUserId) {
    return { allowed: false, reason: "SELF_REMOVAL_UNSUPPORTED_OR_DENIED" };
  }
  if (input.actorRole !== "owner" && input.actorRole !== "admin") {
    return { allowed: false, reason: "UNAUTHORIZED" };
  }
  if (input.targetRole === "owner" && input.ownerCount <= 1) {
    return { allowed: false, reason: "LAST_OWNER_PROTECTION" };
  }
  if (input.actorRole === "admin" && input.targetRole === "owner") {
    return { allowed: false, reason: "ADMIN_CANNOT_REMOVE_OWNER" };
  }
  return { allowed: true, reason: "OK" };
}

export function removedMemberAccessAllowed(state: MembershipState): boolean {
  return state === "active";
}
