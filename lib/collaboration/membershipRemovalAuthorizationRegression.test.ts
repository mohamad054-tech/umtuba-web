import { describe, expect, it } from "vitest";
import {
  authorizeAfterMembershipRemoval,
  authorizeMembershipRemoval,
  repeatedRemovalDeterministic,
} from "./membershipRemovalAuthorizationRegression";

describe("collaboration workspace membership removal authorization regression", () => {
  it("allows OWNER/ADMIN to remove MEMBER; denies MEMBER/NON_MEMBER/cross-workspace/unknown", () => {
    expect(
      authorizeMembershipRemoval({
        actorRole: "OWNER",
        targetRole: "MEMBER",
        sameWorkspace: true,
        targetMembershipKnown: true,
      }).allowed,
    ).toBe(true);
    expect(
      authorizeMembershipRemoval({
        actorRole: "ADMIN",
        targetRole: "MEMBER",
        sameWorkspace: true,
        targetMembershipKnown: true,
      }).allowed,
    ).toBe(true);
    expect(
      authorizeMembershipRemoval({
        actorRole: "MEMBER",
        targetRole: "MEMBER",
        sameWorkspace: true,
        targetMembershipKnown: true,
      }).reason,
    ).toBe("UNAUTHORIZED_REMOVAL");
    expect(
      authorizeMembershipRemoval({
        actorRole: "NON_MEMBER",
        targetRole: "MEMBER",
        sameWorkspace: true,
        targetMembershipKnown: true,
      }).reason,
    ).toBe("NON_MEMBER_DENIED");
    expect(
      authorizeMembershipRemoval({
        actorRole: "OWNER",
        targetRole: "MEMBER",
        sameWorkspace: false,
        targetMembershipKnown: true,
      }).reason,
    ).toBe("CROSS_WORKSPACE_DENIED");
    expect(
      authorizeMembershipRemoval({
        actorRole: "OWNER",
        targetRole: "MEMBER",
        sameWorkspace: true,
        targetMembershipKnown: false,
      }).reason,
    ).toBe("UNKNOWN_MEMBERSHIP");
  });

  it("denies removed member workspace/resource/link/unlink/stale/role-protected access", () => {
    const surfaces = [
      "workspace",
      "resource",
      "link",
      "unlink",
      "stale_direct_action",
      "stale_route_session",
      "role_protected_action",
    ] as const;
    for (const surface of surfaces) {
      const r = authorizeAfterMembershipRemoval({
        membershipState: "removed",
        surface,
        sameWorkspace: true,
      });
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("REMOVED_MEMBER_DENIED");
    }
  });

  it("treats repeated removal as deterministic already-removed", () => {
    expect(repeatedRemovalDeterministic(true).reason).toBe("ALREADY_REMOVED");
    expect(repeatedRemovalDeterministic(false).allowed).toBe(true);
  });
});
