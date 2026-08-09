/**
 * Deterministic finding codes for UM Core P20 fleet health aggregation.
 *
 * FLEET AGGREGATION IS NOT HEALTH MONITORING.
 * FLEET AGGREGATION IS NOT PROBE EXECUTION.
 * Namespace must not collide with health.registry.* (P10) or health.report.* (P17).
 */

export const UmFleetHealthAggregationCode = {
  PLATFORM_ID_REQUIRED: "health.fleet.platform_id_required",
  PLATFORM_ID_NAMING: "health.fleet.platform_id_naming",
  DUPLICATE_PLATFORM: "health.fleet.duplicate_platform",
  UNKNOWN_PLATFORM: "health.fleet.unknown_platform",
  STATUS_INVALID: "health.fleet.status_invalid",
  INPUT_INVALID: "health.fleet.input_invalid",
} as const;

export type UmFleetHealthAggregationCodeName =
  (typeof UmFleetHealthAggregationCode)[keyof typeof UmFleetHealthAggregationCode];
