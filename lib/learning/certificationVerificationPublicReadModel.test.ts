import { describe, expect, it } from "vitest";
import {
  AUTHORIZED_PRIVATE_FIELDS,
  InMemoryVerificationReadModelPort,
  MIGRATION_DEPENDENCY,
  MissingDurableVerificationPort,
  PUBLIC_SAFE_FIELDS,
  toPublicVerificationReadModel,
} from "./certificationVerificationPublicReadModel";

describe("certification verification public read-model readiness", () => {
  it("declares migration dependency until durable certificate persistence lands", () => {
    expect(MIGRATION_DEPENDENCY).toBe(true);
    expect(PUBLIC_SAFE_FIELDS).toContain("CERTIFICATE_ID");
    expect(PUBLIC_SAFE_FIELDS).toContain("VERIFICATION_STATUS");
    expect(AUTHORIZED_PRIVATE_FIELDS).toContain("LEARNER_INTERNAL_ID");
  });

  it("fails closed for unknown certificate and never exposes private fields", () => {
    const port = new InMemoryVerificationReadModelPort();
    const r = toPublicVerificationReadModel("missing-cert", port);
    expect(r.ok).toBe(false);
    expect(r.privateExposed).toBe(false);
    expect(r.public.verificationStatus).toBe("UNKNOWN");
    if (!r.ok) expect(r.reason).toBe("UNKNOWN_CERTIFICATE");
    expect(Object.keys(r.public).sort()).toEqual(
      [
        "certificateId",
        "courseDisplay",
        "issuedAt",
        "learnerDisplay",
        "revocationStatus",
        "verificationStatus",
      ].sort(),
    );
  });

  it("never presents revoked certificates as VALID", () => {
    const port = new InMemoryVerificationReadModelPort();
    port.seed({
      certificateId: "cert-1",
      learnerDisplay: "Learner A",
      courseDisplay: "Course A",
      issuedAt: "2026-01-01T00:00:00.000Z",
      revoked: true,
      private: {
        learnerInternalId: "secret-learner",
        enrollmentId: "secret-enroll",
        issuerActorId: "secret-issuer",
        rawEligibilitySnapshot: { score: 99 },
      },
    });
    const r = toPublicVerificationReadModel("cert-1", port);
    expect(r.ok).toBe(false);
    expect(r.public.verificationStatus).toBe("REVOKED");
    expect(r.public.verificationStatus).not.toBe("VALID");
    expect(r.privateExposed).toBe(false);
    expect(JSON.stringify(r)).not.toContain("secret-learner");
    expect(JSON.stringify(r)).not.toContain("secret-enroll");
  });

  it("returns public-safe VALID fields when a non-revoked record exists", () => {
    const port = new InMemoryVerificationReadModelPort();
    port.seed({
      certificateId: "cert-2",
      learnerDisplay: "Learner B",
      courseDisplay: "Course B",
      issuedAt: "2026-02-01T00:00:00.000Z",
      revoked: false,
      private: {
        learnerInternalId: "private-id",
        enrollmentId: "private-enroll",
        issuerActorId: "private-issuer",
        rawEligibilitySnapshot: { x: 1 },
      },
    });
    const r = toPublicVerificationReadModel("cert-2", port);
    expect(r.ok).toBe(true);
    expect(r.public.verificationStatus).toBe("VALID");
    expect(r.public.learnerDisplay).toBe("Learner B");
    expect(r.privateExposed).toBe(false);
    expect(JSON.stringify(r)).not.toContain("private-id");
  });

  it("fails closed when durable verification store is unavailable", () => {
    const r = toPublicVerificationReadModel("cert-x", new MissingDurableVerificationPort());
    expect(r.ok).toBe(false);
    expect(r.public.verificationStatus).toBe("UNKNOWN");
    if (!r.ok) expect(r.reason).toBe("MISSING_DURABLE_STORE");
  });
});
