import { describe, expect, it } from "vitest";
import {
  ELIGIBILITY_IS_NOT_ISSUANCE,
  decideCertificateEligibility,
} from "./courseCompletionCertificationEligibility";

describe("course completion certification eligibility contract", () => {
  it("does not issue certificates", () => {
    expect(ELIGIBILITY_IS_NOT_ISSUANCE).toBe(true);
  });

  it("returns ELIGIBLE when all gates pass", () => {
    const d = decideCertificateEligibility({
      allRequiredLessonsComplete: true,
      requiredAssessmentsComplete: true,
      passingWhereRequired: true,
      enrollmentOwnedByLearner: true,
      coursePublished: true,
      completionResolved: true,
    });
    expect(d.result).toBe("ELIGIBLE");
    expect(d.reasons).toEqual(["OK"]);
  });

  it("returns machine-readable NOT_ELIGIBLE reasons", () => {
    const d = decideCertificateEligibility({
      allRequiredLessonsComplete: false,
      requiredAssessmentsComplete: false,
      passingWhereRequired: false,
      enrollmentOwnedByLearner: false,
      coursePublished: false,
      completionResolved: false,
    });
    expect(d.result).toBe("NOT_ELIGIBLE");
    for (const r of [
      "LESSONS_INCOMPLETE",
      "ASSESSMENTS_INCOMPLETE",
      "ASSESSMENT_NOT_PASSING",
      "ENROLLMENT_NOT_OWNED",
      "COURSE_NOT_PUBLISHED",
      "COMPLETION_UNRESOLVED",
    ]) {
      expect(d.reasons).toContain(r);
    }
  });
});
