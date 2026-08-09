import { describe, expect, it } from "vitest";
import {
  ELIGIBILITY_NOT_ISSUANCE,
  ISSUANCE_REQUEST_NOT_DURABLE_CERT,
  evaluatePrePersistenceMatrix,
  repeatedEligibilityDoesNotIssue,
} from "./certificationPrePersistenceRegressionMatrix";

const eligibleBase = {
  lessonsComplete: true,
  requiredAssessmentComplete: true,
  requiredAssessmentPassed: true,
  enrolled: true,
  learnerMatches: true,
  courseValid: true,
  persistenceAvailable: false,
  alreadyRequested: false,
  certificateKnown: false,
  certificateRevoked: false,
};

describe("certification end-to-end pre-persistence regression matrix", () => {
  it("keeps eligibility distinct from issuance and never creates durable certs", () => {
    expect(ELIGIBILITY_NOT_ISSUANCE).toBe(true);
    expect(ISSUANCE_REQUEST_NOT_DURABLE_CERT).toBe(true);
    const r = evaluatePrePersistenceMatrix(eligibleBase);
    expect(r.eligible).toBe(true);
    expect(r.issuanceRequestAllowed).toBe(false);
    expect(r.durableCertificateCreated).toBe(false);
    expect(r.blockedByPersistence).toBe(true);
    expect(r.reason).toBe("MISSING_PERSISTENCE");
  });

  it("covers negative completion/assessment/enrollment/learner/course paths", () => {
    expect(evaluatePrePersistenceMatrix({ ...eligibleBase, lessonsComplete: false }).reason).toBe(
      "INCOMPLETE_LESSONS",
    );
    expect(
      evaluatePrePersistenceMatrix({ ...eligibleBase, requiredAssessmentComplete: false }).reason,
    ).toBe("INCOMPLETE_REQUIRED_ASSESSMENT");
    expect(
      evaluatePrePersistenceMatrix({ ...eligibleBase, requiredAssessmentPassed: false }).reason,
    ).toBe("FAILED_REQUIRED_ASSESSMENT");
    expect(evaluatePrePersistenceMatrix({ ...eligibleBase, enrolled: false }).reason).toBe(
      "UNENROLLED",
    );
    expect(evaluatePrePersistenceMatrix({ ...eligibleBase, learnerMatches: false }).reason).toBe(
      "WRONG_LEARNER",
    );
    expect(evaluatePrePersistenceMatrix({ ...eligibleBase, courseValid: false }).reason).toBe(
      "MISSING_INVALID_COURSE",
    );
  });

  it("fails closed on missing persistence and unknown/revoked verification boundaries", () => {
    expect(evaluatePrePersistenceMatrix(eligibleBase).reason).toBe("MISSING_PERSISTENCE");
    expect(
      evaluatePrePersistenceMatrix({
        ...eligibleBase,
        persistenceAvailable: true,
        certificateKnown: false,
      }).verificationStatus,
    ).toBe("UNKNOWN");
    expect(
      evaluatePrePersistenceMatrix({
        ...eligibleBase,
        persistenceAvailable: true,
        certificateKnown: true,
        certificateRevoked: true,
      }).verificationStatus,
    ).toBe("REVOKED");
  });

  it("repeated eligibility evaluation never issues anything", () => {
    const [a, b] = repeatedEligibilityDoesNotIssue(eligibleBase);
    expect(a.durableCertificateCreated).toBe(false);
    expect(b.durableCertificateCreated).toBe(false);
    expect(a.issuanceRequestAllowed).toBe(false);
    expect(
      evaluatePrePersistenceMatrix({
        ...eligibleBase,
        persistenceAvailable: true,
        alreadyRequested: true,
      }).reason,
    ).toBe("REPEATED_ISSUANCE_REQUEST");
  });
});
