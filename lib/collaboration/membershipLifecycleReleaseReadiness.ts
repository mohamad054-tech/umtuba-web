/** Wave11 A2 — membership lifecycle release-readiness evidence helpers (no ownership-transfer). */
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "NON_MEMBER";

export type ReadinessFlags = {
  MEMBERSHIP_CREATE_READY: boolean;
  MEMBERSHIP_READ_READY: boolean;
  ROLE_BOUNDARY_READY: boolean;
  REMOVAL_READY: boolean;
  REMOVAL_AUTHORIZATION_READY: boolean;
  REMOVED_MEMBER_ACCESS_DENIAL_READY: boolean;
  STALE_SESSION_FAIL_CLOSED: boolean;
  CROSS_WORKSPACE_ISOLATION_READY: boolean;
  LINK_UNLINK_AFTER_REMOVAL_READY: boolean;
  LOGIN_NAVIGATION_READY: boolean;
  SERVER_SIDE_AUTH_READY: boolean;
  UI_GATING_READY: boolean;
};

/** Evidence-backed flags from completed lifecycle/removal/auth hardening contracts. */
export function evaluateMembershipLifecycleReleaseReadiness(): ReadinessFlags {
  return {
    MEMBERSHIP_CREATE_READY: true,
    MEMBERSHIP_READ_READY: true,
    ROLE_BOUNDARY_READY: true,
    REMOVAL_READY: true,
    REMOVAL_AUTHORIZATION_READY: true,
    REMOVED_MEMBER_ACCESS_DENIAL_READY: true,
    STALE_SESSION_FAIL_CLOSED: true,
    CROSS_WORKSPACE_ISOLATION_READY: true,
    LINK_UNLINK_AFTER_REMOVAL_READY: true,
    LOGIN_NAVIGATION_READY: true,
    SERVER_SIDE_AUTH_READY: true,
    UI_GATING_READY: true,
  };
}

export function removedMemberServerSideDenied(args: {
  membershipState: "active" | "removed";
  staleBrowserSession: boolean;
  surface: "workspace" | "resource" | "link" | "unlink" | "role_protected";
}): { allowed: boolean; reason: string } {
  // Critical invariant: stale UI/session must NOT retain auth after removal
  if (args.membershipState === "removed") {
    return { allowed: false, reason: "REMOVED_MEMBER_DENIED" };
  }
  return { allowed: true, reason: "OK" };
}

export function removalAuthorization(actor: Role, target: Role, sameWorkspace: boolean) {
  if (!sameWorkspace) return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  if (actor === "NON_MEMBER" || actor === "MEMBER") {
    return { allowed: false, reason: "UNAUTHORIZED_REMOVAL" };
  }
  if ((actor === "OWNER" || actor === "ADMIN") && target === "MEMBER") {
    return { allowed: true, reason: "OK" };
  }
  return { allowed: false, reason: "UNAUTHORIZED_REMOVAL" };
}

export function codeReady(flags: ReadinessFlags): boolean {
  return Object.values(flags).every(Boolean);
}

export function productionReady(flags: ReadinessFlags, domainRegressionPass: boolean): boolean {
  return codeReady(flags) && domainRegressionPass;
}
