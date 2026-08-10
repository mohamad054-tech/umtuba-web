import { describe, expect, it } from "vitest";
import {
  OWNERSHIP_TRANSFER,
  PRIOR_ACCEPTANCE_SHA_REF,
  checkAcceptanceDrift,
} from "./collaborationReleaseAcceptanceHandoffCloseout";

describe("collaboration release acceptance handoff closeout", () => {
  it("remains valid when SoT matches accepted surfaces", () => {
    expect(PRIOR_ACCEPTANCE_SHA_REF).toBe("ab9cca3");
    expect(OWNERSHIP_TRANSFER).toBe("CANDIDATE_NOT_SUPPORTED");
    const r = checkAcceptanceDrift({
      soTMatchesAcceptedSurfaces: true,
      unexpectedOwnershipTransfer: false,
      unexpectedNewRoles: false,
    });
    expect(r.COLLABORATION_ACCEPTANCE_STILL_VALID).toBe("YES");
    expect(r.DRIFT_FOUND).toEqual(["none"]);
  });

  it("flags drift when surfaces no longer match", () => {
    const r = checkAcceptanceDrift({
      soTMatchesAcceptedSurfaces: false,
      unexpectedOwnershipTransfer: false,
      unexpectedNewRoles: false,
    });
    expect(r.COLLABORATION_ACCEPTANCE_STILL_VALID).toBe("NO");
    expect(r.DRIFT_FOUND.length).toBeGreaterThan(0);
  });
});
