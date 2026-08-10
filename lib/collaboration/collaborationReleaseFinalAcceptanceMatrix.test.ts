import { describe, expect, it } from "vitest";
import {
  OWNERSHIP_TRANSFER,
  PRIOR_REVALIDATION_SHA_REF,
  finalAcceptance,
} from "./collaborationReleaseFinalAcceptanceMatrix";

describe("collaboration release final acceptance matrix", () => {
  it("accepts when domain pass and keeps ownership transfer unsupported", () => {
    expect(OWNERSHIP_TRANSFER).toBe("CANDIDATE_NOT_SUPPORTED");
    expect(PRIOR_REVALIDATION_SHA_REF).toBe("9dba7a0");
    const r = finalAcceptance(true);
    expect(r.COLLABORATION_RELEASE_ACCEPTED).toBe("YES");
    expect(r.removed_member_denial).toBe(true);
    expect(r.cross_workspace_isolation).toBe(true);
  });

  it("does not accept without regression ready", () => {
    expect(finalAcceptance(false).COLLABORATION_RELEASE_ACCEPTED).toBe("NO");
  });
});
