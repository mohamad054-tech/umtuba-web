/** Certification persistence readiness — re-verified against live linked DB 2026-08-12. */
export type PersistenceReadiness = {
  PERSISTENCE_EXISTS: "YES" | "NO" | "PARTIAL";
  STABLE_CERTIFICATE_ID_EXISTS: "YES" | "NO" | "PARTIAL";
  ISSUANCE_HISTORY_EXISTS: "YES" | "NO" | "PARTIAL";
  VERIFICATION_STORAGE_EXISTS: "YES" | "NO" | "PARTIAL";
  REVOCATION_STATE_EXISTS: "YES" | "NO" | "PARTIAL";
  DURABLE_DUPLICATE_PROTECTION_EXISTS: "YES" | "NO" | "PARTIAL";
  MIGRATION_REQUIRED: "YES" | "NO";
};

/** Live evidence: remote schema_migrations has 20260921_learning_certification_persistence_v1. */
export const REMOTE_CERTIFICATION_MIGRATION = {
  version: "20260921",
  name: "learning_certification_persistence_v1",
  localSqlPresentOnLearningTip: false,
} as const;

/** Evidence-backed defaults after remote apply of 20260921 (probed via linked db query). */
export const WAVE8_A1_PERSISTENCE: PersistenceReadiness = {
  PERSISTENCE_EXISTS: "YES",
  STABLE_CERTIFICATE_ID_EXISTS: "YES",
  ISSUANCE_HISTORY_EXISTS: "YES",
  VERIFICATION_STORAGE_EXISTS: "YES",
  REVOCATION_STATE_EXISTS: "YES",
  DURABLE_DUPLICATE_PROTECTION_EXISTS: "YES",
  MIGRATION_REQUIRED: "NO",
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

/** Historical flag — allocation already consumed by remote 20260921. */
export const READY_FOR_CENTRAL_MIGRATION_ALLOCATION = false as const;
export const REMOTE_CERTIFICATION_PERSISTENCE_APPLIED = true as const;
