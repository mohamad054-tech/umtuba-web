/**
 * Compliance and certification vocabulary (Standards §25–§26).
 * Declarative only — no scoring engine in P1.
 */

import type { UmMaturityLevel } from "../maturity/types";
import type { UmPlatformId } from "../identity/types";

export type UmComplianceStatus =
  | "compliant"
  | "partially_compliant"
  | "non_compliant";

export type UmCertificationKind =
  | "core_certified"
  | "production_certified"
  | "enterprise_certified"
  | "long_term_supported";

export interface UmComplianceRecord {
  readonly platformId: UmPlatformId;
  readonly status: UmComplianceStatus;
  readonly maturityLevel: UmMaturityLevel;
  readonly findings: readonly UmComplianceFinding[];
  readonly waivers: readonly UmComplianceWaiver[];
  readonly assessedAt?: string;
}

export interface UmComplianceFinding {
  readonly code: string;
  readonly severity: "info" | "warning" | "critical";
  readonly message: string;
  readonly standardRef?: string;
}

export interface UmComplianceWaiver {
  readonly waiverId: string;
  readonly reason: string;
  readonly ownerRef: string;
  readonly expiresAt: string;
  readonly riskClass: string;
  readonly compensatingControls: string;
}

export interface UmCertificationRecord {
  readonly platformId: UmPlatformId;
  readonly kind: UmCertificationKind;
  readonly grantedAt?: string;
  readonly expiresAt?: string;
  readonly evidenceRefs: readonly string[];
}
