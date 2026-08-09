/** Wave8 A3 — eligibility idempotency + negative paths (NOT issuance; avoid A1 persistence files). */
export type EligibilityResult = "ELIGIBLE" | "NOT_ELIGIBLE";
export type EligibilityReason =
  | "OK"
  | "LESSONS_INCOMPLETE"
  | "ASSESSMENTS_INCOMPLETE"
  | "ASSESSMENT_NOT_PASSING"
  | "ENROLLMENT_NOT_OWNED"
  | "UNENROLLED"
  | "WRONG_LEARNER"
  | "COURSE_NOT_PUBLISHED"
  | "COURSE_MISSING"
  | "COMPLETION_UNRESOLVED"
  | "MALFORMED_COMPLETION_EVIDENCE"
  | "STALE_COMPLETION_STATE";

export type EligibilityInput = {
  allRequiredLessonsComplete: boolean;
  requiredAssessmentsComplete: boolean;
  passingWhereRequired: boolean;
  enrollmentOwnedByLearner: boolean;
  enrolled: boolean;
  learnerMatchesEnrollment: boolean;
  coursePublished: boolean;
  courseExists: boolean;
  completionResolved: boolean;
  completionEvidenceValid: boolean;
  completionFresh: boolean;
};

export function decideCertificateEligibility(input: EligibilityInput): {
  result: EligibilityResult;
  reasons: EligibilityReason[];
} {
  const reasons: EligibilityReason[] = [];
  if (!input.courseExists) reasons.push("COURSE_MISSING");
  if (!input.enrolled) reasons.push("UNENROLLED");
  if (!input.learnerMatchesEnrollment) reasons.push("WRONG_LEARNER");
  if (!input.enrollmentOwnedByLearner) reasons.push("ENROLLMENT_NOT_OWNED");
  if (!input.coursePublished) reasons.push("COURSE_NOT_PUBLISHED");
  if (!input.completionEvidenceValid) reasons.push("MALFORMED_COMPLETION_EVIDENCE");
  if (!input.completionFresh) reasons.push("STALE_COMPLETION_STATE");
  if (!input.completionResolved) reasons.push("COMPLETION_UNRESOLVED");
  if (!input.allRequiredLessonsComplete) reasons.push("LESSONS_INCOMPLETE");
  if (!input.requiredAssessmentsComplete) reasons.push("ASSESSMENTS_INCOMPLETE");
  if (!input.passingWhereRequired) reasons.push("ASSESSMENT_NOT_PASSING");
  if (reasons.length === 0) return { result: "ELIGIBLE", reasons: ["OK"] };
  return { result: "NOT_ELIGIBLE", reasons };
}

/** Repeated evaluation must not mutate or issue. */
export function evaluateEligibilityIdempotent(
  input: EligibilityInput,
): { first: ReturnType<typeof decideCertificateEligibility>; second: ReturnType<typeof decideCertificateEligibility> } {
  const first = decideCertificateEligibility(input);
  const second = decideCertificateEligibility(input);
  return { first, second };
}

export const ELIGIBILITY_IS_NOT_ISSUANCE = true as const;
