/**
 * Deterministic finding codes for UM Core P17 health report admission.
 *
 * HEALTH REPORTING IS NOT HEALTH DECLARATION REGISTRATION.
 * HEALTH REPORTING IS NOT PROBE EXECUTION.
 */

export const UmHealthReportCode = {
  PLATFORM_ID_REQUIRED: "health.report.platform_id_required",
  PLATFORM_ID_NAMING: "health.report.platform_id_naming",
  UNKNOWN_PLATFORM: "health.report.unknown_platform",
  STATUS_INVALID: "health.report.status_invalid",
  SNAPSHOT_INVALID: "health.report.snapshot_invalid",
} as const;

export type UmHealthReportCodeName =
  (typeof UmHealthReportCode)[keyof typeof UmHealthReportCode];
