/**
 * Deterministic finding codes for UM Core bounded health observation history (P22).
 *
 * BOUNDED HISTORY IS NOT LAST-SNAPSHOT SoT (P17).
 * BOUNDED HISTORY IS NOT DURABLE TELEMETRY / DB / EVENT STORE.
 * Namespace must not collide with health.registry.* (P10), health.report.* (P17),
 * or health.fleet.* (P20).
 */

export const UmHealthHistoryCode = {
  CAPACITY_INVALID: "health.history.capacity_invalid",
  PLATFORM_ID_REQUIRED: "health.history.platform_id_required",
  PLATFORM_ID_NAMING: "health.history.platform_id_naming",
  UNKNOWN_PLATFORM: "health.history.unknown_platform",
  STATUS_INVALID: "health.history.status_invalid",
  SNAPSHOT_INVALID: "health.history.snapshot_invalid",
} as const;

export type UmHealthHistoryCodeName =
  (typeof UmHealthHistoryCode)[keyof typeof UmHealthHistoryCode];
