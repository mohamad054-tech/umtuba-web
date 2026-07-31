/**
 * AI Usage, Quotas & Billing Foundation V1 — contracts.
 * Estimated cost / quotas only. No Stripe, wallet, invoices, or live pricing.
 * Server-side only. Never store raw prompts or model outputs.
 */

export const AI_USAGE_FOUNDATION_SCHEMA_VERSION = 1 as const;
export const AI_USAGE_POLICY_VERSION = "usage-quotas-billing-foundation-v1";

export const AI_USAGE_UNIT_TYPES = [
  "request",
  "token",
  "character",
  "image",
  "audio_second",
  "video_second",
  "compute_millisecond",
  "custom_unit",
] as const;
export type AiUsageUnitType = (typeof AI_USAGE_UNIT_TYPES)[number];

export const AI_USAGE_EVENT_STATUSES = [
  "success",
  "failed",
  "cancelled",
  "timed_out",
  "rejected",
  "blocked",
] as const;
export type AiUsageEventStatus = (typeof AI_USAGE_EVENT_STATUSES)[number];

export const AI_USAGE_SOURCES = [
  "shared_ai_service",
  "shared_ai_gateway",
  "private_ai_invocation",
  "admin_diagnostics",
  "contract_test",
  "system",
] as const;
export type AiUsageSource = (typeof AI_USAGE_SOURCES)[number];

export type AiUsageCostTier =
  | "fixture_local"
  | "estimated"
  | "unavailable"
  | "zero"
  | "non_billable";

export type AiUsageFailureClass =
  | "none"
  | "pre_execution_reject"
  | "partial_execution"
  | "post_execution_failure"
  | "cancelled"
  | "timed_out"
  | "blocked"
  | "contract_test";

export type AiUsageLatencyMeta = {
  totalMs: number | null;
  providerMs: number | null;
  queueMs: number | null;
};

