import { describe, expect, it } from "vitest";
import {
  ELIGIBILITY_NOT_ISSUANCE,
  ISSUANCE_REQUEST_NOT_DURABLE_CERT,
  evaluateEligibilityToIssuanceBoundary,
} from "./certificationEligibilityToIssuanceBoundaryE2e";

const ok = {
  eligible: true,
  enrolled: true,
  learnerMatches: true,
  authorized: true,
  persistenceAvailable: true,
  eligibilityFresh: true,
  alreadyRequested: false,
};

describe("certification eligibility to issuance boundary e2e", () => {
  it("keeps eligibility distinct from durable issuance", () => {
    expect(ELIGIBILITY_NOT_ISSUANCE).toBe(true);
    expect(ISSUANCE_REQUEST_NOT_DURABLE_CERT).toBe(true);
    const r = evaluateEligibilityToIssuanceBoundary(ok);
    expect(r.durableCertificateCreated).toBe(false);
    expect(r.issuanceRequestAllowed).toBe(true);
  });

  it("blocks incomplete/failed/wrong/unenrolled and stale paths", () => {
    expect(evaluateEligibilityToIssuanceBoundary({ ...ok, eligible: false }).reason).toBe(
      "NOT_ELIGIBLE",
    );
    expect(evaluateEligibilityToIssuanceBoundary({ ...ok, enrolled: false }).reason).toBe(
      "UNENROLLED",
    );
    expect(evaluateEligibilityToIssuanceBoundary({ ...ok, learnerMatches: false }).reason).toBe(
      "WRONG_LEARNER",
    );
    expect(evaluateEligibilityToIssuanceBoundary({ ...ok, eligibilityFresh: false }).reason).toBe(
      "STALE_ELIGIBILITY",
    );
  });

  it("fails closed on missing persistence and unauthorized issuance request", () => {
    expect(
      evaluateEligibilityToIssuanceBoundary({ ...ok, persistenceAvailable: false }).reason,
    ).toBe("MISSING_PERSISTENCE");
    expect(evaluateEligibilityToIssuanceBoundary({ ...ok, authorized: false }).reason).toBe(
      "UNAUTHORIZED",
    );
  });

  it("treats duplicate issuance request as idempotent denial of second create", () => {
    const r = evaluateEligibilityToIssuanceBoundary({ ...ok, alreadyRequested: true });
    expect(r.reason).toBe("DUPLICATE_REQUEST");
    expect(r.durableCertificateCreated).toBe(false);
  });
});
