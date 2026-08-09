/** Wave7 A2 — workspace ownership transfer safety (existing roles only). */
export type WorkspaceRole = "owner" | "admin" | "member";

export const WAVE7_A2_AUDIT = {
  OWNERSHIP_TRANSFER_SUPPORTED: "NO" as const,
  MISSING_CONTRACT: [
    "transferOwnership(actor, workspaceId, targetMemberId) authorization boundary",
    "current-owner-only authorization",
    "target must be active member of same workspace",
    "non-owner denial",
    "self/no-op transfer behavior",
    "cross-workspace denial",
    "last-owner invariant / successor required",
    "role state after transfer",
    "permission propagation after transfer",
    "duplicate/repeated request idempotency",
    "stale UI/action rejection",
    "direct server-action enforcement",
  ],
};

export function canTransferOwnership(input: {
  actorRole: WorkspaceRole;
  actorWorkspaceId: string;
  targetWorkspaceId: string;
  targetIsMember: boolean;
  targetUserId: string;
  actorUserId: string;
  ownerCount: number;
}): { allowed: boolean; reason: string } {
  if (input.actorWorkspaceId !== input.targetWorkspaceId) {
    return { allowed: false, reason: "CROSS_WORKSPACE_DENIED" };
  }
  if (input.actorRole !== "owner") {
    return { allowed: false, reason: "NON_OWNER_DENIED" };
  }
  if (input.targetUserId === input.actorUserId) {
    return { allowed: false, reason: "SELF_NOOP_DENIED" };
  }
  if (!input.targetIsMember) {
    return { allowed: false, reason: "TARGET_NOT_MEMBER" };
  }
  if (input.ownerCount < 1) {
    return { allowed: false, reason: "LAST_OWNER_INVARIANT" };
  }
  if (WAVE7_A2_AUDIT.OWNERSHIP_TRANSFER_SUPPORTED === "NO") {
    return { allowed: false, reason: "TRANSFER_NOT_SUPPORTED" };
  }
  return { allowed: true, reason: "OK" };
}
