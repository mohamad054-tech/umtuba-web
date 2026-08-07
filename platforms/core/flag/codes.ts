/**
 * Deterministic feature flag registry finding codes (UM Core P8).
 */

export const UmFlagRegistryCode = {
  UNKNOWN_PLATFORM: "flag.registry.unknown_platform",
  MANIFEST_MISMATCH: "flag.registry.manifest_mismatch",
  DUPLICATE_FLAG_ID: "flag.registry.duplicate_id",
  PLATFORM_NAMESPACE: "flag.registry.platform_namespace",
  FLAG_ID_REQUIRED: "flag.registry.id_required",
  FLAG_ID_NAMING: "flag.registry.id_naming",
  OWNER_REF_REQUIRED: "flag.registry.owner_ref_required",
  DEFAULT_STATE_INVALID: "flag.registry.default_state_invalid",
  LINKED_CAPABILITY_UNKNOWN: "flag.registry.linked_capability_unknown",
  LINKED_CAPABILITY_OWNERSHIP: "flag.registry.linked_capability_ownership",
  ELEVATED_DEFAULT_ON: "flag.registry.elevated_default_on",
  ELEVATED_AUDIT_REQUIRED: "flag.registry.elevated_audit_required",
  REGISTERED: "flag.registry.registered",
} as const;

export type UmFlagRegistryCodeName =
  (typeof UmFlagRegistryCode)[keyof typeof UmFlagRegistryCode];
