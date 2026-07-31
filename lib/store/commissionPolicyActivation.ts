/**
 * Commerce Commission Policy Activation V1.
 * Seeds safe default active policies for ledger-supported fiat currencies.
 * Does not overwrite existing active policies. Fail closed for unseeded currencies.
 * Does not enable payouts, Stripe, or settlement amount changes.
 */

import {
  COMMISSION_POLICY_BPS_SCALE,
  COMMISSION_POLICY_FOUNDATION_ID,
  calculateCommissionSplit,
  selectCommissionPolicy,
  validateCommissionPolicyContract,
  type CommissionPolicyContract,
  type CommissionPolicyLine,
} from "./commissionPolicyFoundation";

export const COMMISSION_POLICY_ACTIVATION_ID =
  "commerce.revenue.commission_policy_activation_v1" as const;

export const COMMISSION_POLICY_ACTIVATION_MIGRATION =
  "20260887_store_commission_policy_activation_v1.sql" as const;

/**
 * Launch currencies = UEOS `ueos_assets` fiat_minor + active
 * (20260822). Never invent currencies beyond this ledger set.
 */
export const COMMISSION_LAUNCH_CURRENCIES = [
  "USD",
  "EUR",
  "ILS",
  "JOD",
  "SAR",
  "AED",
  "EGP",
] as const;
export type CommissionLaunchCurrency =
  (typeof COMMISSION_LAUNCH_CURRENCIES)[number];

export const COMMISSION_LAUNCH_POLICY_CODE =
  "store.launch.commission.v1" as const;

export const COMMISSION_LAUNCH_POLICY_VERSION = 1 as const;

/** Safe launch split: platform 10% · seller 85% · supplier 5%. */
export const COMMISSION_LAUNCH_LINES: readonly CommissionPolicyLine[] = [
  { role: "platform", bps: 1000 },
  { role: "seller", bps: 8500 },
  { role: "supplier", bps: 500 },
  { role: "affiliate", bps: 0 },
  { role: "partner", bps: 0 },
] as const;

export const COMMISSION_LAUNCH_EFFECTIVE_FROM =
  "2026-01-01T00:00:00.000Z" as const;

export function isCommissionLaunchCurrency(
  currency: string
): currency is CommissionLaunchCurrency {
  const c = currency.trim().toUpperCase();
  return (COMMISSION_LAUNCH_CURRENCIES as readonly string[]).includes(c);
}

export function buildLaunchCommissionPolicy(
  currency: CommissionLaunchCurrency
): CommissionPolicyContract {
  return {
    policyCode: COMMISSION_LAUNCH_POLICY_CODE,
    version: COMMISSION_LAUNCH_POLICY_VERSION,
    status: "active",
    currency,
    effectiveFrom: COMMISSION_LAUNCH_EFFECTIVE_FROM,
    effectiveTo: null,
    basisKind: "merchandise_net",
    lines: [...COMMISSION_LAUNCH_LINES],
    description:
      "Launch default commission activation V1 (platform 10% / seller 85% / supplier 5%).",
  };
}

export function assertLaunchCommissionLinesIntegrity():
  | { ok: true }
  | { ok: false; message: string } {
  const sum = COMMISSION_LAUNCH_LINES.reduce((acc, l) => acc + l.bps, 0);
  if (sum !== COMMISSION_POLICY_BPS_SCALE) {
    return {
      ok: false,
      message: `Launch lines must sum to ${COMMISSION_POLICY_BPS_SCALE}, got ${sum}.`,
    };
  }
  const hasPlatform = COMMISSION_LAUNCH_LINES.some((l) => l.role === "platform");
  const hasSeller = COMMISSION_LAUNCH_LINES.some((l) => l.role === "seller");
  if (!hasPlatform || !hasSeller) {
    return {
      ok: false,
      message: "Launch lines require platform and seller roles.",
    };
  }
  return { ok: true };
}

/**
 * Idempotent pure seed: add launch policy only when currency has no active policy.
 * Never overwrites / mutates an existing active row.
 */
export function applyLaunchCommissionPolicySeed(
  existing: readonly CommissionPolicyContract[]
): {
  policies: CommissionPolicyContract[];
  inserted: CommissionLaunchCurrency[];
  skipped: Array<{ currency: CommissionLaunchCurrency; reason: string }>;
} {
  const linesOk = assertLaunchCommissionLinesIntegrity();
  if (!linesOk.ok) {
    throw new Error(linesOk.message);
  }

  const next = [...existing];
  const inserted: CommissionLaunchCurrency[] = [];
  const skipped: Array<{ currency: CommissionLaunchCurrency; reason: string }> =
    [];

  for (const currency of COMMISSION_LAUNCH_CURRENCIES) {
    const hasActive = next.some((p) => {
      const v = validateCommissionPolicyContract(p);
      return v.ok && v.policy.status === "active" && v.policy.currency === currency;
    });
    if (hasActive) {
      skipped.push({
        currency,
        reason: "active_policy_already_present",
      });
      continue;
    }
    const launch = buildLaunchCommissionPolicy(currency);
    const validated = validateCommissionPolicyContract(launch);
    if (!validated.ok) {
      skipped.push({ currency, reason: validated.message });
      continue;
    }
    next.push(validated.policy);
    inserted.push(currency);
  }

  return { policies: next, inserted, skipped };
}

/**
 * Detect conflicting active policies: more than one distinct policy_code
 * active for the same currency (ambiguous commercial truth).
 */
export function findConflictingActiveCommissionPolicies(
  policies: readonly CommissionPolicyContract[]
): Array<{ currency: string; policyCodes: string[] }> {
  const byCurrency = new Map<string, Set<string>>();
  for (const raw of policies) {
    const v = validateCommissionPolicyContract(raw);
    if (!v.ok || v.policy.status !== "active") continue;
    const set = byCurrency.get(v.policy.currency) ?? new Set<string>();
    set.add(v.policy.policyCode);
    byCurrency.set(v.policy.currency, set);
  }
  const conflicts: Array<{ currency: string; policyCodes: string[] }> = [];
  for (const [currency, codes] of byCurrency) {
    if (codes.size > 1) {
      conflicts.push({ currency, policyCodes: [...codes].sort() });
    }
  }
  return conflicts;
}

export function resolveLaunchAwareCommission(input: {
  policies: readonly CommissionPolicyContract[];
  currency: string;
  basisMinor: number;
  at?: string;
}): ReturnType<typeof calculateCommissionSplit> {
  const at = input.at ?? "2026-07-01T00:00:00.000Z";
  const selected = selectCommissionPolicy({
    policies: [...input.policies],
    currency: input.currency,
    at,
  });
  if (!selected.ok) return selected;
  return calculateCommissionSplit({
    policy: selected.policy,
    basisMinor: input.basisMinor,
    currency: input.currency,
  });
}

export function commissionActivationCompatibility(): {
  foundationId: typeof COMMISSION_POLICY_FOUNDATION_ID;
  activationId: typeof COMMISSION_POLICY_ACTIVATION_ID;
  inventsPayoutRails: false;
  inventsStripe: false;
  altersSettlementCaptureAmount: false;
} {
  return {
    foundationId: COMMISSION_POLICY_FOUNDATION_ID,
    activationId: COMMISSION_POLICY_ACTIVATION_ID,
    inventsPayoutRails: false,
    inventsStripe: false,
    altersSettlementCaptureAmount: false,
  };
}
