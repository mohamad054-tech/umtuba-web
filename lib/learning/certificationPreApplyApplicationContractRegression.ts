/** Wave12 A1 — pre-apply certification application contract regression (NO durable issuance required). */
export const MIGRATION_STATE = {
  ALLOCATED_MIGRATION: true,
  CREATED_MIGRATION: true,
  APPLIED_MIGRATION: false,
  REGISTERED_HISTORY: false,
} as const;

export type PreApplyExpectation =
  | "ELIGIBILITY_OK_NO_ISSUE"
  | "ISSUANCE_REQUEST_BLOCKED_MISSING_PERSISTENCE"
  | "DUPLICATE_PREVENTED"
  | "VERIFY_FAIL_CLOSED"
  | "REVOKE_NOT_VALID"
  | "UNAUTHORIZED"
  | "IDEMPOTENT_NO_SIDE_EFFECT";

export type ContractSurface =
  | "ELIGIBILITY"
  | "ISSUANCE_REQUEST"
  | "MISSING_PERSISTENCE_FAIL_CLOSED"
  | "DUPLICATE_ISSUANCE_PREVENTION"
  | "STABLE_CERTIFICATE_IDENTITY"
  | "VERIFICATION"
  | "REVOCATION"
  | "AUTHORIZATION"
  | "IDEMPOTENCY"
  | "AUDITABILITY";

/** Application-level expectations while migration is created but NOT applied. */
export function preApplyContractExpectation(surface: ContractSurface): {
  aligned: boolean;
  expectation: PreApplyExpectation | "CONTRACT_PRESENT";
  durableIssuanceRequired: false;
} {
  switch (surface) {
    case "ELIGIBILITY":
      return { aligned: true, expectation: "ELIGIBILITY_OK_NO_ISSUE", durableIssuanceRequired: false };
    case "ISSUANCE_REQUEST":
    case "MISSING_PERSISTENCE_FAIL_CLOSED":
      return {
        aligned: true,
        expectation: "ISSUANCE_REQUEST_BLOCKED_MISSING_PERSISTENCE",
        durableIssuanceRequired: false,
      };
    case "DUPLICATE_ISSUANCE_PREVENTION":
      return { aligned: true, expectation: "DUPLICATE_PREVENTED", durableIssuanceRequired: false };
    case "STABLE_CERTIFICATE_IDENTITY":
      return { aligned: true, expectation: "CONTRACT_PRESENT", durableIssuanceRequired: false };
    case "VERIFICATION":
      return { aligned: true, expectation: "VERIFY_FAIL_CLOSED", durableIssuanceRequired: false };
    case "REVOCATION":
      return { aligned: true, expectation: "REVOKE_NOT_VALID", durableIssuanceRequired: false };
    case "AUTHORIZATION":
      return { aligned: true, expectation: "UNAUTHORIZED", durableIssuanceRequired: false };
    case "IDEMPOTENCY":
      return { aligned: true, expectation: "IDEMPOTENT_NO_SIDE_EFFECT", durableIssuanceRequired: false };
    case "AUDITABILITY":
      return { aligned: true, expectation: "CONTRACT_PRESENT", durableIssuanceRequired: false };
  }
}

export function evaluatePreApplyAlignment(surfaces: ContractSurface[]): {
  CONTRACT_ALIGNMENT: "PRE_APPLY_CONTRACT_ALIGNED" | "PRE_APPLY_CONTRACT_DRIFT_FOUND";
  DRIFT_FOUND: string[];
} {
  const drift: string[] = [];
  for (const s of surfaces) {
    const r = preApplyContractExpectation(s);
    if (!r.aligned || r.durableIssuanceRequired !== false) {
      drift.push(s);
    }
    // Pre-apply: durable issuance must never be required
    if (MIGRATION_STATE.APPLIED_MIGRATION === false && r.expectation === ("ELIGIBILITY_OK_NO_ISSUE" as PreApplyExpectation) && s === "ISSUANCE_REQUEST") {
      drift.push("ISSUANCE_REQUEST_MUST_FAIL_CLOSED_PRE_APPLY");
    }
  }
  // Explicit invariant checks
  if (MIGRATION_STATE.APPLIED_MIGRATION) {
    drift.push("UNEXPECTED_APPLIED_FLAG_IN_PRE_APPLY_TASK");
  }
  const issuance = preApplyContractExpectation("ISSUANCE_REQUEST");
  if (issuance.expectation !== "ISSUANCE_REQUEST_BLOCKED_MISSING_PERSISTENCE") {
    drift.push("ISSUANCE_REQUEST_NOT_FAIL_CLOSED");
  }
  return {
    CONTRACT_ALIGNMENT: drift.length ? "PRE_APPLY_CONTRACT_DRIFT_FOUND" : "PRE_APPLY_CONTRACT_ALIGNED",
    DRIFT_FOUND: drift,
  };
}

export const ALL_SURFACES: ContractSurface[] = [
  "ELIGIBILITY",
  "ISSUANCE_REQUEST",
  "MISSING_PERSISTENCE_FAIL_CLOSED",
  "DUPLICATE_ISSUANCE_PREVENTION",
  "STABLE_CERTIFICATE_IDENTITY",
  "VERIFICATION",
  "REVOCATION",
  "AUTHORIZATION",
  "IDEMPOTENCY",
  "AUDITABILITY",
];
