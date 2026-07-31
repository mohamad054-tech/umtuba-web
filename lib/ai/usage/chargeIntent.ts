/**
 * Future revenue boundary — disabled and non-executable in V1.
 * No wallet deduction, Stripe, invoice, or payout.
 */

import type { AiUsageChargeIntent } from "./quotasBillingTypes";

export function createDisabledUsageChargeIntent(input: {
  usageEventId: string;
  tenantId: string;
  estimatedCostMinor: number;
  currency: string;
  nowIso?: string;
}): AiUsageChargeIntent {
  return {
    intentId: `intent_${input.usageEventId}`,
    usageEventId: input.usageEventId,
    tenantId: input.tenantId,
    estimatedCostMinor: input.estimatedCostMinor,
    currency: input.currency,
    status: "disabled_non_executable",
    executable: false,
    revenueBridgeEnabled: false,
    createdAt: input.nowIso ?? new Date().toISOString(),
    note: "AiUsageChargeIntent is a future boundary only. Not linked to Revenue Foundation payments.",
  };
}

export function executeUsageChargeIntent(
  _intent: AiUsageChargeIntent
): never {
  throw new Error(
    "AiUsageChargeIntent is disabled and non-executable in Usage Foundation V1."
  );
}

export function isRevenueBridgeAllowed(): false {
  return false;
}
