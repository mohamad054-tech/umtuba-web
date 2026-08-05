import { describe, expect, it } from "vitest";
import {
  BRIDGE_WITHHELD_SELLER_VALUES,
  buildAdminCommerceBridgeStatus,
  buildCommerceFinancialEvent,
  buildCommerceFinancialIdempotencyKey,
  buildSellerRevenueBridgeVisibility,
  COMMISSION_DECOMPOSITION_UNAVAILABLE,
  diagnoseCommerceRevenueBridge,
  dryRunHistoricalBridgeEligibility,
  planCommerceRevenueBridgePosting,
  rejectClientBridgeMoneyFields,
  resolveCommerceFinancialEligibility,
  resolveCommerceLivePayoutsEnabled,
  type CommerceOrderMoneySnapshot,
} from "./commerceRevenueBridge";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import {
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
} from "./sellerLivePayout";

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
const STORE_ID = "22222222-2222-4222-8222-222222222222";
const ATTEMPT_ID = "33333333-3333-4333-8333-333333333333";

function baseSnapshot(
  overrides: Partial<CommerceOrderMoneySnapshot> = {}
): CommerceOrderMoneySnapshot {
  return {
    orderId: ORDER_ID,
    storeId: STORE_ID,
    currency: "USD",
    subtotalMinor: 5000,
    discountTotalMinor: 500,
    taxTotalMinor: 200,
    shippingTotalMinor: 300,
    grandTotalMinor: 5000,
    paymentStatus: "paid",
    orderStatus: "confirmed",
    occurredAt: "2026-07-28T12:00:00.000Z",
    paymentAttemptId: ATTEMPT_ID,
    ...overrides,
  };
}

describe("commerce revenue bridge — canonical event", () => {
  it("builds a typed event from trusted order snapshots", () => {
    const built = buildCommerceFinancialEvent(baseSnapshot());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.event.sourceDomain).toBe("commerce");
    expect(built.event.version).toBe(1);
    expect(built.event.grossItemAmountMinor).toBe(5000);
    expect(built.event.discountAmountMinor).toBe(500);
    expect(built.event.taxAmountMinor).toBe(200);
    expect(built.event.deliveryAmountMinor).toBe(300);
    expect(built.event.grandTotalMinor).toBe(5000);
    expect(built.event.currency).toBe("USD");
    expect(built.event.financialEligibility).toBe(
      "eligible_for_capture_posting"
    );
    expect(built.event.commission.merchantAmountMinor).toBeNull();
    expect(built.event.commission.platformCommissionMinor).toBeNull();
  });

  it("rejects amount component / grand total mismatch", () => {
    const built = buildCommerceFinancialEvent(
      baseSnapshot({ grandTotalMinor: 4999 })
    );
    expect(built.ok).toBe(false);
    if (built.ok) return;
    expect(built.issue.code).toBe("amount_mismatch");
  });

  it("rejects invalid currency", () => {
    const built = buildCommerceFinancialEvent(
      baseSnapshot({ currency: "US" })
    );
    expect(built.ok).toBe(false);
  });
});

