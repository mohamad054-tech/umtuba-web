import { describe, expect, it } from "vitest";
import { STALE_SURFACES, authorizeAfterRemoval } from "./removedMemberSessionStaleAccessE2e";

describe("collaboration removed member session and stale access e2e", () => {
  it("denies all surfaces for removed member even with stale browser session", () => {
    for (const surface of STALE_SURFACES) {
      const r = authorizeAfterRemoval({
        membershipState: "removed",
        staleBrowserSession: true,
        surface,
        sameWorkspace: true,
      });
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("REMOVED_MEMBER_DENIED");
    }
  });

  it("denies cross-workspace attempts", () => {
    expect(
      authorizeAfterRemoval({
        membershipState: "active",
        staleBrowserSession: false,
        surface: "workspace_route",
        sameWorkspace: false,
      }).reason,
    ).toBe("CROSS_WORKSPACE_DENIED");
  });

  it("allows active member on same workspace", () => {
    expect(
      authorizeAfterRemoval({
        membershipState: "active",
        staleBrowserSession: false,
        surface: "link_resource",
        sameWorkspace: true,
      }).allowed,
    ).toBe(true);
  });
});
