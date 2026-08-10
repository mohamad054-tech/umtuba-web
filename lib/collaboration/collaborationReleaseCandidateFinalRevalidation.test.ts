import { describe, expect, it } from "vitest";
import { OWNERSHIP_TRANSFER, revalidateReleaseCandidate } from "./collaborationReleaseCandidateFinalRevalidation";

describe("collaboration release candidate final revalidation", () => {
  it("keeps ownership transfer unsupported and marks RC ready when domain pass", () => {
    expect(OWNERSHIP_TRANSFER).toBe("CANDIDATE_NOT_SUPPORTED");
    const r = revalidateReleaseCandidate(true);
    expect(r.COLLABORATION_RELEASE_READY).toBe("YES");
    expect(r.REMOVED_MEMBER_DENIAL_READY).toBe(true);
    expect(r.CROSS_WORKSPACE_ISOLATION_READY).toBe(true);
  });

  it("is not release-ready if regression not ready", () => {
    expect(revalidateReleaseCandidate(false).COLLABORATION_RELEASE_READY).toBe("NO");
  });
});
