/**
 * Commerce Commission Decomposition Bridge Apply V1.
 * Connects Commission Policy Activation into the Revenue Bridge.
 * Produces trusted decomposition for bridge events only.
 * Does NOT mutate settlement, payout, or wallet. No duplicate engine.
 */

import {
  COMMISSION_LAUNCH_CURRENCIES,
  COMMISSION_LAUNCH_POLICY_CODE,
  COMMISSION_POLICY_ACTIVATION_ID,
  applyLaunchCommissionPolicySeed,
  buildLaunchCommissionPolicy,
  isCommissionLaunchCurrency,
} from "./commissionPolicyActivation";
import {
  COMMISSION_POLICY_FOUNDATION_ID,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";
import {
  COMMISSION_DECOMPOSITION_UNAVAILABLE,
  buildCommerceFinancialEvent,
  resolveCommissionForOrderSnapshot,
  type CommerceCommissionDecomposition,
  type CommerceFinancialEvent,
  type CommerceOrderMoneySnapshot,
  type CommerceRevenueReconciliationIssue,
} from "./commerceRevenueBridge";

export const COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID =
  "commerce.revenue.commission_decomposition_bridge_apply_v1" as const;

/**
 * Trusted policy set for bridge apply = activation launch contracts.
 * Pure / deterministic — mirrors Activation seed; no client rates.
 */
export function listActivationCommissionPoliciesForBridge(): CommissionPolicyContract[] {
  return applyLaunchCommissionPolicySeed([]).policies;
}

export function resolveTrustedCommissionPoliciesForBridge(
  override?: CommissionPolicyContract[] | null
): CommissionPolicyContract[] {
  if (override === null) return [];
  if (override !== undefined) return override;
  return listActivationCommissionPoliciesForBridge();
}

/**
 * Apply activation-aware commission resolution for a trusted order snapshot.
 */
export function applyCommissionDecompositionForBridge(input: {
  snapshot: CommerceOrderMoneySnapshot;
  /** Override policies (tests / ops). undefined → activation launch set. */
  commissionPolicies?: CommissionPolicyContract[] | null;
}): CommerceCommissionDecomposition {
  return resolveCommissionForOrderSnapshot({
    snapshot: input.snapshot,
    policies: resolveTrustedCommissionPoliciesForBridge(
      input.commissionPolicies
    ),
  });
}

/**
 * Build a Revenue Bridge financial event with activation commission wired in.
 * Settlement / payout posting plans remain unchanged (decomposition metadata only).
 */
export function buildCommerceFinancialEventWithCommissionApply(
  snapshot: CommerceOrderMoneySnapshot,
  options?: { commissionPolicies?: CommissionPolicyContract[] | null }
):
  | { ok: true; event: CommerceFinancialEvent }
  | {
      ok: false;
      message: string;
      issue: CommerceRevenueReconciliationIssue;
    } {
  return buildCommerceFinancialEvent(snapshot, {
    commissionPolicies: resolveTrustedCommissionPoliciesForBridge(
      options?.commissionPolicies
    ),
  });
}

export function assertCommissionDecompositionConservesBasis(
  decomposition: CommerceCommissionDecomposition
): { ok: true } | { ok: false; message: string } {
  if (decomposition.policyStatus !== "applied") {
    return { ok: true };
  }
  const total =
    decomposition.platformCommissionMinor +
    decomposition.merchantAmountMinor +
    decomposition.supplierAmountMinor +
    decomposition.affiliateAmountMinor +
    decomposition.partnerAmountMinor;
  if (total !== decomposition.basisMinor) {
    return {
      ok: false,
      message: `Commission parts ${total} do not equal basis ${decomposition.basisMinor}.`,
    };
  }
  return { ok: true };
}

export function commissionDecompositionBridgeApplyCompatibility(): {
  capability: typeof COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID;
  reusesFoundation: typeof COMMISSION_POLICY_FOUNDATION_ID;
  reusesActivation: typeof COMMISSION_POLICY_ACTIVATION_ID;
  mutatesSettlement: false;
  mutatesPayout: false;
  mutatesWallet: false;
  launchPolicyCode: typeof COMMISSION_LAUNCH_POLICY_CODE;
  launchCurrencies: readonly string[];
} {
  return {
    capability: COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID,
    reusesFoundation: COMMISSION_POLICY_FOUNDATION_ID,
    reusesActivation: COMMISSION_POLICY_ACTIVATION_ID,
    mutatesSettlement: false,
    mutatesPayout: false,
    mutatesWallet: false,
    launchPolicyCode: COMMISSION_LAUNCH_POLICY_CODE,
    launchCurrencies: COMMISSION_LAUNCH_CURRENCIES,
  };
}

export function commissionMissingPolicyIssueForCurrency(
  currency: string
): Extract<
  CommerceCommissionDecomposition,
  { policyStatus: "not_configured" }
> {
  if (isCommissionLaunchCurrency(currency)) {
    // Should not happen when activation policies are loaded — still fail closed.
    return {
      ...COMMISSION_DECOMPOSITION_UNAVAILABLE,
      message:
        "Commission policy expected for launch currency but resolution failed — fail closed.",
    };
  }
  return COMMISSION_DECOMPOSITION_UNAVAILABLE;
}

export { buildLaunchCommissionPolicy, isCommissionLaunchCurrency };
