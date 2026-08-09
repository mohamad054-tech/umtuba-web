/** Wave8 A1 — certification persistence migration-readiness contract (NO migration create/apply). */
export type PersistenceReadiness = {
  PERSISTENCE_EXISTS: "YES" | "NO" | "PARTIAL";
  STABLE_CERTIFICATE_ID_EXISTS: "YES" | "NO" | "PARTIAL";
  ISSUANCE_HISTORY_EXISTS: "YES" | "NO" | "PARTIAL";
  VERIFICATION_STORAGE_EXISTS: "YES" | "NO" | "PARTIAL";
  REVOCATION_STATE_EXISTS: "YES" | "NO" | "PARTIAL";
  DURABLE_DUPLICATE_PROTECTION_EXISTS: "YES" | "NO" | "PARTIAL";
  MIGRATION_REQUIRED: "YES" | "NO";
};

/** Evidence-backed defaults for current SoT without inventing DB tables. */
export const WAVE8_A1_PERSISTENCE: PersistenceReadiness = {
  PERSISTENCE_EXISTS: "NO",
  STABLE_CERTIFICATE_ID_EXISTS: "PARTIAL",
  ISSUANCE_HISTORY_EXISTS: "NO",
  VERIFICATION_STORAGE_EXISTS: "NO",
  REVOCATION_STATE_EXISTS: "PARTIAL",
  DURABLE_DUPLICATE_PROTECTION_EXISTS: "PARTIAL",
  MIGRATION_REQUIRED: "YES",
};

export const PROPOSED_SCHEMA_BOUNDARY = {
  tables: ["learning_certificates", "learning_certificate_events"],
  certificateIdentity: "certificate_id UUID PK",
  learnerIdentity: "learner_id UUID NOT NULL",
  courseIdentity: "course_id UUID NOT NULL",
  issuanceTime: "issued_at timestamptz",
  issuanceStatus: "status enum pending|issued|failed|revoked",
  verificationToken: "verification_token opaque unique",
  duplicateUniqueness: "UNIQUE (learner_id, course_id) WHERE status <> revoked",
  revocation: "revoked_at + revoke_reason nullable",
  audit: "append-only learning_certificate_events",
};

export const PROPOSED_RPC_BOUNDARY = {
  rpcs: ["issue_certificate", "verify_certificate", "revoke_certificate"],
  idempotency: "idempotency_key on issue_certificate",
  authorization: "issue after eligibility; verify public-read; revoke admin/instructor",
  noClientDirectInserts: true,
};

export const UNIQUENESS_BOUNDARY =
  "one active certificate per (learner_id, course_id); conflict => ALREADY_ISSUED";
export const REVOCATION_BOUNDARY =
  "revoked certificates fail verification; new issuance may require Central policy";
export const AUTHORIZATION_BOUNDARY =
  "issue service/instructor after ELIGIBLE; verify public; revoke admin/instructor";

export const READY_FOR_CENTRAL_MIGRATION_ALLOCATION = true as const;
