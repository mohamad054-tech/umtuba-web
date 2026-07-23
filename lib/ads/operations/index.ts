/**
 * Ads Operations & Activation Foundation V1 — public operations surface.
 *
 * Contracts only. No production serving, billing, payments, or UI.
 */

export {
  ADS_OPERATIONS_STATE_AUTHORITY,
  ADS_OPERATIONS_STATE_CONTRACT_VERSION,
  ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE,
  ADS_PLATFORM_OPERATIONAL_STATES,
  evaluateAdsOperationalStateTransition,
  getAdsOperationalStateSnapshot,
  isAdsPlatformOperationalState,
} from "./operationsState";
export type {
  AdsOperationalStateSnapshot,
  AdsPlatformOperationalState,
} from "./operationsState";

export {
  ADS_FEATURE_FLAGS,
  ADS_FEATURE_FLAGS_CONTRACT_VERSION,
  ADS_FEATURE_FLAG_KEYS,
  evaluateAdsFeatureFlagChange,
  getAdsFeatureFlagsSnapshot,
  isAdsFeatureFlagEnabled,
} from "./featureFlags";
export type {
  AdsFeatureFlagKey,
  AdsFeatureFlagsSnapshot,
} from "./featureFlags";

export {
  ADS_KILL_SWITCHES,
  ADS_KILL_SWITCHES_CONTRACT_VERSION,
  ADS_KILL_SWITCH_KEYS,
  ADS_PERMANENTLY_ENGAGED_KILL_SWITCHES,
  evaluateAdsKillSwitchChange,
  getAdsKillSwitchesSnapshot,
  isAdsKillSwitchBlocking,
} from "./killSwitches";
export type {
  AdsKillSwitchKey,
  AdsKillSwitchState,
  AdsKillSwitchesSnapshot,
} from "./killSwitches";

export {
  ADS_READINESS_CONTRACT_VERSION,
  assertAdsNotProductionEligible,
  evaluateAdsOperationsReadiness,
} from "./readiness";
export type {
  AdsFoundationReadinessId,
  AdsReadinessReport,
} from "./readiness";

export {
  ADS_HEALTH_CONTRACT_VERSION,
  getAdsOperationsHealthReport,
} from "./health";
export type {
  AdsComponentHealth,
  AdsHealthComponentId,
  AdsHealthReport,
  AdsHealthStatus,
} from "./health";

export {
  ADS_OPS_AUDIT_CONTRACT_VERSION,
  ADS_OPS_AUDIT_EVENT_TYPES,
  appendAdsOpsAuditRecord,
  listAdsOpsAuditRecords,
  resetAdsOpsAuditRecordsForTests,
} from "./audit";
export type {
  AdsOpsAuditAppendInput,
  AdsOpsAuditEventType,
  AdsOpsAuditRecord,
} from "./audit";

export {
  ADS_ADMIN_OPS_CONTRACT_VERSION,
  getAdsAdminOperationsInspectionBundle,
  proposeAdsFeatureFlagChange,
  proposeAdsKillSwitchChange,
  proposeAdsOperationalStateChange,
} from "./adminContracts";
export type {
  AdsAdminOpsActorContext,
  AdsAdminOpsCommandResult,
} from "./adminContracts";

export const ADS_OPERATIONS_ACTIVATION_FOUNDATION_VERSION = "v1" as const;

export const ADS_OPERATIONS_ACTIVATION_AUTHORITY = {
  productionEnabled: false,
  productionAccepted: false,
  authoritativeProductionServing: false,
  billingEnabled: false,
  deliveryEnabled: false,
  mutatesDatabase: false,
  connectsPaymentProviders: false,
  enablesRealCampaignDelivery: false,
} as const;
