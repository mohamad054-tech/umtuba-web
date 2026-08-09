/** Wave10 A1 — verification public read-model readiness (NO issuance; NO fake durable persistence). */
export type VerificationStatus =
  | "VALID"
  | "REVOKED"
  | "INVALID"
  | "UNKNOWN";

export type PublicSafeVerificationFields = {
  certificateId: string;
  verificationStatus: VerificationStatus;
  learnerDisplay: string | null;
  courseDisplay: string | null;
  issuedAt: string | null;
  revocationStatus: "NONE" | "REVOKED" | "UNKNOWN";
};

export type AuthorizedPrivateVerificationFields = {
  learnerInternalId: string;
  enrollmentId: string;
  issuerActorId: string;
  rawEligibilitySnapshot: unknown;
};

export const PUBLIC_SAFE_FIELDS = [
  "CERTIFICATE_ID",
  "VERIFICATION_STATUS",
  "LEARNER_DISPLAY_BOUNDARY",
  "COURSE_DISPLAY_BOUNDARY",
  "ISSUED_AT_BOUNDARY",
  "REVOCATION_STATUS",
] as const;

export const AUTHORIZED_PRIVATE_FIELDS = [
  "LEARNER_INTERNAL_ID",
  "ENROLLMENT_ID",
  "ISSUER_ACTOR_ID",
  "RAW_ELIGIBILITY_SNAPSHOT",
] as const;

/** Durable certificate rows are not assumed present on canonical SoT. */
export const MIGRATION_DEPENDENCY = true as const;

export type VerificationLookupRecord = {
  certificateId: string;
  learnerDisplay: string;
  courseDisplay: string;
  issuedAt: string;
  revoked: boolean;
  private: AuthorizedPrivateVerificationFields;
};

export type VerificationReadModelPort = {
  /** When false, real durable verification is unavailable — fail closed for unknown. */
  durableAvailable: boolean;
  findByCertificateId(certificateId: string): VerificationLookupRecord | null;
};

export type PublicVerificationResult =
  | { ok: true; public: PublicSafeVerificationFields; privateExposed: false }
  | {
      ok: false;
      verificationStatus: "UNKNOWN" | "INVALID" | "REVOKED";
      reason: "UNKNOWN_CERTIFICATE" | "INVALID_CERTIFICATE" | "REVOKED_CERTIFICATE" | "MISSING_DURABLE_STORE";
      public: PublicSafeVerificationFields;
      privateExposed: false;
    };

function emptyPublic(certificateId: string, status: VerificationStatus): PublicSafeVerificationFields {
  return {
    certificateId,
    verificationStatus: status,
    learnerDisplay: null,
    courseDisplay: null,
    issuedAt: null,
    revocationStatus: status === "REVOKED" ? "REVOKED" : status === "UNKNOWN" ? "UNKNOWN" : "NONE",
  };
}

/**
 * Public verification read-model boundary.
 * - Never returns AUTHORIZED_PRIVATE_FIELDS on the public surface.
 * - UNKNOWN / missing durable store fail closed (not VALID).
 * - REVOKED must never appear as VALID.
 * - Verification is not issuance; eligibility is not issuance.
 */
export function toPublicVerificationReadModel(
  certificateId: string,
  port: VerificationReadModelPort,
): PublicVerificationResult {
  const id = (certificateId || "").trim();
  if (!id) {
    return {
      ok: false,
      verificationStatus: "INVALID",
      reason: "INVALID_CERTIFICATE",
      public: emptyPublic("", "INVALID"),
      privateExposed: false,
    };
  }
  if (!port.durableAvailable) {
    return {
      ok: false,
      verificationStatus: "UNKNOWN",
      reason: "MISSING_DURABLE_STORE",
      public: emptyPublic(id, "UNKNOWN"),
      privateExposed: false,
    };
  }
  const row = port.findByCertificateId(id);
  if (!row) {
    return {
      ok: false,
      verificationStatus: "UNKNOWN",
      reason: "UNKNOWN_CERTIFICATE",
      public: emptyPublic(id, "UNKNOWN"),
      privateExposed: false,
    };
  }
  if (row.revoked) {
    return {
      ok: false,
      verificationStatus: "REVOKED",
      reason: "REVOKED_CERTIFICATE",
      public: {
        certificateId: row.certificateId,
        verificationStatus: "REVOKED",
        learnerDisplay: row.learnerDisplay,
        courseDisplay: row.courseDisplay,
        issuedAt: row.issuedAt,
        revocationStatus: "REVOKED",
      },
      privateExposed: false,
    };
  }
  return {
    ok: true,
    privateExposed: false,
    public: {
      certificateId: row.certificateId,
      verificationStatus: "VALID",
      learnerDisplay: row.learnerDisplay,
      courseDisplay: row.courseDisplay,
      issuedAt: row.issuedAt,
      revocationStatus: "NONE",
    },
  };
}

/** Test-only in-memory port — NOT durable production persistence. */
export class InMemoryVerificationReadModelPort implements VerificationReadModelPort {
  durableAvailable = true;
  private rows = new Map<string, VerificationLookupRecord>();
  seed(row: VerificationLookupRecord) {
    this.rows.set(row.certificateId, row);
  }
  findByCertificateId(certificateId: string) {
    return this.rows.get(certificateId) ?? null;
  }
}

export class MissingDurableVerificationPort implements VerificationReadModelPort {
  durableAvailable = false;
  findByCertificateId() {
    return null;
  }
}
