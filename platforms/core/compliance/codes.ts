/**
 * Deterministic compliance finding codes (UM Core P3).
 *
 * Codes are stable machine identifiers for CI and diagnostics.
 */

export const UmComplianceCode = {
  VALIDATION_UPSTREAM_ERROR: "compliance.validation.upstream_error",
  ADMISSION_UPSTREAM_ERROR: "compliance.admission.upstream_error",

  MATURITY_LEVEL_INVALID: "compliance.maturity.level_invalid",
  MATURITY_PROTOTYPE_NOT_CERTIFIABLE:
    "compliance.maturity.prototype_not_certifiable",
  MATURITY_PRODUCTION_REQUIRED: "compliance.maturity.production_required",
  MATURITY_ECOSYSTEM_REQUIRED: "compliance.maturity.ecosystem_required",
  MATURITY_EXPERIMENTAL_SURFACE: "compliance.maturity.experimental_surface",

  OWNERSHIP_MISSING: "compliance.ownership.missing",
  SOT_MISSING: "compliance.ownership.sot_missing",
  NON_OWNERSHIP_MISSING: "compliance.ownership.non_ownership_missing",

  DOCUMENTATION_MISSING: "compliance.evidence.documentation_missing",
  HEALTH_REPORTING_REQUIRED: "compliance.health.reporting_required",
  HEALTH_PROBE_EVIDENCE_MISSING: "compliance.evidence.health_probe_missing",
  ELEVATED_FLAG_DEFAULT_ON: "compliance.flags.elevated_default_on",
  ELEVATED_FLAG_REQUIRED: "compliance.flags.elevated_required",

  EVIDENCE_BUNDLE_THIN: "compliance.evidence.bundle_thin",

  WAIVER_INCOMPLETE: "compliance.waiver.incomplete",
  WAIVER_EXPIRED: "compliance.waiver.expired",
  WAIVER_APPLIED: "compliance.waiver.applied",

  CERT_CORE_BLOCKED: "compliance.certification.core_blocked",
  CERT_PRODUCTION_BLOCKED: "compliance.certification.production_blocked",
  CERT_ENTERPRISE_BLOCKED: "compliance.certification.enterprise_blocked",
  CERT_LTS_BLOCKED: "compliance.certification.lts_blocked",
} as const;

export type UmComplianceCodeName =
  (typeof UmComplianceCode)[keyof typeof UmComplianceCode];
