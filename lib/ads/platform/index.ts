/**
 * UMTUBA Ads Platform — public V1 surface.
 *
 * Preferred canonical orchestration entry:
 *   `runAdsStackPipelineV1` (exported from `./stackPipeline`)
 *
 * Legacy foundation APIs are quarantined under the `adsPlatformCompatibility`
 * namespace — they are not flat peers of the canonical stack.
 *
 * Quarantined (compatibility only — not flat-exported):
 *   - runAdsExecutionLayer
 *   - runInternalDeliveryPilot
 *   - prepareAdsMeasurementFoundation
 */

export * from "./creativeContracts";
export * from "./placementRegistry";
export * from "./placementCompatibility";
export * from "./campaignContracts";
export * from "./placementResolutionContracts";
export * from "./reportingHandle";
export * from "./reportingHandleResolution";
export * from "./eventReportContracts";
export * from "./deliveryContracts";
export * from "./deliveryEligibilityContracts";
export * from "./deliverySelectionContracts";
export * from "./eligibilityRules";
export * from "./selectionResult";
export * from "./deliveryDecisionTrace";
export * from "./taxonomy";
export * from "./taxonomyMapper";
export * from "./renderDescriptor";
export * from "./renderDescriptorPipeline";
export * from "./candidateInventory";
export * from "./candidateSelection";
export * from "./candidateProvenance";
export * from "./selectionRenderAdapter";
export * from "./creativePlacementCompatibility";
export * from "./selectableSet";
export * from "./pilotSelector";
export * from "./serveBoundary";
/** Ranking & Scoring Foundation V1 — deterministic, non-auction, kill switches off. */
export * from "./scoring";
export * from "./ranking";
/** Budget & Pacing Foundation V1 — deterministic eligibility only, kill switches off. */
export * from "./budget";
export * from "./pacing";
/** Frequency Capping Foundation V1 — deterministic eligibility only, kill switches off. */
export * from "./frequency";
/** Auction Foundation V1 — deterministic winner selection only, kill switches off. */
export * from "./auction";
/** Billing & Charging Foundation V1 — eligibility + charge contracts only, kill switches off. */
export * from "./charging";
export * from "./billing";
/** Execution Layer V1 only (foundation via adsPlatformCompatibility). */
export * from "./executionLayer";
/** Internal Delivery Pilot V1 only (foundation via adsPlatformCompatibility). */
export * from "./internalDeliveryPilot";
/**
 * Canonical Measurement V1 contracts + prepareAdsMeasurementFromDeliveryV1.
 * Legacy prepareAdsMeasurementFoundation is NOT flat-exported — import it from
 * adsPlatformCompatibility only.
 */
export {
  ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
  ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES,
  ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
  ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
  ADS_MEASUREMENT_DELIVERY_V1_INPUT_ALLOWED_FIELDS,
  ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS,
  buildAdsMeasurementDedupeKey,
  validateAdsMeasurementFoundationPackage,
  prepareAdsMeasurementFromDeliveryV1,
  type AdsMeasurementFoundationEventType,
  type AdsMeasurementFoundationTrustLevel,
  type AdsMeasurementFoundationPackage,
  type AdsMeasurementDeliveryV1Input,
  type AdsMeasurementFoundationOutcome,
  type AdsMeasurementFoundationOptions,
} from "./measurementFoundation";
export * from "./measurementPipeline";
export * from "./measurementEventFlow";
/** Preferred canonical Ads V1 orchestration entry. */
export * from "./stackPipeline";
/** Quarantined legacy / foundation APIs — not the preferred path. */
export * as adsPlatformCompatibility from "./compatibility";
