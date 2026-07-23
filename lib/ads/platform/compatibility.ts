/**
 * Ads Platform Compatibility Barrel — legacy / foundation APIs only.
 *
 * Quarantined exports. These are NOT the preferred Ads V1 stack path.
 *
 * Preferred canonical entrypoint:
 *   `runAdsStackPipelineV1` (from `./stackPipeline` / platform index)
 *
 * Preferred layer entries:
 *   `runAdsExecutionLayerV1`
 *   `runInternalDeliveryPilotV1`
 *   `prepareAdsMeasurementFromDeliveryV1`
 *
 * Import compatibility APIs explicitly:
 *   import * as adsPlatformCompatibility from "@/lib/ads/platform/compatibility"
 *   // or
 *   import { adsPlatformCompatibility } from "@/lib/ads/platform"
 *
 * Do not treat these as peers of the canonical V1 stack.
 */

export {
  ADS_EXECUTION_LAYER_CONTRACT_VERSION,
  ADS_EXECUTION_LAYER_ALLOWED_FIELDS,
  createEmptyAdsExecutionResult,
  runAdsExecutionLayer,
  validateAdsExecutionResult,
  type AdsExecutionResult,
  type AdsExecutionLayerInput,
  type AdsExecutionLayerOutcome,
} from "./executionLayerFoundation";

export {
  ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION,
  ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS,
  ADS_INTERNAL_DELIVERY_PILOT_INPUT_ALLOWED_FIELDS,
  ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS,
  createEmptyAdsInternalDeliveryPilotResult,
  runInternalDeliveryPilot,
  validateAdsInternalDeliveryPilotResult,
  type AdsInternalDeliveryPilotFailureReason,
  type AdsInternalDeliveryPilotInput,
  type AdsInternalDeliveryPilotOutcome,
  type AdsInternalDeliveryPilotResult,
} from "./internalDeliveryPilotFoundation";

export {
  prepareAdsMeasurementFoundation,
  type AdsMeasurementFoundationInput,
} from "./measurementFoundation";
