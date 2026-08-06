/**
 * Deterministic validation finding codes for UM Core manifest validation (P2).
 *
 * Codes are stable machine identifiers for CI and diagnostics.
 * Spec / Standards refs are recorded on each finding at emit time.
 */

export const UmManifestValidationCode = {
  PLATFORM_ID_REQUIRED: "manifest.platform_id.required",
  PLATFORM_ID_NAMING: "manifest.platform_id.naming",
  PLATFORM_VERSION_REQUIRED: "manifest.platform_version.required",
  PLATFORM_VERSION_FORMAT: "manifest.platform_version.format",
  PLATFORM_DISPLAY_NAME_REQUIRED: "manifest.display_name.required",

  OWNERS_REQUIRED: "manifest.owners.required",
  OWNER_ID_REQUIRED: "manifest.owners.id.required",
  OWNER_DISPLAY_NAME_REQUIRED: "manifest.owners.display_name.required",

  SOT_STATEMENT_REQUIRED: "manifest.sot_statement.required",
  NON_OWNERSHIP_STATEMENT_REQUIRED: "manifest.non_ownership_statement.required",

  DOCUMENTATION_REFS_REQUIRED: "manifest.documentation_refs.required",
  MATURITY_LEVEL_INVALID: "manifest.maturity_level.invalid",

  HEALTH_REQUIRED: "manifest.health.required",
  HEALTH_REPORTS_STATUS_REQUIRED: "manifest.health.reports_status.required",

  MODULE_ID_REQUIRED: "manifest.modules.id.required",
  MODULE_ID_NAMING: "manifest.modules.id.naming",
  MODULE_ID_DUPLICATE: "manifest.modules.id.duplicate",
  MODULE_DISPLAY_NAME_REQUIRED: "manifest.modules.display_name.required",
  MODULE_CAPABILITY_REF_UNKNOWN: "manifest.modules.capability_ref.unknown",
  MODULE_CAPABILITY_REF_MISMATCH: "manifest.modules.capability_ref.mismatch",

  CAPABILITY_ID_REQUIRED: "manifest.capabilities.id.required",
  CAPABILITY_ID_NAMING: "manifest.capabilities.id.naming",
  CAPABILITY_ID_DUPLICATE: "manifest.capabilities.id.duplicate",
  CAPABILITY_DISPLAY_NAME_REQUIRED: "manifest.capabilities.display_name.required",
  CAPABILITY_MODULE_REQUIRED: "manifest.capabilities.module_id.required",
  CAPABILITY_MODULE_UNKNOWN: "manifest.capabilities.module_id.unknown",
  CAPABILITY_VERSION_REQUIRED: "manifest.capabilities.version.required",
  CAPABILITY_VERSION_FORMAT: "manifest.capabilities.version.format",
  CAPABILITY_STABILITY_INVALID: "manifest.capabilities.stability.invalid",
  CAPABILITY_SIDE_EFFECTS_REQUIRED: "manifest.capabilities.side_effects.required",
  CAPABILITY_SIDE_EFFECT_INVALID: "manifest.capabilities.side_effects.invalid",
  CAPABILITY_SIDE_EFFECT_DUPLICATE: "manifest.capabilities.side_effects.duplicate",
  CAPABILITY_ELEVATED_FLAG_REQUIRED: "manifest.capabilities.elevated_flag.required",
  CAPABILITY_FLAG_UNKNOWN: "manifest.capabilities.flag_id.unknown",
  CAPABILITY_PLATFORM_SCOPE: "manifest.capabilities.id.platform_scope",

  EVENT_TYPE_REQUIRED: "manifest.events.type.required",
  EVENT_TYPE_NAMING: "manifest.events.type.naming",
  EVENT_TYPE_DUPLICATE: "manifest.events.type.duplicate",
  EVENT_SCHEMA_VERSION_REQUIRED: "manifest.events.schema_version.required",
  EVENT_SCHEMA_VERSION_FORMAT: "manifest.events.schema_version.format",
  EVENT_STABILITY_INVALID: "manifest.events.stability.invalid",

  FLAG_ID_REQUIRED: "manifest.flags.id.required",
  FLAG_ID_NAMING: "manifest.flags.id.naming",
  FLAG_ID_DUPLICATE: "manifest.flags.id.duplicate",
  FLAG_DEFAULT_STATE_INVALID: "manifest.flags.default_state.invalid",
  FLAG_LINKED_CAPABILITY_UNKNOWN: "manifest.flags.linked_capability.unknown",

  DEPENDENCY_TARGET_KIND_INVALID: "manifest.requires.target_kind.invalid",
  DEPENDENCY_TARGET_ID_REQUIRED: "manifest.requires.target_id.required",
  DEPENDENCY_TARGET_ID_NAMING: "manifest.requires.target_id.naming",
  DEPENDENCY_STRENGTH_INVALID: "manifest.requires.strength.invalid",
  DEPENDENCY_REASON_REQUIRED: "manifest.requires.reason.required",
  DEPENDENCY_SELF_PLATFORM_CYCLE: "manifest.requires.self_platform_cycle",
  DEPENDENCY_DUPLICATE: "manifest.requires.duplicate",
  DEPENDENCY_CAPABILITY_UNKNOWN: "manifest.requires.capability_unknown",

  SIDE_EFFECT_SUMMARY_INVALID: "manifest.side_effect_summary.invalid",
  SIDE_EFFECT_SUMMARY_INCOMPLETE: "manifest.side_effect_summary.incomplete",
  SIDE_EFFECT_SUMMARY_EXTRA: "manifest.side_effect_summary.extra",

  NAV_CONTRIBUTION_ID_REQUIRED: "manifest.nav.id.required",
  NAV_CONTRIBUTION_ID_DUPLICATE: "manifest.nav.id.duplicate",
  NAV_CLASS_INVALID: "manifest.nav.class.invalid",
  NAV_CAPABILITY_UNKNOWN: "manifest.nav.capability_unknown",

  ADMISSION_MANIFEST_INVALID: "admission.manifest.invalid",
  ADMISSION_MATURITY_TOO_LOW: "admission.maturity.too_low",
} as const;

export type UmManifestValidationCodeName =
  (typeof UmManifestValidationCode)[keyof typeof UmManifestValidationCode];
