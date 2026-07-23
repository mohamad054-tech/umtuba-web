/**
 * Ads Platform Compatibility Barrel — non-authoritative helpers only.
 *
 * These APIs are NOT the production decision path.
 * Sole authoritative production decision entrypoint:
 *   `runAdsCanonicalStackV1` (from `./canonicalStack` / platform index)
 *
 * Compatibility / foundation helpers:
 *   - legacy execution / pilot / inventory / eligibility track
 *   - V1 execution / delivery / measurement / billing foundations
 *   - shorter select→measure stack pipeline
 *   - measurement event-flow reporting track
 *
 * Import explicitly:
 *   import * as adsPlatformCompatibility from "@/lib/ads/platform/compatibility"
 *   // or
 *   import { adsPlatformCompatibility } from "@/lib/ads/platform"
 *
 * None of these exports authorize production delivery, money movement, or
 * production billing. Kill switches remain false; results are diagnostic /
 * migration helpers only.
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
  prepareAdsMeasurementFromDeliveryV1,
  type AdsMeasurementFoundationInput,
  type AdsMeasurementDeliveryV1Input,
  type AdsMeasurementFoundationOutcome,
  type AdsMeasurementFoundationOptions,
} from "./measurementFoundation";

/** Non-authoritative V1 execution / delivery foundations. */
export * from "./executionLayer";
export * from "./internalDeliveryPilot";

/** Non-authoritative billing / charging foundations. */
export * from "./charging";
export * from "./billing";

/** Non-authoritative measurement reporting track (not delivery-decision). */
export * from "./measurementPipeline";
export * from "./measurementEventFlow";

/** Legacy shorter select→measure pipeline (pre-decision-foundation composition). */
export {
  ADS_STACK_PIPELINE_V1_CONTRACT_VERSION,
  ADS_STACK_PIPELINE_V1_INPUT_ALLOWED_FIELDS,
  ADS_STACK_PIPELINE_V1_STAGES,
  listAdsStackPipelineV1Stages,
  runAdsStackPipelineV1,
  validateAdsStackPipelineV1Result,
  type AdsStackPipelineV1Input,
  type AdsStackPipelineV1Outcome,
  type AdsStackPipelineV1Result,
  type AdsStackPipelineV1Stage,
} from "./stackPipeline";

/** Legacy eligibility / pilot / inventory track. */
export * from "./eligibilityRules";
export * from "./selectionResult";
export * from "./deliveryDecisionTrace";
export * from "./candidateInventory";
export * from "./selectableSet";
export * from "./pilotSelector";
export * from "./serveBoundary";
