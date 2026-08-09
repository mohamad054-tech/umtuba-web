/** Wave10 A2 — membership removal authorization regression contracts (TEST helpers; existing auth only). */
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "NON_MEMBER";

export type RemovalAttempt = {
  actorRole: WorkspaceRole;
  targetRole: WorkspaceRole;
  sameWorkspace: boolean;
  targetMembershipKnown: boolean;
};

export type RemovalResult = {
  allowed: boolean;
  reason:
    | "OK"
    | "UNAUTHORIZED_REMOVAL"
    | "CROSS_WORKSPACE_DENIED"
    | "UNKNOWN_MEMBERSHIP"
    | "ALREADY_REMOVED"
    | "NON_MEMBER_DENIED";
};

export function authorizeMembershipRemoval(attempt: RemovalAttempt): RemovalResult {
  if (!attempt.sameWorkspace) {
    return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  }
  if (!attempt.targetMembershipKnown) {
    return { allowed: false, reason: "UNKNOWN_MEMBERSHIP" };
  }
  if (attempt.actorRole === "NON_MEMBER") {
    return { allowed: false, reason: "NON_MEMBER_DENIED" };
  }
  if (attempt.actorRole === "MEMBER") {
    return { allowed: false, reason: "UNAUTHORIZED_REMOVAL" };
  }
  if (attempt.targetRole === "NON_MEMBER") {
    return { allowed: false, reason: "ALREADY_REMOVED" };
  }
  if (attempt.actorRole === "OWNER" && attempt.targetRole === "MEMBER") {
    return { allowed: true, reason: "OK" };
  }
  if (attempt.actorRole === "ADMIN" && attempt.targetRole === "MEMBER") {
    return { allowed: true, reason: "OK" };
  }
  return { allowed: false, reason: "UNAUTHORIZED_REMOVAL" };
}

export type PostRemovalAccess = {
  membershipState: "active" | "removed";
  surface:
    | "workspace"
    | "resource"
    | "link"
    | "unlink"
    | "stale_direct_action"
    | "stale_route_session"
    | "role_protected_action";
  sameWorkspace: boolean;
};

export function authorizeAfterMembershipRemoval(access: PostRemovalAccess): {
  allowed: boolean;
  reason: string;
} {
  if (!access.sameWorkspace) return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  if (access.membershipState === "removed") {
    return { allowed: false, reason: "REMOVED_MEMBER_DENIED" };
  }
  return { allowed: true, reason: "OK" };
}

export function repeatedRemovalDeterministic(alreadyRemoved: boolean): RemovalResult {
  if (alreadyRemoved) return { allowed: false, reason: "ALREADY_REMOVED" };
  return { allowed: true, reason: "OK" };
}
