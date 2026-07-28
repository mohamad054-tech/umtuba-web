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
  type CommerceOrderMoneySnapshot,
} from "./commerceRevenueBridge";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";

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
  it("withholds unsupported payout values", () => {
    const vis = buildSellerRevenueBridgeVisibility({
      hasPaidOrdersInWindow: true,
    });
    expect(vis.financialLedgerConnected).toBe(true);
    expect(vis.payoutsEnabled).toBe(false);
    expect(vis.settlementDecompositionUnavailable).toBe(true);
    for (const key of BRIDGE_WITHHELD_SELLER_VALUES) {
      expect(vis.withheldUnsupportedValues).toContain(key);
    }
    expect(vis.summaryLines.join(" ")).not.toMatch(/available payout|net earnings/i);
  });

  it("exposes bounded admin bridge status without secrets", () => {
    const rows = buildAdminCommerceBridgeStatus();
    expect(rows.some((r) => r.label === "Bridge")).toBe(true);
    expect(rows.map((r) => r.value).join(" ")).not.toMatch(
      /SERVICE_ROLE_KEY|secret|password/i
    );
  });
});
