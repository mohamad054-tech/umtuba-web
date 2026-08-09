import { describe, expect, it } from "vitest";
import {
  codeReady,
  evaluateMembershipLifecycleReleaseReadiness,
  productionReady,
  removalAuthorization,
  removedMemberServerSideDenied,
} from "./membershipLifecycleReleaseReadiness";

describe("collaboration workspace membership lifecycle release readiness", () => {
  it("marks lifecycle surfaces ready from completed hardening evidence", () => {
    const flags = evaluateMembershipLifecycleReleaseReadiness();
    expect(codeReady(flags)).toBe(true);
    expect(flags.STALE_SESSION_FAIL_CLOSED).toBe(true);
    expect(flags.REMOVED_MEMBER_ACCESS_DENIAL_READY).toBe(true);
    expect(productionReady(flags, true)).toBe(true);
  });

  it("OWNER/ADMIN may remove MEMBER; MEMBER/NON_MEMBER denied; cross-workspace denied", () => {
    expect(removalAuthorization("OWNER", "MEMBER", true).allowed).toBe(true);
    expect(removalAuthorization("ADMIN", "MEMBER", true).allowed).toBe(true);
    expect(removalAuthorization("MEMBER", "MEMBER", true).allowed).toBe(false);
    expect(removalAuthorization("NON_MEMBER", "MEMBER", true).allowed).toBe(false);
    expect(removalAuthorization("OWNER", "MEMBER", false).reason).toBe("CROSS_WORKSPACE_DENIED");
  });

  it("removed membership fails server-side even with stale browser session", () => {
    for (const surface of ["workspace", "resource", "link", "unlink", "role_protected"] as const) {
      const r = removedMemberServerSideDenied({
        membershipState: "removed",
        staleBrowserSession: true,
        surface,
      });
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("REMOVED_MEMBER_DENIED");
    }
  });
});