export type AiUsageEvent = {
  usageEventId: string;
  requestId: string;
  invocationId: string | null;
  idempotencyKey: string;
  capabilityId: string;
  providerId: string | null;
  runtimeId: string | null;
  modelId: string | null;
  tenantId: string;
  userId: string | null;
  sessionId: string | null;
  correlationId: string | null;
  status: AiUsageEventStatus;
  occurredAt: string;
  inputUnits: number;
  outputUnits: number;
  totalUnits: number;
  unitType: AiUsageUnitType;
  estimatedCostMinor: number | null;
  currency: string | null;
  costTier: AiUsageCostTier;
  latency: AiUsageLatencyMeta;
  retryCount: number;
  failureClass: AiUsageFailureClass;
  success: boolean;
  billable: boolean;
  countedTowardQuota: boolean;
  countedTowardBudget: boolean;
  source: AiUsageSource;
  auditEventId: string | null;
  policyVersion: string;
  priceVersion: string | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type AiQuotaLimitKind =
  | "per_request"
  | "user_daily"
  | "user_monthly"
  | "tenant_daily"
  | "tenant_monthly"
  | "capability"
  | "provider"
  | "runtime"
  | "anonymous";

export type AiQuotaResetPolicy =
  | "calendar_day_utc"
  | "calendar_month_utc"
  | "rolling_24h"
  | "rolling_30d"
  | "none";

export type AiQuotaPolicy = {
  policyId: string;
  version: string;
  displayName: string;
  unitType: AiUsageUnitType;
  limits: Partial<Record<AiQuotaLimitKind, number | null>>;
  burstLimit: number | null;
  softLimit: number | null;
  hardLimit: number | null;
  graceAllowance: number;
  resetPolicy: AiQuotaResetPolicy;
  allowAnonymous: boolean;
  exemptionPolicyIds: string[];
  enabled: boolean;
};

export type AiBudgetScope =
  | "user"
  | "tenant"
  | "capability"
  | "provider"
  | "daily"
  | "monthly";

export type AiOveragePolicy =
  | "deny"
  | "allow_with_warning"
  | "allow_within_grace"
  | "record_only";

export type AiBudgetPolicy = {
  policyId: string;
  version: string;
  displayName: string;
  currency: string;
  scopes: Partial<Record<AiBudgetScope, number | null>>;
  warningThresholdRatio: number;
  hardStopThresholdRatio: number;
  overagePolicy: AiOveragePolicy;
  sponsorshipMeta: { sponsorId: string | null; note: string | null };
  promotionalAllowanceMinor: number;
  enabled: boolean;
};

export type AiCostEstimationPolicy = {
  policyId: string;
  version: string;
  displayName: string;
  providerId: string | null;
  modelId: string | null;
  capabilityId: string | null;
  unitType: AiUsageUnitType;
  inputRatePerUnitMinor: number;
  outputRatePerUnitMinor: number;
  fixedRequestCostMinor: number;
  costTier: AiUsageCostTier;
  regionMultiplier: number;
  runtimeMultiplier: number;
  currency: string;
  effectiveFrom: string;
  priceVersion: string;
  pricingSource: "local_fixture";
  enabled: boolean;
};

export type AiFailureChargingPolicy =
  | "never"
  | "partial_units_only"
  | "full_estimated"
  | "fixed_request_only";

export type AiRetryChargingPolicy =
  | "charge_each_attempt"
  | "charge_final_only"
  | "never_charge_retries";

export type AiMeteringMode =
  | "per_request"
  | "per_unit"
  | "hybrid"
  | "non_metered";

export type AiCapabilityMeteringBinding = {
  quotaPolicyId: string;
  budgetPolicyId: string;
  usageUnitType: AiUsageUnitType;
  meteringMode: AiMeteringMode;
  billable: boolean;
  estimationPolicyId: string;
  failureChargingPolicy: AiFailureChargingPolicy;
  retryChargingPolicy: AiRetryChargingPolicy;
  visibilityToUser: boolean;
  adminOnlyUsage: boolean;
};

export type AiUsageExemption = {
  exemptionId: string;
  tenantId: string | null;
  userId: string | null;
  capabilityId: string | null;
  reason: string;
  expiresAt: string | null;
  enabled: boolean;
};

export type AiPreflightDecision =
  | "allowed"
  | "denied"
  | "allowed_with_warning";

export type AiQuotaEvaluationState = {
  currentUsage: number;
  remaining: number | null;
  softExceeded: boolean;
  hardExceeded: boolean;
  inGrace: boolean;
  resetAt: string | null;
  nextAvailableAt: string | null;
  appliedLimitKind: AiQuotaLimitKind | null;
  exemptionApplied: boolean;
};

export type AiBudgetEvaluationState = {
  currentSpendMinor: number;
  remainingMinor: number | null;
  warning: boolean;
  hardStop: boolean;
  overagePolicy: AiOveragePolicy;
  currency: string;
};

export type AiPreflightGateResult = {
  decision: AiPreflightDecision;
  allowed: boolean;
  quota: AiQuotaEvaluationState;
  budget: AiBudgetEvaluationState;
  remainingAllowance: number | null;
  resetAt: string | null;
  denialReason: string | null;
  warningReason: string | null;
  policyVersion: string;
  audit: {
    capabilityId: string;
    tenantId: string;
    userId: string | null;
    correlationId: string | null;
    evaluatedAt: string;
  };
};

export type AiUsageChargeIntent = {
  intentId: string;
  usageEventId: string;
  tenantId: string;
  estimatedCostMinor: number;
  currency: string;
  status: "disabled_non_executable";
  executable: false;
  revenueBridgeEnabled: false;
  createdAt: string;
  note: string;
};

export type AiUsagePermission =
  | "usage_record"
  | "usage_read_self"
  | "usage_read_tenant"
  | "usage_read_admin"
  | "quota_manage"
  | "budget_manage"
  | "pricing_manage"
  | "exemption_manage";

export type AiUsageActor = {
  userId: string | null;
  tenantId: string;
  permissions: AiUsagePermission[];
  isSystem?: boolean;
};

export type AiUserUsageViewModel = {
  tenantId: string;
  userId: string;
  todayUnits: number;
  monthUnits: number;
  remainingToday: number | null;
  remainingMonth: number | null;
  resetAt: string | null;
  warnings: string[];
  denialReason: string | null;
  currency: string | null;
  estimatedSpendMinorToday: number;
  estimatedSpendMinorMonth: number;
  policyVersion: string;
};

export type AiUsageAggregateBucket = {
  key: string;
  events: number;
  success: number;
  failure: number;
  totalUnits: number;
  estimatedCostMinor: number;
};

export type AiUsageAggregationReport = {
  byUser: AiUsageAggregateBucket[];
  byTenant: AiUsageAggregateBucket[];
  byCapability: AiUsageAggregateBucket[];
  byProvider: AiUsageAggregateBucket[];
  byModel: AiUsageAggregateBucket[];
  byRuntime: AiUsageAggregateBucket[];
  byDay: AiUsageAggregateBucket[];
  byMonth: AiUsageAggregateBucket[];
  totals: {
    events: number;
    success: number;
    failure: number;
    totalUnits: number;
    estimatedCostMinor: number;
    hardLimitDenials: number;
    warnings: number;
  };
};

export type AiUsageFoundationState = {
  schemaVersion: typeof AI_USAGE_FOUNDATION_SCHEMA_VERSION;
  usageEvents: AiUsageEvent[];
  quotaPolicies: AiQuotaPolicy[];
  budgetPolicies: AiBudgetPolicy[];
  costPolicies: AiCostEstimationPolicy[];
  exemptions: AiUsageExemption[];
  preflightDenials: Array<{
    at: string;
    tenantId: string;
    userId: string | null;
    capabilityId: string;
    reason: string;
    decision: AiPreflightDecision;
  }>;
};
