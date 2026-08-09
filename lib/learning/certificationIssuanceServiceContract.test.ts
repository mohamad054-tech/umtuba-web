import { describe, expect, it } from "vitest";
import {
  InMemoryCertificatePersistence,
  MissingCertificatePersistence,
  getCertificate,
  issueCertificate,
  verifyCertificate,
} from "./certificationIssuanceServiceContract";

describe("certification issuance service contract and test pack", () => {
  it("fails closed for unauthorized / invalid / ineligible / missing persistence", () => {
    const mem = new InMemoryCertificatePersistence();
    expect(
      issueCertificate(
        { actorAuthorized: false, learnerId: "L1", courseId: "C1", eligible: true },
        mem,
      ).reason,
    ).toBe("UNAUTHORIZED");
    expect(
      issueCertificate(
        { actorAuthorized: true, learnerId: "", courseId: "C1", eligible: true },
        mem,
      ).reason,
    ).toBe("INVALID_LEARNER");
    expect(
      issueCertificate(
        { actorAuthorized: true, learnerId: "L1", courseId: "", eligible: true },
        mem,
      ).reason,
    ).toBe("INVALID_COURSE");
    expect(
      issueCertificate(
        { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: false },
        mem,
      ).reason,
    ).toBe("NOT_ELIGIBLE");
    expect(
      issueCertificate(
        { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: true },
        new MissingCertificatePersistence(),
      ).reason,
    ).toBe("MISSING_PERSISTENCE");
  });

  it("is idempotent: same learner/course does not create duplicate identities", () => {
    const mem = new InMemoryCertificatePersistence();
    const first = issueCertificate(
      { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: true },
      mem,
    );
    const second = issueCertificate(
      { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: true },
      mem,
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("ALREADY_ISSUED");
    expect(getCertificate("L1", "C1", mem)?.certificateId).toBe(
      first.ok ? first.certificateId : "",
    );
  });

  it("exposes get/verify ports without claiming durable production persistence", () => {
    const mem = new InMemoryCertificatePersistence();
    const issued = issueCertificate(
      { actorAuthorized: true, learnerId: "L2", courseId: "C2", eligible: true },
      mem,
    );
    expect(issued.ok && issued.durable === false).toBe(true);
    expect(verifyCertificate(issued.ok ? issued.certificateId : "", mem).valid).toBe(true);
  });
});
