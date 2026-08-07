/**
 * Deterministic reason codes for UM Core P15 capability assertion.
 *
 * CAPABILITY ASSERTION IS NOT USER AUTHORIZATION.
 * CAPABILITY ASSERTION IS NOT FLAG EVALUATION.
 */

export const UmCapabilityAssertionCode = {
  UNKNOWN: "capability.assertion.unknown",
  CATALOG_ENABLED: "capability.assertion.catalog_enabled",
  FLAG_ENABLED: "capability.assertion.flag_enabled",
  FLAG_DISABLED: "capability.assertion.flag_disabled",
  FLAG_UNRESOLVED: "capability.assertion.flag_unresolved",
  ELEVATED_UNGATED: "capability.assertion.elevated_ungated",
} as const;

export type UmCapabilityAssertionCodeName =
  (typeof UmCapabilityAssertionCode)[keyof typeof UmCapabilityAssertionCode];
