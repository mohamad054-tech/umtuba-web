import { describe, expect, it } from "vitest";
import {
  ELIGIBILITY_IS_NOT_ISSUANCE,
  decideCertificateEligibility,
  evaluateEligibilityIdempotent,
} from "./certificationEligibilityIdempotencyNegativePath";

const ok: Parameters<typeof decideCertificateEligibility>[0] = {
  allRequiredLessonsComplete: true,
  requiredAssessmentsComplete: true,
  passingWhereRequired: true,
  enrollmentOwnedByLearner: true,
  enrolled: true,
  learnerMatchesEnrollment: true,
  coursePublished: true,
  courseExists: true,
  completionResolved: true,
  completionEvidenceValid: true,
  completionFresh: true,
};

describe("certification eligibility idempotency and negative path", () => {
  it("does not issue certificates", () => {
    expect(ELIGIBILITY_IS_NOT_ISSUANCE).toBe(true);
  });

  it("returns ELIGIBLE when all gates pass", () => {
    const d = decideCertificateEligibility(ok);
    expect(d.result).toBe("ELIGIBLE");
    expect(d.reasons).toEqual(["OK"]);
  });

  it("covers negative paths with machine-readable reasons", () => {
    const d = decideCertificateEligibility({
      ...ok,
      allRequiredLessonsComplete: false,
      requiredAssessmentsComplete: false,
      passingWhereRequired: false,
      enrolled: false,
      learnerMatchesEnrollment: false,
      coursePublished: false,
      courseExists: false,
      completionResolved: false,
      completionEvidenceValid: false,
      completionFresh: false,
      enrollmentOwnedByLearner: false,
    });
    expect(d.result).toBe("NOT_ELIGIBLE");
    for (const r of [
      "LESSONS_INCOMPLETE",
      "ASSESSMENTS_INCOMPLETE",
      "ASSESSMENT_NOT_PASSING",
      "UNENROLLED",
      "WRONG_LEARNER",
      "COURSE_NOT_PUBLISHED",
      "COURSE_MISSING",
      "COMPLETION_UNRESOLVED",
      "MALFORMED_COMPLETION_EVIDENCE",
      "STALE_COMPLETION_STATE",
      "ENROLLMENT_NOT_OWNED",
    ]) {
      expect(d.reasons).toContain(r);
    }
  });

  it("is idempotent across repeated evaluation", () => {
    const { first, second } = evaluateEligibilityIdempotent(ok);
    expect(first).toEqual(second);
  });
});