describe("commerce revenue bridge — payment eligibility", () => {
  it("treats confirmed unpaid as pending, not settlement", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "pending",
      orderStatus: "confirmed",
    });
    expect(r.eligibility).toBe("pending_payment");
    const built = buildCommerceFinancialEvent(
      baseSnapshot({ paymentStatus: "pending", paymentAttemptId: null })
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const plan = planCommerceRevenueBridgePosting(built.event);
    expect(plan.willPostLedger).toBe(false);
  });

  it("preserves authorized as status-only Sync", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "authorized",
      orderStatus: "confirmed",
    });
    expect(r.eligibility).toBe("authorized_status_only");
  });

  it("plans capture posting for paid orders", () => {
    const built = buildCommerceFinancialEvent(baseSnapshot());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const plan = planCommerceRevenueBridgePosting(built.event, {
      allocateSettlement: true,
    });
    expect(plan.willPostLedger).toBe(true);
    expect(plan.sync?.rpc).toBe(STORE_PAYMENT_SYNC_RPC);
    expect(plan.sync?.outcome).toBe("captured");
    expect(plan.settlement?.rpc).toBe(STORE_SETTLEMENT_RPC);
    expect(plan.settlement?.action).toBe("allocate");
    expect(plan.settlement?.amountFromOrderOnly).toBe(true);
  });

  it("excludes failed payments from seller-available funds", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "failed",
      orderStatus: "confirmed",
    });
    expect(r.eligibility).toBe("excluded_failed_payment");
  });

  it("fails closed on unknown payment state", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "mystery",
      orderStatus: "confirmed",
    });
    expect(r.eligibility).toBe("fail_closed_unknown");
  });
});

describe("commerce revenue bridge — cancellation / refund readiness", () => {
  it("unpaid cancellation yields no seller earnings", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "pending",
      orderStatus: "cancelled",
    });
    expect(r.eligibility).toBe("no_seller_earnings");
  });

  it("paid cancellation requires reversal, not deletion", () => {
    const r = resolveCommerceFinancialEligibility({
      paymentStatus: "paid",
      orderStatus: "cancelled",
    });
    expect(r.eligibility).toBe("requires_reversal_or_refund");
    expect(r.sourceEventType).toBe("order_cancelled_paid_reversal_required");
  });

  it("refund Sync plan uses compensating outcome", () => {
    const built = buildCommerceFinancialEvent(
      baseSnapshot({
        paymentStatus: "refunded",
        orderStatus: "refunded",
      })
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const plan = planCommerceRevenueBridgePosting(built.event);
    expect(plan.sync?.outcome).toBe("refunded");
  });
});

describe("commerce revenue bridge — commission", () => {
  it("never fabricates merchant amount when policy is missing", () => {
    expect(COMMISSION_DECOMPOSITION_UNAVAILABLE.policyStatus).toBe(
      "not_configured"
    );
    expect(COMMISSION_DECOMPOSITION_UNAVAILABLE.merchantAmountMinor).toBeNull();
    const built = buildCommerceFinancialEvent(baseSnapshot());
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.event.commission).toEqual(COMMISSION_DECOMPOSITION_UNAVAILABLE);
  });

  it("applies trusted commission policy without changing settlement posture", () => {
    const built = buildCommerceFinancialEvent(baseSnapshot(), {
      commissionPolicies: [
        {
          policyCode: "store.default.commission",
          version: 1,
          status: "active",
          currency: "USD",
          effectiveFrom: "2020-01-01T00:00:00.000Z",
          effectiveTo: null,
          basisKind: "merchandise_net",
          lines: [
            { role: "platform", bps: 1000 },
            { role: "seller", bps: 9000 },
          ],
        },
      ],
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.event.commission.policyStatus).toBe("applied");
    if (built.event.commission.policyStatus !== "applied") return;
    expect(built.event.commission.platformCommissionMinor).toBeGreaterThan(0);
    expect(built.event.commission.merchantAmountMinor).toBeGreaterThan(0);
    expect(
      (built.event.commission.platformCommissionMinor ?? 0) +
        (built.event.commission.merchantAmountMinor ?? 0)
    ).toBe(built.event.commission.basisMinor);
  });
});

describe("commerce revenue bridge — idempotency", () => {
  it("produces stable keys for retries", () => {
    const a = buildCommerceFinancialIdempotencyKey({
      orderId: ORDER_ID,
      sourceEventType: "payment_captured",
      paymentAttemptId: ATTEMPT_ID,
    });
    const b = buildCommerceFinancialIdempotencyKey({
      orderId: ORDER_ID,
      sourceEventType: "payment_captured",
      paymentAttemptId: ATTEMPT_ID,
    });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.sourceEventId).toContain(ORDER_ID);
  });
});

