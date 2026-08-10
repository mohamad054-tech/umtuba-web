/**
 * Local fixture cost estimation — never claims live provider pricing.
 */

import { AiPlatformError } from "../contracts/errors";
import type {
  AiCostEstimationPolicy,
  AiUsageCostTier,
} from "./quotasBillingTypes";

export type CostEstimateInput = {
  policy: AiCostEstimationPolicy;
  inputUnits: number;
  outputUnits: number;
  requestCount?: number;
};

export type CostEstimateResult = {
  estimatedCostMinor: number;
  currency: string;
  costTier: AiUsageCostTier;
  priceVersion: string;
  pricingSource: "local_fixture";
};

export function validateCostPolicy(policy: AiCostEstimationPolicy): string[] {
  const errors: string[] = [];
  if (!policy.policyId.trim()) errors.push("policyId_required");
  if (policy.pricingSource !== "local_fixture") {
    errors.push("non_fixture_pricing_forbidden");
  }
  if (!policy.priceVersion.trim()) errors.push("price_version_required");
  if (!policy.currency.trim()) errors.push("currency_required");
  for (const n of [
    policy.inputRatePerUnitMinor,
    policy.outputRatePerUnitMinor,
    policy.fixedRequestCostMinor,
    policy.regionMultiplier,
    policy.runtimeMultiplier,
  ]) {
    if (!Number.isFinite(n) || n < 0) errors.push("invalid_rate");
  }
  return errors;
}

export function estimateUsageCost(input: CostEstimateInput): CostEstimateResult {
  const errors = validateCostPolicy(input.policy);
  if (errors.length > 0) {
    throw new AiPlatformError(
      "configuration_invalid",
      `Invalid cost policy: ${errors.join(",")}`
    );
  }
  if (
    !Number.isFinite(input.inputUnits) ||
    !Number.isFinite(input.outputUnits) ||
    input.inputUnits < 0 ||
    input.outputUnits < 0
  ) {
    throw new AiPlatformError("invalid_input", "Units must be non-negative.");
  }

  const requests = input.requestCount ?? 1;
  const raw =
    input.inputUnits * input.policy.inputRatePerUnitMinor +
    input.outputUnits * input.policy.outputRatePerUnitMinor +
    requests * input.policy.fixedRequestCostMinor;
  const estimatedCostMinor = Math.round(
    raw * input.policy.regionMultiplier * input.policy.runtimeMultiplier
  );

  return {
    estimatedCostMinor,
    currency: input.policy.currency,
    costTier: input.policy.costTier,
    priceVersion: input.policy.priceVersion,
    pricingSource: "local_fixture",
  };
}
