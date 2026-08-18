import type { SandboxCourse } from "../fixtures/types";

const FORBIDDEN_ISSUERS = [
  "coursera",
  "udemy",
  "edx",
  "datacamp",
  "futurelearn",
  "skillshare",
  "masterclass",
] as const;

export type CertificateDecision = {
  canIssue: boolean;
  issuer: string;
  owner: string;
  kind: "UMTUBA_SANDBOX_PREVIEW" | "DEMO_PROVIDER_PREVIEW" | "NONE";
  accreditationClaim: "NONE";
  forbiddenIssuer: boolean;
  reason: string;
};

export function isForbiddenCertificateIssuer(name: string): boolean {
  const needle = name.trim().toLowerCase();
  return FORBIDDEN_ISSUERS.some((issuer) => needle.includes(issuer));
}

export function certificateDecision(
  course: SandboxCourse,
  opts: { complete: boolean; enrolled: boolean }
): CertificateDecision {
  if (isForbiddenCertificateIssuer(course.certificateOwner) || isForbiddenCertificateIssuer(course.providerId)) {
    return {
      canIssue: false,
      issuer: "NONE",
      owner: course.certificateOwner,
      kind: "NONE",
      accreditationClaim: "NONE",
      forbiddenIssuer: true,
      reason: "Sandbox never issues Coursera, Udemy, edX, or other real-brand certificates.",
    };
  }

  if (course.enrollmentMode === "EXTERNAL_CONTINUE" || course.kind === "EXTERNAL_COURSE") {
    return {
      canIssue: false,
      issuer: "NONE",
      owner: course.certificateOwner,
      kind: "NONE",
      accreditationClaim: "NONE",
      forbiddenIssuer: false,
      reason: "External continue has no hosted certificate. Continue with provider does not mint a credential here.",
    };
  }

  if (!opts.enrolled) {
    return {
      canIssue: false,
      issuer: course.certificateOwner,
      owner: course.certificateOwner,
      kind: "NONE",
      accreditationClaim: "NONE",
      forbiddenIssuer: false,
      reason: "Not sandbox-enrolled. Complete enroll / mock payment first.",
    };
  }

  if (!opts.complete) {
    return {
      canIssue: false,
      issuer: course.certificateOwner,
      owner: course.certificateOwner,
      kind: "NONE",
      accreditationClaim: "NONE",
      forbiddenIssuer: false,
      reason: "Course is not complete. Finish lessons, quizzes, and the final assessment.",
    };
  }

  if (course.kind === "UMTUBA_ORIGINAL" && course.certificateOwner === "UMTUBA") {
    return {
      canIssue: true,
      issuer: "UMTUBA",
      owner: "UMTUBA",
      kind: "UMTUBA_SANDBOX_PREVIEW",
      accreditationClaim: "NONE",
      forbiddenIssuer: false,
      reason: "Sandbox preview certificate owned by UMTUBA. Not accreditation. Not a public credential.",
    };
  }

  if (course.kind === "PARTNER_COURSE") {
    return {
      canIssue: true,
      issuer: course.certificateOwner,
      owner: course.certificateOwner,
      kind: "DEMO_PROVIDER_PREVIEW",
      accreditationClaim: "NONE",
      forbiddenIssuer: false,
      reason: "Sandbox preview owned by the synthetic demo provider. Not a real partner certificate.",
    };
  }

  return {
    canIssue: false,
    issuer: "NONE",
    owner: course.certificateOwner,
    kind: "NONE",
    accreditationClaim: "NONE",
    forbiddenIssuer: false,
    reason: "No certificate path for this course kind.",
  };
}

export type SandboxCertificatePreview = {
  issuer: "UMTUBA";
  studentName: string;
  courseTitle: string;
  completionDate: string;
  certificateId: string;
  marking: "SANDBOX / DEMO";
  statement: string;
  accreditationClaim: "NONE";
  realCredential: false;
};

export function renderSandboxCertificate(input: {
  studentName: string;
  courseTitle: string;
  courseSlug: string;
  studentId: string;
  statement: string;
  issued: boolean;
}): SandboxCertificatePreview {
  return {
    issuer: "UMTUBA",
    studentName: input.studentName,
    courseTitle: input.courseTitle,
    completionDate: input.issued ? "2026-08-18" : "—",
    certificateId: `SANDBOX-${input.courseSlug}-${input.studentId}`,
    marking: "SANDBOX / DEMO",
    statement: input.statement,
    accreditationClaim: "NONE",
    realCredential: false,
  };
}
