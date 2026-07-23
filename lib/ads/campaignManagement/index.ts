/**
 * Ads Campaign Management Foundation V1 — contracts only.
 * No production serving, billing, payments, UI, or public endpoints.
 */

export {
  ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  ADS_CAMPAIGN_MANAGEMENT_CONTRACT_VERSION,
  assertCampaignManagementAuthorityClosed,
  freezeCampaignManagementAuthority,
} from "./authority";
export type { AdsCampaignManagementAuthority } from "./authority";

export {
  ADS_CAMPAIGN_LIFECYCLE_STATES,
  evaluateAdsCampaignLifecycleTransition,
  evaluateAdsCampaignServingEligibility,
  isAdsCampaignLifecycleState,
  listAdsCampaignLifecycleTransitions,
} from "./lifecycle";
export type { AdsCampaignLifecycleState } from "./lifecycle";

export {
  ADS_CAMPAIGN_BUDGET_CONTRACT_VERSION,
  ADS_CAMPAIGN_BUDGET_MAX_MINOR,
  ADS_CAMPAIGN_PACING_REFERENCES,
  evaluateAdsCampaignBudgetBillingExecution,
  parseAdsCampaignBudgetModel,
} from "./budget";
export type {
  AdsCampaignBudgetModel,
  AdsCampaignPacingReference,
} from "./budget";

export {
  ADS_CAMPAIGN_SCHEDULE_CONTRACT_VERSION,
  ADS_CAMPAIGN_RECURRENCE_PLACEHOLDERS,
  evaluateAdsCampaignScheduleActivation,
  parseAdsCampaignScheduleModel,
} from "./schedule";
export type {
  AdsCampaignRecurrencePlaceholder,
  AdsCampaignScheduleModel,
} from "./schedule";

export {
  ADS_CAMPAIGN_TARGETING_CONTRACT_VERSION,
  parseAdsCampaignPlacementConfiguration,
  parseAdsCampaignTargetingModel,
} from "./targeting";
export type { AdsCampaignTargetingModel } from "./targeting";

export {
  ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION,
  ADS_CAMPAIGN_CREATIVE_TYPES,
  parseAdsCampaignCreativeContract,
} from "./creative";
export type {
  AdsCampaignCreativeContract,
  AdsCampaignCreativeType,
} from "./creative";

export {
  ADS_CAMPAIGN_AD_SET_CONTRACT_VERSION,
  parseAdsCampaignAdSetContract,
} from "./adSet";
export type { AdsCampaignAdSetContract } from "./adSet";

export {
  ADS_CAMPAIGN_DOMAIN_CONTRACT_VERSION,
  parseAdsCampaignDomainContract,
} from "./campaign";
export type { AdsCampaignDomainContract } from "./campaign";

export {
  ADS_CAMPAIGN_VALIDATION_CONTRACT_VERSION,
  validateAdsCampaignLifecycleChange,
  validateAdsCampaignManagementBundle,
} from "./validation";
export type { AdsCampaignValidationReport } from "./validation";

export {
  ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION,
  inspectAdsCampaignManagementBundle,
  proposeAdsCampaignLifecycleTransition,
} from "./adminContracts";
export type {
  AdsCampaignAdminActorContext,
  AdsCampaignAdminInspectResult,
  AdsCampaignAdminTransitionResult,
} from "./adminContracts";
