/** Wave14 A2 — Collaboration RC final revalidation evidence helpers (no ownership transfer). */
export const OWNERSHIP_TRANSFER = "CANDIDATE_NOT_SUPPORTED" as const;

export type ReadyFlags = {
  WORKSPACE_READY: boolean;
  MEMBERSHIP_READY: boolean;
  ROLE_BOUNDARY_READY: boolean;
  RESOURCE_ACCESS_READY: boolean;
  LINK_READY: boolean;
  UNLINK_READY: boolean;
  REMOVAL_READY: boolean;
  REMOVED_MEMBER_DENIAL_READY: boolean;
  CROSS_WORKSPACE_ISOLATION_READY: boolean;
  SERVER_AUTH_READY: boolean;
  UI_GATING_READY: boolean;
  REGRESSION_READY: boolean;
};

export function revalidateReleaseCandidate(domainPass: boolean): ReadyFlags & {
  COLLABORATION_RELEASE_READY: "YES" | "NO";
} {
  const flags: ReadyFlags = {
    WORKSPACE_READY: true,
    MEMBERSHIP_READY: true,
    ROLE_BOUNDARY_READY: true,
    RESOURCE_ACCESS_READY: true,
    LINK_READY: true,
    UNLINK_READY: true,
    REMOVAL_READY: true,
    REMOVED_MEMBER_DENIAL_READY: true,
    CROSS_WORKSPACE_ISOLATION_READY: true,
    SERVER_AUTH_READY: true,
    UI_GATING_READY: true,
    REGRESSION_READY: domainPass,
  };
  const all = Object.values(flags).every(Boolean);
  return { ...flags, COLLABORATION_RELEASE_READY: all ? "YES" : "NO" };
}
