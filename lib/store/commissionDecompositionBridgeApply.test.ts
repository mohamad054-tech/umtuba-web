import { describe, expect, it } from "vitest";
import {
  COMMISSION_LAUNCH_POLICY_CODE,
  COMMISSION_LAUNCH_POLICY_VERSION,
  buildLaunchCommissionPolicy,
} from "./commissionPolicyActivation";
import {
  COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID,
  applyCommissionDecompositionForBridge,
  assertCommissionDecompositionConservesBasis,
  buildCommerceFinancialEventWithCommissionApply,
  commissionDecompositionBridgeApplyCompatibility,
  listActivationCommissionPoliciesForBridge,
} from "./commissionDecompositionBridgeApply";
import {
  planCommerceRevenueBridgePosting,
  type CommerceOrderMoneySnapshot,
} from "./commerceRevenueBridge";
import type { CommissionPolicyContract } from "./commissionPolicyFoundation";

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function snapshot(
  overrides: Partial<CommerceOrderMoneySnapshot> = {}
): CommerceOrderMoneySnapshot {
  return {
    orderId: ORDER_ID,
    storeId: STORE_ID,
    currency: "USD",
    subtotalMinor: 10_000,
    discountTotalMinor: 0,
    taxTotalMinor: 0,
    shippingTotalMinor: 0,
    grandTotalMinor: 10_000,
    paymentStatus: "paid",
    orderStatus: "confirmed",
    occurredAt: "2026-07-01T00:00:00.000Z",
    paymentAttemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    ...overrides,
  };
}

function expectAppliedSplit(
  currency: string,
  basisMinor: number,
  expected: {
    platform: number;
    seller: number;
    supplier: number;
    affiliate?: number;
    partner?: number;
  }
) {
  const decomposition = applyCommissionDecompositionForBridge({
    snapshot: snapshot({
      currency,
      subtotalMinor: basisMinor,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      shippingTotalMinor: 0,
      grandTotalMinor: basisMinor,
    }),
  });
  expect(decomposition.policyStatus).toBe("applied");
  if (decomposition.policyStatus !== "applied") return;
  expect(decomposition.policyCode).toBe(COMMISSION_LAUNCH_POLICY_CODE);
  expect(decomposition.policyVersion).toBe(COMMISSION_LAUNCH_POLICY_VERSION);
  expect(decomposition.basisMinor).toBe(basisMinor);
  expect(decomposition.platformCommissionMinor).toBe(expected.platform);
  expect(decomposition.merchantAmountMinor).toBe(expected.seller);
  expect(decomposition.supplierAmountMinor).toBe(expected.supplier);
  expect(decomposition.affiliateAmountMinor).toBe(expected.affiliate ?? 0);
  expect(decomposition.partnerAmountMinor).toBe(expected.partner ?? 0);
  expect(assertCommissionDecompositionConservesBasis(decomposition)).toEqual({
    ok: true,
  });
}

describe("commission decomposition bridge apply — activation wiring", () => {
  it("lists activation launch policies for bridge", () => {
    const policies = listActivationCommissionPoliciesForBridge();
    expect(policies.map((p) => p.currency).sort()).toEqual(
      ["AED", "EGP", "EUR", "ILS", "JOD", "SAR", "USD"].sort()
    );
    expect(
      policies.every(
        (p) =>
          p.status === "active" && p.policyCode === COMMISSION_LAUNCH_POLICY_CODE
      )
    ).toBe(true);
  });

  it("declares compatibility without settlement/payout/wallet mutation", () => {
    const c = commissionDecompositionBridgeApplyCompatibility();
    expect(c.capability).toBe(COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID);
    expect(c.mutatesSettlement).toBe(false);
    expect(c.mutatesPayout).toBe(false);
    expect(c.mutatesWallet).toBe(false);
  });
});

describe("commission decomposition bridge apply — currencies", () => {
  it("USD active policy", () => {
    // 10000 → platform 1000, seller 8500, supplier 500
    expectAppliedSplit("USD", 10_000, {
      platform: 1000,
      seller: 8500,
      supplier: 500,
    });
  });

  it("EUR active policy", () => {
    expectAppliedSplit("EUR", 10_000, {
      platform: 1000,
      seller: 8500,
      supplier: 500,
    });
  });

  it("ILS active policy", () => {
    expectAppliedSplit("ILS", 10_000, {
      platform: 1000,
      seller: 8500,
      supplier: 500,
    });
  });

  it("unsupported currency fail-closed", () => {
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot({ currency: "ZAR" }),
    });
    expect(d.policyStatus).toBe("not_configured");
  });

  it("missing policy fail-closed when override empty", () => {
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot(),
      commissionPolicies: [],
    });
    expect(d.policyStatus).toBe("not_configured");
  });
});