describe("commerce revenue bridge — client money rejection", () => {
  it("rejects client money fields", () => {
    const gate = rejectClientBridgeMoneyFields({
      orderId: ORDER_ID,
      grand_total_minor: 999,
    });
    expect(gate.ok).toBe(false);
  });

  it("allows identifier-only input", () => {
    expect(
      rejectClientBridgeMoneyFields({ orderId: ORDER_ID, allocateSettlement: false })
        .ok
    ).toBe(true);
  });
});

describe("commerce revenue bridge — reconciliation + backfill dry-run", () => {
  it("flags paid orders without capture events", () => {
    const issues = diagnoseCommerceRevenueBridge({
      orders: [
        {
          orderId: ORDER_ID,
          storeId: STORE_ID,
          paymentStatus: "paid",
          orderStatus: "confirmed",
          currency: "USD",
          grandTotalMinor: 5000,
          hasCaptureFinancialEvent: false,
        },
      ],
    });
    expect(
      issues.some((i) => i.code === "confirmed_paid_without_financial_event")
    ).toBe(true);
    expect(issues.some((i) => i.code === "missing_commission_policy")).toBe(
      true
    );
  });

  it("detects currency and amount mismatches", () => {
    const issues = diagnoseCommerceRevenueBridge({
      orders: [
        {
          orderId: ORDER_ID,
          storeId: STORE_ID,
          paymentStatus: "paid",
          orderStatus: "confirmed",
          currency: "USD",
          grandTotalMinor: 5000,
          hasCaptureFinancialEvent: true,
          captureAmountMinor: 4000,
          captureCurrency: "EUR",
        },
      ],
    });
    expect(issues.some((i) => i.code === "amount_mismatch")).toBe(true);
    expect(issues.some((i) => i.code === "currency_mismatch")).toBe(true);
  });

  it("dry-runs historical eligibility without posting", () => {
    const result = dryRunHistoricalBridgeEligibility([
      baseSnapshot({ paymentStatus: "paid" }),
      baseSnapshot({
        orderId: "44444444-4444-4444-8444-444444444444",
        paymentStatus: "pending",
      }),
      baseSnapshot({
        orderId: "55555555-5555-4555-8555-555555555555",
        paymentStatus: "failed",
      }),
    ]);
    expect(result.eligibleForCapturePosting).toBe(1);
    expect(result.pendingPayment).toBe(1);
    expect(result.excludedFailed).toBe(1);
    expect(
      result.issues.some((i) => i.code === "bridge_failure_review_required")
    ).toBe(true);
  });
});

