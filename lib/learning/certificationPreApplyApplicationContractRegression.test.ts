import { describe, expect, it } from "vitest";
import {
  ALL_SURFACES,
  MIGRATION_STATE,
  evaluatePreApplyAlignment,
  preApplyContractExpectation,
} from "./certificationPreApplyApplicationContractRegression";

describe("certification pre-apply application contract regression", () => {
  it("records migration as created but not applied/registered", () => {
    expect(MIGRATION_STATE.ALLOCATED_MIGRATION).toBe(true);
    expect(MIGRATION_STATE.CREATED_MIGRATION).toBe(true);
    expect(MIGRATION_STATE.APPLIED_MIGRATION).toBe(false);
    expect(MIGRATION_STATE.REGISTERED_HISTORY).toBe(false);
  });

  it("keeps issuance/verification fail-closed before apply", () => {
    expect(preApplyContractExpectation("ISSUANCE_REQUEST").expectation).toBe(
      "ISSUANCE_REQUEST_BLOCKED_MISSING_PERSISTENCE",
    );
    expect(preApplyContractExpectation("VERIFICATION").expectation).toBe("VERIFY_FAIL_CLOSED");
    expect(preApplyContractExpectation("ELIGIBILITY").expectation).toBe("ELIGIBILITY_OK_NO_ISSUE");
  });

  it("aligns all contracted surfaces without requiring durable issuance", () => {
    const r = evaluatePreApplyAlignment(ALL_SURFACES);
    expect(r.CONTRACT_ALIGNMENT).toBe("PRE_APPLY_CONTRACT_ALIGNED");
    expect(r.DRIFT_FOUND).toEqual([]);
    for (const s of ALL_SURFACES) {
      expect(preApplyContractExpectation(s).durableIssuanceRequired).toBe(false);
    }
  });
});
