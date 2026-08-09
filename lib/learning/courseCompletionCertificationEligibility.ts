/** Wave7 A3 — course completion -> certificate eligibility (NOT issuance). */
export type EligibilityResult = "ELIGIBLE" | "NOT_ELIGIBLE";
export type EligibilityReason =
  | "OK"
  | "LESSONS_INCOMPLETE"
  | "ASSESSMENTS_INCOMPLETE"
  | "ASSESSMENT_NOT_PASSING"
  | "ENROLLMENT_NOT_OWNED"
  | "COURSE_NOT_PUBLISHED"
  | "COMPLETION_UNRESOLVED";

export type EligibilityInput = {
  allRequiredLessonsComplete: boolean;
  requiredAssessmentsComplete: boolean;
  passingWhereRequired: boolean;
  enrollmentOwnedByLearner: boolean;
  coursePublished: boolean;
  completionResolved: boolean;
};

export function decideCertificateEligibility(input: EligibilityInput): {
  result: EligibilityResult;
  reasons: EligibilityReason[];
} {
  const reasons: EligibilityReason[] = [];
  if (!input.enrollmentOwnedByLearner) reasons.push("ENROLLMENT_NOT_OWNED");
  if (!input.coursePublished) reasons.push("COURSE_NOT_PUBLISHED");
  if (!input.completionResolved) reasons.push("COMPLETION_UNRESOLVED");
  if (!input.allRequiredLessonsComplete) reasons.push("LESSONS_INCOMPLETE");
  if (!input.requiredAssessmentsComplete) reasons.push("ASSESSMENTS_INCOMPLETE");
  if (!input.passingWhereRequired) reasons.push("ASSESSMENT_NOT_PASSING");
  if (reasons.length === 0) return { result: "ELIGIBLE", reasons: ["OK"] };
  return { result: "NOT_ELIGIBLE", reasons };
}

export const ELIGIBILITY_IS_NOT_ISSUANCE = true as const;
