/**
 * Local fixture policies for Usage/Quotas/Billing Foundation V1.
 * Rates are documented fixtures only — not live provider prices.
 */

import type {
  AiBudgetPolicy,
  AiCapabilityMeteringBinding,
  AiCostEstimationPolicy,
  AiQuotaPolicy,
  AiUsageExemption,
} from "./quotasBillingTypes";
import { AI_USAGE_POLICY_VERSION } from "./quotasBillingTypes";

export const DEFAULT_QUOTA_POLICY_ID = "quota.default.v1";
export const DEFAULT_BUDGET_POLICY_ID = "budget.default.v1";
export const DEFAULT_COST_POLICY_ID = "cost.fixture.default.v1";
export const NON_BILLABLE_COST_POLICY_ID = "cost.fixture.non_billable.v1";
export const ADMIN_QUOTA_POLICY_ID = "quota.admin.v1";
export const STRICT_QUOTA_POLICY_ID = "quota.strict.test.v1";

export function buildDefaultQuotaPolicies(): AiQuotaPolicy[] {
  return [
    {
      policyId: DEFAULT_QUOTA_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Default shared AI quota",
      unitType: "request",
      limits: {
        per_request: 1,
        user_daily: 100,
        user_monthly: 2000,
        tenant_daily: 5000,
        tenant_monthly: 50_000,
        capability: 10_000,
        provider: 20_000,
        runtime: 20_000,
        anonymous: 5,
      },
      burstLimit: 20,
      softLimit: 80,
      hardLimit: 100,
      graceAllowance: 5,
      resetPolicy: "calendar_day_utc",
      allowAnonymous: false,
      exemptionPolicyIds: ["exemption.admin.v1"],
      enabled: true,
    },
    {
      policyId: ADMIN_QUOTA_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Admin diagnostics quota",
      unitType: "request",
      limits: {
        per_request: 1,
        user_daily: 500,
        user_monthly: 10_000,
        tenant_daily: 20_000,
        tenant_monthly: 200_000,
        capability: 50_000,
        anonymous: 0,
      },
      burstLimit: 50,
      softLimit: 400,
      hardLimit: 500,
      graceAllowance: 10,
      resetPolicy: "calendar_day_utc",
      allowAnonymous: false,
      exemptionPolicyIds: ["exemption.admin.v1"],
      enabled: true,
    },
    {
      policyId: STRICT_QUOTA_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Strict test quota",
      unitType: "request",
      limits: {
        per_request: 1,
        user_daily: 3,
        user_monthly: 10,
        tenant_daily: 5,
        tenant_monthly: 20,
        capability: 10,
        anonymous: 0,
      },
      burstLimit: 2,
      softLimit: 2,
      hardLimit: 3,
      graceAllowance: 1,
      resetPolicy: "calendar_day_utc",
      allowAnonymous: false,
      exemptionPolicyIds: [],
      enabled: true,
    },
  ];
}

export function buildDefaultBudgetPolicies(): AiBudgetPolicy[] {
  return [
    {
      policyId: DEFAULT_BUDGET_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Default estimated budget",
      currency: "USD",
      scopes: {
        user: 5000,
        tenant: 100_000,
        capability: 50_000,
        provider: 50_000,
        daily: 2000,
        monthly: 50_000,
      },
      warningThresholdRatio: 0.8,
      hardStopThresholdRatio: 1,
      overagePolicy: "deny",
      sponsorshipMeta: { sponsorId: null, note: null },
      promotionalAllowanceMinor: 100,
      enabled: true,
    },
  ];
}

export function buildDefaultCostPolicies(): AiCostEstimationPolicy[] {
  return [
    {
      policyId: DEFAULT_COST_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Local fixture request estimate",
      providerId: null,
      modelId: null,
      capabilityId: null,
      unitType: "request",
      inputRatePerUnitMinor: 1,
      outputRatePerUnitMinor: 2,
      fixedRequestCostMinor: 5,
      costTier: "fixture_local",
      regionMultiplier: 1,
      runtimeMultiplier: 1,
      currency: "USD",
      effectiveFrom: "1970-01-01T00:00:00.000Z",
      priceVersion: "fixture-price-v1",
      pricingSource: "local_fixture",
      enabled: true,
    },
    {
      policyId: NON_BILLABLE_COST_POLICY_ID,
      version: AI_USAGE_POLICY_VERSION,
      displayName: "Non-billable fixture",
      providerId: null,
      modelId: null,
      capabilityId: null,
      unitType: "request",
      inputRatePerUnitMinor: 0,
      outputRatePerUnitMinor: 0,
      fixedRequestCostMinor: 0,
      costTier: "non_billable",
      regionMultiplier: 1,
      runtimeMultiplier: 1,
      currency: "USD",
      effectiveFrom: "1970-01-01T00:00:00.000Z",
      priceVersion: "fixture-price-nonbillable-v1",
      pricingSource: "local_fixture",
      enabled: true,
    },
  ];
}

export function buildDefaultExemptions(): AiUsageExemption[] {
  return [
    {
      exemptionId: "exemption.admin.v1",
      tenantId: null,
      userId: null,
      capabilityId: "platform.diagnostics_probe",
      reason: "Admin diagnostics exempt from soft limits",
      expiresAt: null,
      enabled: true,
    },
  ];
}

export function defaultMeteringBinding(opts?: {
  billable?: boolean;
  adminOnly?: boolean;
  quotaPolicyId?: string;
  visibilityToUser?: boolean;
}): AiCapabilityMeteringBinding {
  const billable = opts?.billable ?? true;
  return {
    quotaPolicyId: opts?.quotaPolicyId ?? DEFAULT_QUOTA_POLICY_ID,
    budgetPolicyId: DEFAULT_BUDGET_POLICY_ID,
    usageUnitType: "request",
    meteringMode: billable ? "per_request" : "non_metered",
    billable,
    estimationPolicyId: billable
      ? DEFAULT_COST_POLICY_ID
      : NON_BILLABLE_COST_POLICY_ID,
    failureChargingPolicy: "partial_units_only",
    retryChargingPolicy: "charge_final_only",
    visibilityToUser: opts?.visibilityToUser ?? true,
    adminOnlyUsage: opts?.adminOnly ?? false,
  };
}
