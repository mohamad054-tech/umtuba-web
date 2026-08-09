/** Wave10 A3 — pre-persistence certification regression matrix helpers (TEST-ONLY; no durable issuance). */
export type MatrixScenarioId =
  | "INCOMPLETE_LESSONS"
  | "INCOMPLETE_REQUIRED_ASSESSMENT"
  | "FAILED_REQUIRED_ASSESSMENT"
  | "ELIGIBLE_LEARNER"
  | "UNENROLLED_LEARNER"
  | "WRONG_LEARNER"
  | "MISSING_INVALID_COURSE"
  | "REPEATED_ELIGIBILITY"
  | "REPEATED_ISSUANCE_REQUEST"
  | "MISSING_PERSISTENCE"
  | "UNKNOWN_CERTIFICATE"
  | "REVOKED_OR_INVALID_VERIFICATION";

export type MatrixStage =
  | "COURSE_COMPLETION"
  | "CERTIFICATE_ELIGIBILITY"
  | "ISSUANCE_REQUEST_BOUNDARY"
  | "MISSING_PERSISTENCE_FAIL_CLOSED"
  | "VERIFICATION_BOUNDARY";

export type MatrixInput = {
  lessonsComplete: boolean;
  requiredAssessmentComplete: boolean;
  requiredAssessmentPassed: boolean;
  enrolled: boolean;
  learnerMatches: boolean;
  courseValid: boolean;
  persistenceAvailable: boolean;
  alreadyRequested: boolean;
  certificateKnown: boolean;
  certificateRevoked: boolean;
};

export type MatrixResult = {
  eligible: boolean;
  issuanceRequestAllowed: boolean;
  durableCertificateCreated: false;
  verificationStatus: "VALID" | "UNKNOWN" | "REVOKED" | "INVALID" | "N_A";
  blockedByPersistence: boolean;
  reason: string;
};

export const ELIGIBILITY_NOT_ISSUANCE = true as const;
export const ISSUANCE_REQUEST_NOT_DURABLE_CERT = true as const;

export function evaluatePrePersistenceMatrix(input: MatrixInput): MatrixResult {
  const base = {
    durableCertificateCreated: false as const,
    blockedByPersistence: !input.persistenceAvailable,
  };

  if (!input.courseValid) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "MISSING_INVALID_COURSE",
    };
  }
  if (!input.enrolled) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "UNENROLLED",
    };
  }
  if (!input.learnerMatches) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "WRONG_LEARNER",
    };
  }
  if (!input.lessonsComplete) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "INCOMPLETE_LESSONS",
    };
  }
  if (!input.requiredAssessmentComplete) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "INCOMPLETE_REQUIRED_ASSESSMENT",
    };
  }
  if (!input.requiredAssessmentPassed) {
    return {
      ...base,
      eligible: false,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "FAILED_REQUIRED_ASSESSMENT",
    };
  }

  // Eligible — eligibility itself never issues.
  if (!input.persistenceAvailable) {
    return {
      ...base,
      eligible: true,
      issuanceRequestAllowed: false,
      verificationStatus: "UNKNOWN",
      reason: "MISSING_PERSISTENCE",
    };
  }
  if (input.alreadyRequested) {
    return {
      ...base,
      eligible: true,
      issuanceRequestAllowed: false,
      verificationStatus: "N_A",
      reason: "REPEATED_ISSUANCE_REQUEST",
    };
  }
  if (!input.certificateKnown) {
    return {
      ...base,
      eligible: true,
      issuanceRequestAllowed: true,
      verificationStatus: "UNKNOWN",
      reason: "UNKNOWN_CERTIFICATE",
    };
  }
  if (input.certificateRevoked) {
    return {
      ...base,
      eligible: true,
      issuanceRequestAllowed: false,
      verificationStatus: "REVOKED",
      reason: "REVOKED_OR_INVALID_VERIFICATION",
    };
  }
  return {
    ...base,
    eligible: true,
    issuanceRequestAllowed: true,
    verificationStatus: "VALID",
    reason: "ELIGIBLE_LEARNER",
  };
}

export function repeatedEligibilityDoesNotIssue(input: MatrixInput): MatrixResult[] {
  return [evaluatePrePersistenceMatrix(input), evaluatePrePersistenceMatrix(input)];
}
