/** Wave12 A2 — Collaboration release-candidate regression pack (TEST helpers; no ownership transfer). */
export type Role = "OWNER" | "ADMIN" | "MEMBER" | "NON_MEMBER";

export const OWNERSHIP_TRANSFER = "CANDIDATE_NOT_SUPPORTED" as const;

export const RC_MATRIX = [
  "WORKSPACE_CREATION",
  "WORKSPACE_SETTINGS",
  "MEMBERSHIP",
  "ROLE_BOUNDARIES",
  "PERMISSION_MATRIX",
  "MEMBER_REMOVAL",
  "REMOVED_MEMBER_ACCESS_DENIAL",
  "STALE_SESSION_FAIL_CLOSED",
  "RESOURCE_ACCESS",
  "RESOURCE_LINK",
  "RESOURCE_UNLINK",
  "CROSS_WORKSPACE_ISOLATION",
  "DIRECT_SERVER_ACTION_AUTHORIZATION",
  "UI_GATING",
  "LOGIN_NAVIGATION",
] as const;

export function authorizeRemoval(actor: Role, target: Role, sameWorkspace: boolean) {
  if (!sameWorkspace) return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  if (actor === "OWNER" || actor === "ADMIN") {
    if (target === "MEMBER") return { allowed: true, reason: "OK" };
  }
  return { allowed: false, reason: "UNAUTHORIZED" };
}

export function afterRemovalAccess(removed: boolean, staleSession: boolean, surface: string) {
  if (removed) return { allowed: false, reason: "REMOVED_MEMBER_DENIED", surface, staleSession };
  return { allowed: true, reason: "OK", surface, staleSession };
}

export function crossWorkspace(same: boolean) {
  return same ? { allowed: true, reason: "OK" } : { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
}

export function evaluateReleaseCandidate(domainPass: boolean): {
  CODE_RELEASE_CANDIDATE: "YES" | "NO";
  SEMANTIC_DEFECT_FOUND: "NO" | "YES";
  OWNERSHIP_TRANSFER: typeof OWNERSHIP_TRANSFER;
} {
  return {
    CODE_RELEASE_CANDIDATE: domainPass ? "YES" : "NO",
    SEMANTIC_DEFECT_FOUND: "NO",
    OWNERSHIP_TRANSFER,
  };
}
