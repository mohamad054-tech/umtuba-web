/**
 * UMTUBA Ads Platform — public V1 surface.
 *
 * Sole authoritative production decision entrypoint:
 *   `runAdsCanonicalStackV1` (from `./canonicalStack`)
 *
 * Delivery, measurement-from-delivery, execution, billing, charging, and the
 * separate measurement-event-flow track are NOT flat-exported as authoritative
 * production entry points. Import them only via `adsPlatformCompatibility`
 * as non-authoritative foundation / migration helpers.
 *
 * Quarantined (compatibility only — not flat-exported):
 *   - runAdsExecutionLayer / runAdsExecutionLayerV1
 *   - runInternalDeliveryPilot / runInternalDeliveryPilotV1
 *   - prepareAdsMeasurementFoundation / prepareAdsMeasurementFromDeliveryV1
 *   - evaluateAdsBilling / charging helpers
 *   - measurementEventFlow / measurementPipeline
 *   - runAdsStackPipelineV1 (shorter legacy select→measure path)
 *   - eligibilityRules / selectionResult / deliveryDecisionTrace
 *   - candidateInventory / selectableSet / pilotSelector / serveBoundary
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
export * from "./taxonomy";
export * from "./taxonomyMapper";
export * from "./renderDescriptor";
export * from "./renderDescriptorPipeline";
export * from "./candidateSelection";
export * from "./candidateProvenance";
export * from "./selectionRenderAdapter";
export * from "./creativePlacementCompatibility";
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
/** Fraud & Invalid Traffic Foundation V1 — deterministic diagnostics only, kill switches off. */
export * from "./invalidTraffic";
export * from "./fraud";
/**
 * Measurement contract helpers only. Preparation from delivery / event-flow
 * orchestration is compatibility-quarantined (non-authoritative).
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
  type AdsMeasurementFoundationEventType,
  type AdsMeasurementFoundationTrustLevel,
  type AdsMeasurementFoundationPackage,
  type AdsMeasurementDeliveryV1Input,
  type AdsMeasurementFoundationOutcome,
  type AdsMeasurementFoundationOptions,
} from "./measurementFoundation";
/** Sole authoritative Ads V1 production decision entry (kill switches off). */
export * from "./canonicalStack";
/** Quarantined legacy / foundation / non-authoritative helpers. */
export * as adsPlatformCompatibility from "./compatibility";
