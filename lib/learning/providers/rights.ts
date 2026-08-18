/**
 * Learning rights — unknown DENY. AI_USAGE_ALLOWED defaults FALSE.
 */

import { FORBIDDEN_THIRD_PARTY_BRAND_TOKENS } from "../../partners/types";
import type {
  LearningNormalizedCourse,
  LearningProvider,
  LearningProviderRight,
  LearningRightsRecord,
} from "./types";
import { LEARNING_PROVIDER_RIGHTS } from "./types";

export function emptyLearningRights(
  id: string,
  providerId: string,
  updatedAt: string
): LearningRightsRecord {
  return { id, providerId, grants: { AI_USAGE_ALLOWED: false }, updatedAt };
}

export function isLearningRightGranted(
  rights: LearningRightsRecord,
  right: LearningProviderRight
): boolean {
  return rights.grants[right] === true;
}

export type LearningRightsDecision =
  | { allowed: true }
  | {
      allowed: false;
      right: LearningProviderRight | "MOCK_ISOLATION" | "PROVIDER_DISABLED";
      reason: string;
    };

export function evaluateLearningRight(
  provider: LearningProvider,
  right: LearningProviderRight
): LearningRightsDecision {
  if (provider.status === "DISABLED" || provider.status === "REMOVED") {
    return {
      allowed: false,
      right: "PROVIDER_DISABLED",
      reason: "Provider is disabled or removed.",
    };
  }
  if (!isLearningRightGranted(provider.rights, right)) {
    return {
      allowed: false,
      right,
      reason: `${right} is not granted (unknown defaults to DENY).`,
    };
  }
  return { allowed: true };
}

export function containsForbiddenLearningToken(value: string | null | undefined): boolean {
  if (!value) return false;
  const hay = value.toLowerCase();
  return FORBIDDEN_THIRD_PARTY_BRAND_TOKENS.some((token) => hay.includes(token));
}

export function evaluateMetadataDisplay(provider: LearningProvider): LearningRightsDecision {
  return evaluateLearningRight(provider, "METADATA_DISPLAY_ALLOWED");
}

export function evaluateContentHosting(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}): LearningRightsDecision {
  if (input.provider.providerType === "UMTUBA_ORIGINAL") {
    return { allowed: true };
  }
  return evaluateLearningRight(input.provider, "CONTENT_HOSTING_ALLOWED");
}

export function evaluateEnrollmentRoute(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}): { route: "UMTUBA_ENROLL" | "EXTERNAL_ENROLL_URL" | "DENIED"; reason: string } {
  const enroll = evaluateLearningRight(input.provider, "ENROLLMENT_ALLOWED");
  if (!enroll.allowed) {
    return { route: "DENIED", reason: enroll.reason };
  }
  if (input.course.enrollmentModel === "external" && input.course.externalEnrollmentUrl) {
    return { route: "EXTERNAL_ENROLL_URL", reason: "External enrollment URL after rights recheck." };
  }
  return { route: "UMTUBA_ENROLL", reason: "UMTUBA enrollment after rights recheck." };
}

export function evaluateAiTutorIngest(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}): LearningRightsDecision {
  if (input.provider.providerType === "UMTUBA_ORIGINAL" && input.course.sourceType === "UMTUBA_ORIGINAL") {
    return isLearningRightGranted(input.provider.rights, "AI_USAGE_ALLOWED")
      ? { allowed: true }
      : {
          allowed: false,
          right: "AI_USAGE_ALLOWED",
          reason: "AI Tutor ingest requires AI_USAGE_ALLOWED even for UMTUBA originals.",
        };
  }
  if (input.provider.rights.grants.AI_USAGE_ALLOWED !== true) {
    return {
      allowed: false,
      right: "AI_USAGE_ALLOWED",
      reason: "AI Tutor cannot ingest partner or external content when AI_USAGE_ALLOWED is false.",
    };
  }
  return evaluateLearningRight(input.provider, "AI_USAGE_ALLOWED");
}

export function evaluateCertificateIssuance(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}): LearningRightsDecision {
  if (input.course.certificateOwnership !== "UMTUBA") {
    return {
      allowed: false,
      right: "CERTIFICATE_INTEGRATION_ALLOWED",
      reason: "UMTUBA cannot issue a certificate it does not own.",
    };
  }
  if (input.provider.providerType !== "UMTUBA_ORIGINAL") {
    const cert = evaluateLearningRight(input.provider, "CERTIFICATE_INTEGRATION_ALLOWED");
    if (!cert.allowed) return cert;
  }
  if (
    input.provider.providerType !== "UMTUBA_ORIGINAL" &&
    !isLearningRightGranted(input.provider.rights, "CERTIFICATE_INTEGRATION_ALLOWED")
  ) {
    return {
      allowed: false,
      right: "CERTIFICATE_INTEGRATION_ALLOWED",
      reason: "UMTUBA cannot issue a partner certificate without CERTIFICATE_INTEGRATION_ALLOWED.",
    };
  }
  return { allowed: true };
}

export function grantLearningRight(
  rights: LearningRightsRecord,
  right: LearningProviderRight,
  at: string
): LearningRightsRecord {
  return { ...rights, grants: { ...rights.grants, [right]: true }, updatedAt: at };
}

export function revokeLearningRight(
  rights: LearningRightsRecord,
  right: LearningProviderRight,
  at: string
): LearningRightsRecord {
  return { ...rights, grants: { ...rights.grants, [right]: false }, updatedAt: at };
}

export function requiredLearningRightsGranted(provider: LearningProvider): boolean {
  return isLearningRightGranted(provider.rights, "METADATA_DISPLAY_ALLOWED");
}

export function labelForProviderType(
  type: LearningProvider["providerType"]
): "Original" | "Partner" | "External" {
  if (type === "UMTUBA_ORIGINAL") return "Original";
  if (type === "PARTNER") return "Partner";
  return "External";
}

export { LEARNING_PROVIDER_RIGHTS, FORBIDDEN_THIRD_PARTY_BRAND_TOKENS };
