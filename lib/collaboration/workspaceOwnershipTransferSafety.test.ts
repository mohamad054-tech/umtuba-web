import { describe, expect, it } from "vitest";
import { WAVE7_A2_AUDIT, canTransferOwnership } from "./workspaceOwnershipTransferSafety";

describe("collaboration workspace ownership transfer safety", () => {
  it("records unsupported transfer without inventing persistence", () => {
    expect(WAVE7_A2_AUDIT.OWNERSHIP_TRANSFER_SUPPORTED).toBe("NO");
    expect(WAVE7_A2_AUDIT.MISSING_CONTRACT.length).toBeGreaterThan(0);
  });

  it("denies non-owner", () => {
    expect(
      canTransferOwnership({
        actorRole: "admin",
        actorWorkspaceId: "ws1",
        targetWorkspaceId: "ws1",
        targetIsMember: true,
        targetUserId: "u2",
        actorUserId: "u1",
        ownerCount: 1,
      }).reason,
    ).toBe("NON_OWNER_DENIED");
  });

  it("denies cross-workspace", () => {
    expect(
      canTransferOwnership({
        actorRole: "owner",
        actorWorkspaceId: "ws1",
        targetWorkspaceId: "ws2",
        targetIsMember: true,
        targetUserId: "u2",
        actorUserId: "u1",
        ownerCount: 1,
      }).reason,
    ).toBe("CROSS_WORKSPACE_DENIED");
  });

  it("denies self/no-op", () => {
    expect(
      canTransferOwnership({
        actorRole: "owner",
        actorWorkspaceId: "ws1",
        targetWorkspaceId: "ws1",
        targetIsMember: true,
        targetUserId: "u1",
        actorUserId: "u1",
        ownerCount: 1,
      }).reason,
    ).toBe("SELF_NOOP_DENIED");
  });

  it("denies non-member target", () => {
    expect(
      canTransferOwnership({
        actorRole: "owner",
        actorWorkspaceId: "ws1",
        targetWorkspaceId: "ws1",
        targetIsMember: false,
        targetUserId: "u2",
        actorUserId: "u1",
        ownerCount: 1,
      }).reason,
    ).toBe("TARGET_NOT_MEMBER");
  });
});