describe("commission decomposition bridge apply — selection", () => {
  it("effective date selection", () => {
    const early: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      version: 1,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: "2026-06-01T00:00:00.000Z",
      lines: [
        { role: "platform", bps: 2000 },
        { role: "seller", bps: 8000 },
      ],
      description: "early window",
    };
    const late: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      version: 1,
      effectiveFrom: "2026-06-01T00:00:00.000Z",
      effectiveTo: null,
      lines: [
        { role: "platform", bps: 1000 },
        { role: "seller", bps: 9000 },
      ],
      description: "late window",
    };
    const before = applyCommissionDecompositionForBridge({
      snapshot: snapshot({ occurredAt: "2026-03-01T00:00:00.000Z" }),
      commissionPolicies: [early, late],
    });
    expect(before.policyStatus).toBe("applied");
    if (before.policyStatus === "applied") {
      expect(before.platformCommissionMinor).toBe(2000);
      expect(before.merchantAmountMinor).toBe(8000);
    }
    const after = applyCommissionDecompositionForBridge({
      snapshot: snapshot({ occurredAt: "2026-07-01T00:00:00.000Z" }),
      commissionPolicies: [early, late],
    });
    expect(after.policyStatus).toBe("applied");
    if (after.policyStatus === "applied") {
      expect(after.platformCommissionMinor).toBe(1000);
      expect(after.merchantAmountMinor).toBe(9000);
    }
  });

  it("version selection prefers higher version", () => {
    const v1: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      version: 1,
      lines: [
        { role: "platform", bps: 500 },
        { role: "seller", bps: 9500 },
      ],
    };
    const v2: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      version: 2,
      lines: [
        { role: "platform", bps: 1500 },
        { role: "seller", bps: 8500 },
      ],
    };
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot(),
      commissionPolicies: [v1, v2],
    });
    expect(d.policyStatus).toBe("applied");
    if (d.policyStatus !== "applied") return;
    expect(d.policyVersion).toBe(2);
    expect(d.platformCommissionMinor).toBe(1500);
    expect(d.merchantAmountMinor).toBe(8500);
  });
});

describe("commission decomposition bridge apply — totals / rounding / optionals", () => {
  it("decomposition totals equal merchandise_net basis", () => {
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot({
        subtotalMinor: 10_000,
        discountTotalMinor: 1000,
        taxTotalMinor: 500,
        shippingTotalMinor: 200,
        grandTotalMinor: 9700,
      }),
    });
    expect(d.policyStatus).toBe("applied");
    if (d.policyStatus !== "applied") return;
    expect(d.basisMinor).toBe(9000);
    expect(
      d.platformCommissionMinor +
        d.merchantAmountMinor +
        d.supplierAmountMinor +
        d.affiliateAmountMinor +
        d.partnerAmountMinor
    ).toBe(9000);
  });

  it("rounding remainder goes to seller", () => {
    // 101 basis → floor parts may leave remainder on seller
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot({
        subtotalMinor: 101,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
        grandTotalMinor: 101,
      }),
    });
    expect(d.policyStatus).toBe("applied");
    if (d.policyStatus !== "applied") return;
    expect(assertCommissionDecompositionConservesBasis(d)).toEqual({ ok: true });
    expect(d.platformCommissionMinor).toBe(10); // floor(101*1000/10000)
    expect(d.supplierAmountMinor).toBe(5); // floor(101*500/10000)
    expect(d.merchantAmountMinor).toBe(86); // remainder to seller
  });

  it("seller/platform/supplier split from launch activation", () => {
    expectAppliedSplit("USD", 2000, {
      platform: 200,
      seller: 1700,
      supplier: 100,
    });
  });

  it("affiliate optional when policy provides", () => {
    const withAffiliate: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      lines: [
        { role: "platform", bps: 1000 },
        { role: "seller", bps: 8000 },
        { role: "supplier", bps: 500 },
        { role: "affiliate", bps: 500 },
      ],
    };
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot(),
      commissionPolicies: [withAffiliate],
    });
    expect(d.policyStatus).toBe("applied");
    if (d.policyStatus !== "applied") return;
    expect(d.affiliateAmountMinor).toBe(500);
    expect(assertCommissionDecompositionConservesBasis(d)).toEqual({ ok: true });
  });

  it("partner optional when policy provides", () => {
    const withPartner: CommissionPolicyContract = {
      ...buildLaunchCommissionPolicy("USD"),
      lines: [
        { role: "platform", bps: 1000 },
        { role: "seller", bps: 8000 },
        { role: "supplier", bps: 500 },
        { role: "partner", bps: 500 },
      ],
    };
    const d = applyCommissionDecompositionForBridge({
      snapshot: snapshot(),
      commissionPolicies: [withPartner],
    });
    expect(d.policyStatus).toBe("applied");
    if (d.policyStatus !== "applied") return;
    expect(d.partnerAmountMinor).toBe(500);
    expect(assertCommissionDecompositionConservesBasis(d)).toEqual({ ok: true });
  });
});

describe("commission decomposition bridge apply — settlement regression", () => {
  it("does not change capture posting amount vs grand total", () => {
    const built = buildCommerceFinancialEventWithCommissionApply(snapshot());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.event.commission.policyStatus).toBe("applied");
    const plan = planCommerceRevenueBridgePosting(built.event, {
      allocateSettlement: true,
    });
    expect(plan.willPostLedger).toBe(true);
    // Sync/settlement use trusted grand total — not commission shares.
    expect(built.event.grandTotalMinor).toBe(10_000);
    expect(built.event.commission.basisMinor).toBe(10_000);
    expect(built.event.commission.merchantAmountMinor).not.toBe(
      built.event.grandTotalMinor
    );
  });

  it("feed Revenue Bridge only — financial event carries decomposition", () => {
    const built = buildCommerceFinancialEventWithCommissionApply(
      snapshot({ currency: "EUR" })
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.event.sourceDomain).toBe("commerce");
    expect(built.event.commission.policyStatus).toBe("applied");
    expect(built.event.currency).toBe("EUR");
  });
});
