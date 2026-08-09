import { describe, expect, it } from "vitest";
import {
  CENTRAL_MIGRATION_RPC_REQUIREMENTS,
  WAVE7_A1_READINESS,
  decideIssuanceState,
} from "./certificateIssuanceFoundationReadiness";

describe("certificate issuance foundation implementation readiness", () => {
  it("exposes readiness flags without inventing persistence", () => {
    expect(WAVE7_A1_READINESS.MIGRATION_REQUIRED).toBe("YES");
    expect(WAVE7_A1_READINESS.PERSISTENCE_EXISTS).toBe("NO");
  });

  it("defines Central migration/RPC contract", () => {
    expect(CENTRAL_MIGRATION_RPC_REQUIREMENTS.schemaTables.length).toBeGreaterThan(0);
    expect(CENTRAL_MIGRATION_RPC_REQUIREMENTS.idempotency.length).toBeGreaterThan(0);
  });

  it("maps deterministic issuance states", () => {
    expect(decideIssuanceState({ eligible: false, alreadyIssued: false, blocked: false })).toBe(
      "NOT_ELIGIBLE",
    );
    expect(decideIssuanceState({ eligible: true, alreadyIssued: true, blocked: false })).toBe(
      "ALREADY_ISSUED",
    );
    expect(decideIssuanceState({ eligible: true, alreadyIssued: false, blocked: true })).toBe(
      "ISSUE_BLOCKED",
    );
    expect(decideIssuanceState({ eligible: true, alreadyIssued: false, blocked: false })).toBe(
      "ISSUE_ALLOWED",
    );
    expect(
      decideIssuanceState({
        eligible: true,
        alreadyIssued: false,
        blocked: false,
        verificationStatus: "valid",
      }),
    ).toBe("VERIFICATION_VALID");
    expect(
      decideIssuanceState({
        eligible: true,
        alreadyIssued: false,
        blocked: false,
        verificationStatus: "invalid",
      }),
    ).toBe("VERIFICATION_INVALID");
  });
});
