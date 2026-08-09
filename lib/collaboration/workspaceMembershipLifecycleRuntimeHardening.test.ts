import { describe, expect, it } from "vitest";
import {
  MEMBERSHIP_STATES_SUPPORTED,
  canRemoveMember,
  removedMemberAccessAllowed,
} from "./workspaceMembershipLifecycleRuntimeHardening";

describe("collaboration workspace membership lifecycle runtime hardening", () => {
  it("exposes supported membership states without inventing ownership transfer", () => {
    expect(MEMBERSHIP_STATES_SUPPORTED).toContain("active");
    expect(MEMBERSHIP_STATES_SUPPORTED).toContain("removed");
  });

  it("denies cross-workspace removal", () => {
    expect(
      canRemoveMember({
        actorRole: "owner",
        actorUserId: "u1",
        targetUserId: "u2",
        targetRole: "member",
        sameWorkspace: false,
        ownerCount: 1,
      }).reason,
    ).toBe("CROSS_WORKSPACE_DENIED");
  });

  it("protects last owner", () => {
    expect(
      canRemoveMember({
        actorRole: "owner",
        actorUserId: "u1",
        targetUserId: "u2",
        targetRole: "owner",
        sameWorkspace: true,
        ownerCount: 1,
      }).reason,
    ).toBe("LAST_OWNER_PROTECTION");
  });

  it("denies removed member access", () => {
    expect(removedMemberAccessAllowed("removed")).toBe(false);
    expect(removedMemberAccessAllowed("active")).toBe(true);
  });

  it("denies member removing others", () => {
    expect(
      canRemoveMember({
        actorRole: "member",
        actorUserId: "u1",
        targetUserId: "u2",
        targetRole: "member",
        sameWorkspace: true,
        ownerCount: 1,
      }).reason,
    ).toBe("MEMBER_CANNOT_REMOVE_OTHERS");
  });
});
