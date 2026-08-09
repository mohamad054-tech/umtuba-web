/** Wave9 A3 — eligibility -> issuance-request boundary E2E (NOT durable issuance; avoid A1 service files). */
export type BoundaryReason =
  | "OK"
  | "NOT_ELIGIBLE"
  | "WRONG_LEARNER"
  | "UNENROLLED"
  | "UNAUTHORIZED"
  | "MISSING_PERSISTENCE"
  | "STALE_ELIGIBILITY"
  | "DUPLICATE_REQUEST";

export type BoundaryInput = {
  eligible: boolean;
  enrolled: boolean;
  learnerMatches: boolean;
  authorized: boolean;
  persistenceAvailable: boolean;
  eligibilityFresh: boolean;
  alreadyRequested: boolean;
};

export type BoundaryResult = {
  eligibilityResult: "ELIGIBLE" | "NOT_ELIGIBLE";
  issuanceRequestAllowed: boolean;
  durableCertificateCreated: false;
  reason: BoundaryReason;
};

/** Eligibility evaluation itself issues NOTHING. */
export function evaluateEligibilityToIssuanceBoundary(input: BoundaryInput): BoundaryResult {
  const base = {
    durableCertificateCreated: false as const,
  };
  if (!input.enrolled) {
    return {
      ...base,
      eligibilityResult: "NOT_ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "UNENROLLED",
    };
  }
  if (!input.learnerMatches) {
    return {
      ...base,
      eligibilityResult: "NOT_ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "WRONG_LEARNER",
    };
  }
  if (!input.eligible) {
    return {
      ...base,
      eligibilityResult: "NOT_ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "NOT_ELIGIBLE",
    };
  }
  if (!input.eligibilityFresh) {
    return {
      ...base,
      eligibilityResult: "NOT_ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "STALE_ELIGIBILITY",
    };
  }
  if (!input.authorized) {
    return {
      ...base,
      eligibilityResult: "ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "UNAUTHORIZED",
    };
  }
  if (!input.persistenceAvailable) {
    return {
      ...base,
      eligibilityResult: "ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "MISSING_PERSISTENCE",
    };
  }
  if (input.alreadyRequested) {
    return {
      ...base,
      eligibilityResult: "ELIGIBLE",
      issuanceRequestAllowed: false,
      reason: "DUPLICATE_REQUEST",
    };
  }
  return {
    ...base,
    eligibilityResult: "ELIGIBLE",
    issuanceRequestAllowed: true,
    reason: "OK",
  };
}

export const ELIGIBILITY_NOT_ISSUANCE = true as const;
export const ISSUANCE_REQUEST_NOT_DURABLE_CERT = true as const;
