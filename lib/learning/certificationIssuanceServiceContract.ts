/** Wave9 A1 — issuance service contract + ports/fakes (NO durable persistence). */
export type FailClosedReason =
  | "NOT_ELIGIBLE"
  | "ALREADY_ISSUED"
  | "INVALID_LEARNER"
  | "INVALID_COURSE"
  | "MISSING_PERSISTENCE"
  | "UNAUTHORIZED";

export type CertificateRecord = {
  certificateId: string;
  learnerId: string;
  courseId: string;
};

export interface CertificatePersistencePort {
  available: boolean;
  findActive(learnerId: string, courseId: string): CertificateRecord | null;
  save(record: CertificateRecord): CertificateRecord;
}

export type IssueRequest = {
  actorAuthorized: boolean;
  learnerId: string;
  courseId: string;
  eligible: boolean;
};

export type IssueResult =
  | { ok: true; certificateId: string; durable: false }
  | { ok: false; reason: FailClosedReason };

export class InMemoryCertificatePersistence implements CertificatePersistencePort {
  available = true;
  private store = new Map<string, CertificateRecord>();
  private key(learnerId: string, courseId: string) {
    return learnerId + "::" + courseId;
  }
  findActive(learnerId: string, courseId: string) {
    return this.store.get(this.key(learnerId, courseId)) ?? null;
  }
  save(record: CertificateRecord) {
    this.store.set(this.key(record.learnerId, record.courseId), record);
    return record;
  }
}

export class MissingCertificatePersistence implements CertificatePersistencePort {
  available = false;
  findActive() {
    return null;
  }
  save(record: CertificateRecord) {
    return record;
  }
}

export function issueCertificate(
  req: IssueRequest,
  port: CertificatePersistencePort,
): IssueResult {
  if (!req.actorAuthorized) return { ok: false, reason: "UNAUTHORIZED" };
  if (!req.learnerId) return { ok: false, reason: "INVALID_LEARNER" };
  if (!req.courseId) return { ok: false, reason: "INVALID_COURSE" };
  if (!req.eligible) return { ok: false, reason: "NOT_ELIGIBLE" };
  if (!port.available) return { ok: false, reason: "MISSING_PERSISTENCE" };
  const existing = port.findActive(req.learnerId, req.courseId);
  if (existing) return { ok: false, reason: "ALREADY_ISSUED" };
  const certificateId = "cert-" + req.learnerId + "-" + req.courseId;
  port.save({ certificateId, learnerId: req.learnerId, courseId: req.courseId });
  return { ok: true, certificateId, durable: false };
}

export function getCertificate(
  learnerId: string,
  courseId: string,
  port: CertificatePersistencePort,
): CertificateRecord | null {
  if (!port.available) return null;
  return port.findActive(learnerId, courseId);
}

export function verifyCertificate(
  certificateId: string,
  port: CertificatePersistencePort,
): { valid: boolean; reason?: FailClosedReason } {
  if (!port.available) return { valid: false, reason: "MISSING_PERSISTENCE" };
  // Fake verify: id prefix only — no durable store invention beyond port
  if (!certificateId.startsWith("cert-")) return { valid: false, reason: "INVALID_COURSE" };
  return { valid: true };
}
