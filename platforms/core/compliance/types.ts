/**
 * Compliance and certification vocabulary (Standards §25–§26).
 *
 * P1: declarative contracts.
 * P3: pure compliance engine consumes/extends these types.
 */

import type { UmMaturityLevel } from "../maturity/types";
import type { UmPlatformId } from "../identity/types";
import type { UmValidationResult } from "../validation/interfaces";
import type { UmPlatformManifest } from "../manifest/types";

export type UmComplianceStatus =
  | "compliant"
  | "partially_compliant"
  | "non_compliant";

export type UmCertificationKind =
  | "core_certified"
  | "production_certified"
  | "enterprise_certified"
  | "long_term_supported";

export type UmComplianceSeverity = "info" | "warning" | "critical";

export type UmCertificationEligibility =
  | "eligible"
  | "not_eligible"
  | "blocked";

/**
 * Optional opaque platform metadata for compliance assessment.
 * Not executed — inspected only.
 */
export interface UmPlatformComplianceMetadata {
  readonly labels?: readonly string[];
  readonly notes?: string;
  /** Additional evidence references beyond manifest.documentationRefs. */
  readonly evidenceRefs?: readonly string[];
}

/**
 * Input to the pure compliance engine (P3).
 * Timestamps are pass-through only; the engine never reads the clock.
 */
export interface UmComplianceAssessmentInput {
  readonly manifest: UmPlatformManifest;
  /**
   * Upstream manifest validation result.
   * If omitted, the engine runs `validatePlatformManifest` in-process.
   */
  readonly validation?: UmValidationResult;
  /**
   * Upstream admission validation result.
   * If omitted, the engine runs `validateManifestAdmission` in-process.
   */
  readonly admission?: UmValidationResult;
  readonly waivers?: readonly UmComplianceWaiver[];
  readonly metadata?: UmPlatformComplianceMetadata;
  /** Optional assessment instant (ISO-8601). Used only for waiver expiry. */
  readonly assessedAt?: string;
}

export interface UmComplianceFinding {
  readonly code: string;
  readonly severity: UmComplianceSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

export interface UmComplianceWaiver {
  readonly waiverId: string;
  readonly reason: string;
  readonly ownerRef: string;
  readonly expiresAt: string;
  readonly riskClass: string;
  readonly compensatingControls: string;
  /** Machine finding codes this waiver suppresses when active. */
  readonly suppressesCodes?: readonly string[];
}

export interface UmComplianceEvidenceGap {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
  readonly requiredFor: readonly UmCertificationKind[];
}

export interface UmCertificationAssessment {
  readonly kind: UmCertificationKind;
  readonly eligibility: UmCertificationEligibility;
  readonly eligible: boolean;
  readonly blockingCodes: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly summary: string;
}

export type UmComplianceRecommendationCode =
  | "maintain"
  | "remediate_critical"
  | "remediate_warnings"
  | "gather_evidence"
  | "raise_maturity"
  | "not_ready";

export interface UmComplianceRecommendation {
  readonly code: UmComplianceRecommendationCode;
  readonly summary: string;
  readonly nextActions: readonly string[];
}

/**
 * Pure compliance assessment result (P3).
 * No persistence, networking, or runtime side effects.
 */
export interface UmComplianceResult {
  readonly platformId: UmPlatformId;
  readonly status: UmComplianceStatus;
  /** Integer score in [0, 100]. */
  readonly score: number;
  readonly maturityLevel: UmMaturityLevel;
  readonly maturityOk: boolean;
  readonly certificationStatus: readonly UmCertificationAssessment[];
  readonly criticalViolations: readonly UmComplianceFinding[];
  readonly warnings: readonly UmComplianceFinding[];
  readonly information: readonly UmComplianceFinding[];
  readonly missingRequiredEvidence: readonly UmComplianceEvidenceGap[];
  readonly failedStandards: readonly string[];
  readonly waivers: readonly UmComplianceWaiver[];
  readonly waivedFindingCodes: readonly string[];
  readonly recommendation: UmComplianceRecommendation;
  /** All findings (active + informational), deterministically ordered. */
  readonly findings: readonly UmComplianceFinding[];
  readonly assessedAt?: string;
}

/** Legacy declarative record shape (Standards §25) — still exported. */
export interface UmComplianceRecord {
  readonly platformId: UmPlatformId;
  readonly status: UmComplianceStatus;
  readonly maturityLevel: UmMaturityLevel;
  readonly findings: readonly UmComplianceFinding[];
  readonly waivers: readonly UmComplianceWaiver[];
  readonly assessedAt?: string;
}

export interface UmCertificationRecord {
  readonly platformId: UmPlatformId;
  readonly kind: UmCertificationKind;
  readonly grantedAt?: string;
  readonly expiresAt?: string;
  readonly evidenceRefs: readonly string[];
}

/**
 * Compliance engine port (P3).
 */
export interface UmComplianceEngine {
  assess(input: UmComplianceAssessmentInput): UmComplianceResult;
}