describe("commerce revenue bridge — seller / admin visibility", () => {
  it("withholds unsupported payout values when trusted reads are absent", () => {
    const vis = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
    });
    expect(vis.financialLedgerConnected).toBe(true);
    expect(vis.payoutsEnabled).toBe(false);
    expect(vis.balanceVisibilityEnabled).toBe(false);
    expect(vis.payoutBalances).toBeNull();
    expect(vis.settlementDecompositionUnavailable).toBe(true);
    for (const key of BRIDGE_WITHHELD_SELLER_VALUES) {
      expect(vis.withheldUnsupportedValues).toContain(key);
    }
    expect(vis.capability).toBe("commerce.revenue.payout_balance_visibility_v1");
  });

  it("exposes trusted available / in-transit / completed balances without enabling bank payouts", () => {
    const vis = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
      payoutSummary: {
        storeId: STORE_ID,
        byCurrency: [
          {
            currency: "USD",
            availableMinor: 5000,
            inTransitMinor: 1500,
            completedMinor: 2000,
            availableCount: 1,
            inTransitCount: 1,
            completedCount: 1,
          },
          {
            currency: "EUR",
            availableMinor: 100,
            inTransitMinor: 0,
            completedMinor: 0,
            availableCount: 1,
            inTransitCount: 0,
            completedCount: 0,
          },
        ],
        failedEventCount: 2,
        bankPayoutsEnabled: false,
        capability: "commerce.settlement.seller_payout_read_model_v1",
      },
      payoutEligibility: {
        storeId: STORE_ID,
        eligibleForBalanceRead: true,
        hasAvailableForPayout: true,
        availableCaptureCount: 2,
        inTransitCaptureCount: 1,
        releaseCurrencyCount: 2,
        bankPayoutsEnabled: false,
        reasons: ["has_in_transit_payouts"],
        capability: "commerce.settlement.seller_payout_read_model_v1",
      },
    });

    expect(vis.payoutsEnabled).toBe(false);
    expect(vis.balanceVisibilityEnabled).toBe(true);
    expect(vis.payoutBalances?.source).toBe(
      "commerce.settlement.seller_payout_read_model_v1"
    );
    expect(vis.payoutBalances?.byCurrency).toEqual([
      {
        currency: "USD",
        availablePayoutMinor: 5000,
        inTransitMinor: 1500,
        completedMinor: 2000,
      },
      {
        currency: "EUR",
        availablePayoutMinor: 100,
        inTransitMinor: 0,
        completedMinor: 0,
      },
    ]);
    expect(vis.payoutBalances?.failedEventCount).toBe(2);
    expect(vis.payoutBalances?.hasAvailableForPayout).toBe(true);
    expect(vis.withheldUnsupportedValues).not.toContain("available_payout");
    expect(vis.withheldUnsupportedValues).not.toContain("seller_balance");
    expect(vis.withheldUnsupportedValues).toContain("commission");
    expect(vis.withheldUnsupportedValues).toContain("net_earnings");
    expect(vis.summaryLines.join(" ")).toMatch(/available 5000 USD minor/i);
    expect(vis.summaryLines.join(" ")).toMatch(/in-transit 1500 USD minor/i);
    expect(vis.summaryLines.join(" ")).toMatch(/completed 2000 USD minor/i);
    expect(vis.summaryLines.join(" ")).toMatch(/EUR/);
    expect(JSON.stringify(vis)).not.toMatch(
      /ueos_journal|request_fingerprint|bank_account|beneficiary/i
    );
  });

  it("fails closed on payout read unavailable and keeps balances withheld", () => {
    const vis = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
      payoutReadUnavailable: true,
    });
    expect(vis.balanceVisibilityEnabled).toBe(false);
    expect(vis.payoutBalances).toBeNull();
    expect(vis.payoutsEnabled).toBe(false);
    expect(vis.withheldUnsupportedValues).toContain("available_payout");
    expect(vis.summaryLines.join(" ")).toMatch(/fail closed/i);
  });

  it("payoutsEnabled remains false by default and true only when live path ready", () => {
    const off = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
    });
    expect(off.payoutsEnabled).toBe(false);
    expect(off.summaryLines.join(" ")).toMatch(/payoutsEnabled=false/);

    const on = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
      livePayoutsEnabled: true,
    });
    expect(on.payoutsEnabled).toBe(true);
    expect(on.summaryLines.join(" ")).toMatch(/payoutsEnabled=true/);

    expect(resolveCommerceLivePayoutsEnabled({})).toBe(false);
    expect(
      resolveCommerceLivePayoutsEnabled({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        SELLER_LIVE_PAYOUTS_ENABLED: "true",
        SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
          SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
        SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
        SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION:
          SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
      })
    ).toBe(true);
  });

  it("exposes bounded admin bridge status without secrets", () => {
    const rows = buildAdminCommerceBridgeStatus();
    expect(rows.some((r) => r.label === "Bridge")).toBe(true);
    expect(rows.map((r) => r.value).join(" ")).not.toMatch(
      /SERVICE_ROLE_KEY|secret|password/i
    );
    expect(rows.some((r) => r.label === "Payout balance visibility")).toBe(true);
  });
});
