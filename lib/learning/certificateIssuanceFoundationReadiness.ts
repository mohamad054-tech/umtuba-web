/** Wave7 A1 — certificate issuance foundation readiness (NO fake issuance, NO migrations). */
export type IssuanceState =
  | "ISSUE_ALLOWED"
  | "ISSUE_BLOCKED"
  | "ALREADY_ISSUED"
  | "NOT_ELIGIBLE"
  | "VERIFICATION_VALID"
  | "VERIFICATION_INVALID";

export const WAVE7_A1_READINESS = {
  CERTIFICATION_EXISTS: "PARTIAL" as const,
  PERSISTENCE_EXISTS: "NO" as const,
  ISSUANCE_RPC_OR_SERVICE_EXISTS: "NO" as const,
  VERIFICATION_EXISTS: "PARTIAL" as const,
  STABLE_IDENTITY_DEFINED: "PARTIAL" as const,
  DUPLICATE_PREVENTION_DEFINED: "PARTIAL" as const,
  REVOCATION_BOUNDARY_DEFINED: "PARTIAL" as const,
  MIGRATION_REQUIRED: "YES" as const,
};

export const CENTRAL_MIGRATION_RPC_REQUIREMENTS = {
  schemaTables: ["learning_certificates", "learning_certificate_events"],
  stableCertificateIdentity:
    "opaque certificate_id UUID; unique (learner_id, course_id) where status != revoked",
  learnerCourseBinding: "FK enrollment+course; issue only if ELIGIBLE",
  uniquenessDuplicatePrevention:
    "unique active cert per learner+course; ALREADY_ISSUED on conflict",
  issuanceState: "pending|issued|failed|revoked",
  revokedInvalidState: "revoked_at+reason => VERIFICATION_INVALID",
  verificationReadModel: "verify by certificate_id+checksum",
  auditability: "append-only learning_certificate_events",
  idempotency: "idempotency_key on issue RPC",
  rpcServiceBoundary: "issue_certificate/verify_certificate/revoke_certificate",
  authorizationModel: "issue after eligibility; verify public; revoke admin/instructor",
};

export function decideIssuanceState(input: {
  eligible: boolean;
  alreadyIssued: boolean;
  blocked: boolean;
  verificationStatus?: "valid" | "invalid" | null;
}): IssuanceState {
  if (input.verificationStatus === "valid") return "VERIFICATION_VALID";
  if (input.verificationStatus === "invalid") return "VERIFICATION_INVALID";
  if (!input.eligible) return "NOT_ELIGIBLE";
  if (input.alreadyIssued) return "ALREADY_ISSUED";
  if (input.blocked) return "ISSUE_BLOCKED";
  return "ISSUE_ALLOWED";
}
