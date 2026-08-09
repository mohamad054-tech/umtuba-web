import { describe, expect, it } from "vitest";
import {
  InMemoryCertificatePersistence,
  MissingCertificatePersistence,
  getCertificate,
  issueCertificate,
  verifyCertificate,
} from "./certificationIssuanceServiceContract";

function failReason(
  r: ReturnType<typeof issueCertificate>,
): string | undefined {
  return r.ok ? undefined : r.reason;
}

describe("certification issuance service contract and test pack", () => {
  it("fails closed for unauthorized / invalid / ineligible / missing persistence", () => {
    const mem = new InMemoryCertificatePersistence();
    expect(
      failReason(
        issueCertificate(
          { actorAuthorized: false, learnerId: "L1", courseId: "C1", eligible: true },
          mem,
        ),
      ),
    ).toBe("UNAUTHORIZED");
    expect(
      failReason(
        issueCertificate(
          { actorAuthorized: true, learnerId: "", courseId: "C1", eligible: true },
          mem,
        ),
      ),
    ).toBe("INVALID_LEARNER");
    expect(
      failReason(
        issueCertificate(
          { actorAuthorized: true, learnerId: "L1", courseId: "", eligible: true },
          mem,
        ),
      ),
    ).toBe("INVALID_COURSE");
    expect(
      failReason(
        issueCertificate(
          { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: false },
          mem,
        ),
      ),
    ).toBe("NOT_ELIGIBLE");
    expect(
      failReason(
        issueCertificate(
          { actorAuthorized: true, learnerId: "L1", courseId: "C1", eligible: true },
          new MissingCertificatePersistence(),
        ),
      ),
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
    expect(failReason(second)).toBe("ALREADY_ISSUED");
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
