/**
 * Deterministic platform registry finding codes (UM Core P4).
 */

export const UmRegistryCode = {
  DUPLICATE_PLATFORM_ID: "registry.platform.duplicate_id",
  MANIFEST_INVALID: "registry.manifest.invalid",
  VALIDATION_FAILED: "registry.validation.failed",
  COMPLIANCE_FAILED: "registry.compliance.failed",
  OWNERSHIP_MISSING: "registry.ownership.missing",
  CERTIFICATION_INELIGIBLE: "registry.certification.ineligible",
  MATURITY_TOO_LOW: "registry.maturity.too_low",
  REGISTERED: "registry.platform.registered",
} as const;

export type UmRegistryCodeName =
  (typeof UmRegistryCode)[keyof typeof UmRegistryCode];
