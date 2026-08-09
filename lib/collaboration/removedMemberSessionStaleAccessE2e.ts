/** Wave9 A2 — removed-member stale session / stale access E2E contracts. */
export type AccessAttempt = {
  membershipState: "active" | "removed";
  staleBrowserSession: boolean;
  surface:
    | "workspace_route"
    | "resource_route"
    | "direct_action"
    | "link_resource"
    | "unlink_resource"
    | "role_protected_action"
    | "settings_action";
  sameWorkspace: boolean;
};

export function authorizeAfterRemoval(attempt: AccessAttempt): {
  allowed: boolean;
  reason: string;
} {
  if (!attempt.sameWorkspace) {
    return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  }
  // Critical invariant: stale UI/session must NOT retain auth after removal
  if (attempt.membershipState === "removed") {
    return { allowed: false, reason: "REMOVED_MEMBER_DENIED" };
  }
  if (attempt.staleBrowserSession && attempt.membershipState !== "active") {
    return { allowed: false, reason: "STALE_SESSION_DENIED" };
  }
  return { allowed: true, reason: "OK" };
}

export const STALE_SURFACES: AccessAttempt["surface"][] = [
  "workspace_route",
  "resource_route",
  "direct_action",
  "link_resource",
  "unlink_resource",
  "role_protected_action",
  "settings_action",
];
