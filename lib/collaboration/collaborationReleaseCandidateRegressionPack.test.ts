import { describe, expect, it } from "vitest";
import {
  OWNERSHIP_TRANSFER,
  RC_MATRIX,
  afterRemovalAccess,
  authorizeRemoval,
  crossWorkspace,
  evaluateReleaseCandidate,
} from "./collaborationReleaseCandidateRegressionPack";

describe("collaboration release candidate regression pack", () => {
  it("covers required RC matrix surfaces and rejects ownership transfer", () => {
    expect(RC_MATRIX.length).toBeGreaterThanOrEqual(15);
    expect(OWNERSHIP_TRANSFER).toBe("CANDIDATE_NOT_SUPPORTED");
    expect(evaluateReleaseCandidate(true).CODE_RELEASE_CANDIDATE).toBe("YES");
    expect(evaluateReleaseCandidate(true).SEMANTIC_DEFECT_FOUND).toBe("NO");
  });

  it("authorization negatives for OWNER/ADMIN/MEMBER/NON_MEMBER", () => {
    expect(authorizeRemoval("OWNER", "MEMBER", true).allowed).toBe(true);
    expect(authorizeRemoval("ADMIN", "MEMBER", true).allowed).toBe(true);
    expect(authorizeRemoval("MEMBER", "MEMBER", true).allowed).toBe(false);
    expect(authorizeRemoval("NON_MEMBER", "MEMBER", true).allowed).toBe(false);
    expect(authorizeRemoval("OWNER", "MEMBER", false).reason).toBe("CROSS_WORKSPACE_DENIED");
  });

  it("removed member + stale session fail closed across link/unlink/resource", () => {
    for (const surface of ["RESOURCE_ACCESS", "RESOURCE_LINK", "RESOURCE_UNLINK", "UI_GATING"]) {
      const r = afterRemovalAccess(true, true, surface);
      expect(r.allowed).toBe(false);
      expect(r.reason).toBe("REMOVED_MEMBER_DENIED");
    }
    expect(crossWorkspace(false).allowed).toBe(false);
  });
});
