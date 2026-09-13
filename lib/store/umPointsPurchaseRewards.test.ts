import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getLocaleDirection, translate } from "../i18n";
import { createStoreUmPointsDemoLedger, STORE_UM_POINTS_DEMO_USER_ID } from "./umPointsPurchaseDemo";
import { StoreUmPointsPurchaseLedger } from "./umPointsPurchaseLedger";
import {
  computeEligibleProductSpend,
  estimateEarnablePoints,
  estimateEarnablePointsFromRetail,
  floorEligibleUsdToPoints,
  FUTURE_SPENT_POINTS_REFUND_POLICY,
  pointsFromPaidPurchase,
} from "./umPointsPurchaseRewards";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260917_store_um_points_purchase_rewards_v1.sql";
const USER_A = "user-a";
const USER_B = "user-b";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function paidUsd(productSubtotal: number, extra?: Partial<Parameters<StoreUmPointsPurchaseLedger["applyPurchaseEarn"]>[0]["spend"]>) {
  return {
    actorUserId: USER_A,
    userId: USER_A,
    orderId: extra && "orderId" in extra ? String((extra as { orderId?: string }).orderId) : "order-1",
    paymentReference: "pay-1",
    paymentStatus: "captured",
    spend: {
      productSubtotal,
      originalCurrency: "USD",
      ...extra,
    },
  };
}

describe("UM Points purchase formula", () => {
  it("1. $1 paid => +1", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn(paidUsd(1));
    expect(result.applied).toBe(true);
    expect(result.pointsDelta).toBe(1);
    expect(result.balance).toBe(1);
  });

  it("2. $27.40 paid => +27", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn(paidUsd(27.4));
    expect(result.pointsDelta).toBe(27);
    expect(floorEligibleUsdToPoints(27.4)).toBe(27);
  });

  it("3. $0.99 paid => +0", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn(paidUsd(0.99));
    expect(result.applied).toBe(true);
    expect(result.pointsDelta).toBe(0);
    expect(result.balance).toBe(0);
  });

  it("4. shipping excluded", () => {
    const spend = computeEligibleProductSpend({
      productSubtotal: 40,
      shipping: 8,
      originalCurrency: "USD",
    });
    expect(spend.ok).toBe(true);
    if (spend.ok) {
      expect(spend.eligibleUsd).toBe(40);
      expect(floorEligibleUsdToPoints(spend.eligibleUsd)).toBe(40);
    }
  });

  it("5. tax excluded", () => {
    const spend = computeEligibleProductSpend({
      productSubtotal: 40,
      tax: 7,
      originalCurrency: "USD",
    });
    expect(spend.ok).toBe(true);
    if (spend.ok) expect(spend.eligibleUsd).toBe(40);
  });

  it("6. discount reduces eligible spend", () => {
    const spend = computeEligibleProductSpend({
      productSubtotal: 40,
      discount: 5,
      shipping: 8,
      tax: 7,
      originalCurrency: "USD",
    });
    expect(spend.ok).toBe(true);
    if (spend.ok) {
      expect(spend.eligibleUsd).toBe(35);
      expect(floorEligibleUsdToPoints(spend.eligibleUsd)).toBe(35);
    }
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn({
      actorUserId: USER_A,
      userId: USER_A,
      orderId: "order-discount",
      paymentReference: "pay-disc",
      paymentStatus: "paid",
      spend: {
        productSubtotal: 40,
        discount: 5,
        shipping: 8,
        tax: 7,
        originalCurrency: "USD",
      },
    });
    expect(result.pointsDelta).toBe(35);
  });

  it("7. duplicate payment event => no duplicate points", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const first = ledger.applyPurchaseEarn(paidUsd(10));
    const second = ledger.applyPurchaseEarn({
      ...paidUsd(10),
      clientPointsDelta: 999,
    });
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(ledger.getBalance(USER_A)).toBe(10);
  });

  it("8. full refund => correct reversal", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    ledger.applyPurchaseEarn({
      ...paidUsd(50),
      orderId: "order-full",
      paymentReference: "cap-full",
    });
    const refund = ledger.applyRefundReversal({
      actorUserId: USER_A,
      userId: USER_A,
      orderId: "order-full",
      refundReference: "ref-full",
      refundedEligible: { productSubtotal: 50, originalCurrency: "USD" },
    });
    expect(refund.applied).toBe(true);
    expect(refund.pointsDelta).toBe(-50);
    expect(refund.event?.eventType).toBe("REFUND_REVERSAL");
    expect(ledger.getBalance(USER_A)).toBe(0);
  });

  it("9. partial refund => correct proportional floor reversal", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    ledger.applyPurchaseEarn({
      ...paidUsd(50),
      orderId: "order-partial",
      paymentReference: "cap-partial",
    });
    const refund = ledger.applyRefundReversal({
      actorUserId: USER_A,
      userId: USER_A,
      orderId: "order-partial",
      refundReference: "ref-12-75",
      refundedEligible: { productSubtotal: 12.75, originalCurrency: "USD" },
    });
    expect(refund.pointsDelta).toBe(-12);
    expect(refund.event?.eventType).toBe("PARTIAL_REFUND_REVERSAL");
    expect(ledger.getBalance(USER_A)).toBe(38);
  });

  it("10. duplicate refund event => no duplicate reversal", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    ledger.applyPurchaseEarn({
      ...paidUsd(50),
      orderId: "order-dup-refund",
      paymentReference: "cap-dup",
    });
    const input = {
      actorUserId: USER_A,
      userId: USER_A,
      orderId: "order-dup-refund",
      refundReference: "ref-dup",
      refundedEligible: { productSubtotal: 12.75, originalCurrency: "USD" },
    };
    const first = ledger.applyRefundReversal(input);
    const second = ledger.applyRefundReversal(input);
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(ledger.getBalance(USER_A)).toBe(38);
  });

  it("11. wrong user cannot access another user's ledger", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    ledger.applyPurchaseEarn(paidUsd(10));
    const denied = ledger.listForActor({ actorUserId: USER_B }, USER_A);
    expect(denied).toEqual({ denied: true, reason: "forbidden" });
    const crossWrite = ledger.applyPurchaseEarn({
      actorUserId: USER_B,
      userId: USER_A,
      orderId: "stolen",
      paymentStatus: "captured",
      spend: { productSubtotal: 99, originalCurrency: "USD" },
    });
    expect(crossWrite.applied).toBe(false);
    expect(crossWrite.reason).toBe("forbidden");
    expect(ledger.getBalance(USER_A)).toBe(10);
  });

  it("12. client cannot forge points", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn({
      ...paidUsd(1),
      clientPointsDelta: 10_000,
    });
    expect(result.pointsDelta).toBe(1);
    expect(ledger.getBalance(USER_A)).toBe(1);
  });

  it("13. failed/pending payment => 0", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    expect(
      ledger.applyPurchaseEarn({
        ...paidUsd(40),
        orderId: "pending",
        paymentStatus: "pending",
      }).pointsDelta
    ).toBe(0);
    expect(
      ledger.applyPurchaseEarn({
        ...paidUsd(40),
        orderId: "failed",
        paymentStatus: "failed",
      }).pointsDelta
    ).toBe(0);
    expect(ledger.getBalance(USER_A)).toBe(0);
  });

  it("14. cancelled order => 0", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn({
      ...paidUsd(40),
      orderId: "cancelled",
      paymentStatus: "captured",
      orderStatus: "cancelled",
    });
    expect(result.pointsDelta).toBe(0);
    expect(result.reason).toBe("cancelled_order");
    expect(ledger.getBalance(USER_A)).toBe(0);
  });

  it("15. non-USD conversion uses supplied authoritative FX value", () => {
    expect(
      computeEligibleProductSpend({
        productSubtotal: 10,
        originalCurrency: "EUR",
      }).ok
    ).toBe(false);

    const spend = computeEligibleProductSpend({
      productSubtotal: 10,
      originalCurrency: "EUR",
      fxUsdPerOriginalUnit: 1.1,
    });
    expect(spend.ok).toBe(true);
    if (spend.ok) {
      expect(spend.eligibleUsd).toBeCloseTo(11);
      expect(floorEligibleUsdToPoints(spend.eligibleUsd)).toBe(11);
    }

    const ledger = new StoreUmPointsPurchaseLedger();
    const result = ledger.applyPurchaseEarn({
      actorUserId: USER_A,
      userId: USER_A,
      orderId: "eur-1",
      paymentReference: "fx-1",
      paymentStatus: "paid",
      spend: {
        productSubtotal: 10,
        originalCurrency: "EUR",
        fxUsdPerOriginalUnit: 1.1,
      },
    });
    expect(result.pointsDelta).toBe(11);
    expect(result.event?.originalCurrency).toBe("EUR");
    expect(result.event?.eligibleSpendUsd).toBeCloseTo(11);
  });

  it("16. RTL / customer display works via localization (no one-language hard-code)", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(translate("en", "store.umPoints.bannerHeadline")).toBe(
      "SHOP MORE. EARN MORE."
    );
    expect(translate("ar", "store.umPoints.bannerHeadline")).toBe(
      "كل ما تتسوّق أكثر… تكسب أكثر!"
    );
    expect(translate("en", "store.umPoints.bannerPrimary")).toMatch(/\$1/);
    expect(translate("ar", "store.umPoints.bannerPrimary")).toMatch(/1 دولار/);
    expect(
      translate("en", "store.umPoints.earnWithPurchase", { values: { count: 27 } })
    ).toBe("Earn 27 UMTUBA Points with this purchase");
    expect(
      translate("ar", "store.umPoints.earnWithPurchase", { values: { count: 27 } })
    ).toBe("احصل على 27 نقطة أم طوبا عند شراء هذا المنتج");
    expect(
      translate("en", "store.umPoints.cartEstimate", { values: { count: 35 } })
    ).toBe("You'll earn approximately 35 UMTUBA Points with this order");
    expect(
      translate("ar", "store.umPoints.cartEstimate", { values: { count: 35 } })
    ).toBe("ستحصل على حوالي 35 نقطة أم طوبا من هذا الطلب");
    expect(translate("en", "store.umPoints.earnedConfirmed", { values: { count: 10 } })).toBe(
      "You earned 10 UMTUBA Points"
    );
    expect(translate("ar", "store.umPoints.earnedConfirmed", { values: { count: 10 } })).toBe(
      "لقد حصلت على 10 نقطة"
    );

    const banner = read("app/components/store/StoreUmPointsPromoBanner.tsx");
    expect(banner).toMatch(/store\.umPoints\.bannerHeadline/);
    expect(banner).not.toMatch(/SHOP MORE\. EARN MORE\./);
    expect(banner).not.toMatch(/كل ما تتسوّق أكثر/);
    expect(read("app/sandbox/store/cj-launch/page.tsx")).toMatch(
      /StoreUmPointsPromoBanner/
    );
    expect(read("app/sandbox/store/cj-launch/[slug]/page.tsx")).toMatch(
      /StoreUmPointsEarnHint/
    );
    expect(read("app/components/store/CartView.tsx")).toMatch(
      /StoreUmPointsCartEstimate/
    );
  });

  it("17. existing Store regression — cart/money helpers still hold", () => {
    expect(estimateEarnablePointsFromRetail({ amountMinor: 2740, currency: "USD" })).toBe(27);
    expect(estimateEarnablePointsFromRetail({ amountMinor: 99, currency: "USD" })).toBe(0);
    expect(
      estimateEarnablePointsFromRetail({
        amountMinor: 1000,
        currency: "EUR",
      })
    ).toBeNull();
    expect(
      estimateEarnablePoints({
        productSubtotal: 40,
        discount: 5,
        shipping: 8,
        tax: 7,
        originalCurrency: "USD",
      }).points
    ).toBe(35);
    expect(FUTURE_SPENT_POINTS_REFUND_POLICY).toContain("NEGATIVE");
  });
});

describe("UM Points purchase ledger extras", () => {
  it("allows a negative derived balance after reversals (future spend policy documented)", () => {
    const ledger = new StoreUmPointsPurchaseLedger();
    ledger.applyPurchaseEarn(paidUsd(5));
    const admin = ledger.applyAdminAdjustment({
      actorUserId: USER_A,
      userId: USER_A,
      adjustmentId: "adj-1",
      direction: "debit",
      reason: "foundation test",
      spend: { productSubtotal: 8, originalCurrency: "USD" },
    });
    expect(admin.applied).toBe(true);
    expect(ledger.getBalance(USER_A)).toBe(-3);
  });

  it("demo ledger is isolated TEST data and never awards on pending", () => {
    const demo = createStoreUmPointsDemoLedger();
    expect(demo.getBalance(STORE_UM_POINTS_DEMO_USER_ID)).toBe(35 - 12 + 10);
    const pending = pointsFromPaidPurchase({
      paymentStatus: "pending",
      spend: { productSubtotal: 99, originalCurrency: "USD" },
    });
    expect(pending.awarded).toBe(false);
    expect(pending.points).toBe(0);
  });
});

describe("UM Points purchase rewards candidate migration", () => {
  it("uses the next unused 20260917 number and does not collide", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_um_points_events/);
    expect(sql).toMatch(/idempotency_key/);
    expect(sql).toMatch(/PURCHASE_EARN/);
    expect(sql).toMatch(/REFUND_REVERSAL/);
    expect(sql).toMatch(/PARTIAL_REFUND_REVERSAL/);
    expect(sql).toMatch(/ADMIN_ADJUSTMENT/);
    expect(sql).toMatch(/award_um_points_to_user/);
    expect(sql).toMatch(/um_point_balances/);
    expect(sql).not.toMatch(
      /alter table public\.um_points_ledger|drop constraint[\s\S]{0,80}um_points_ledger/i
    );
    expect(sql).not.toMatch(/create table if not exists public\.um_point_balances/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.store_um_points_events from anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_um_points_event\(/
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_um_points_event\([\s\S]*?\) to service_role/
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.apply_store_um_points_event\([\s\S]{0,200}\) to authenticated/
    );
    expect(sql).toMatch(/grant execute on function public\.get_my_store_um_points_activity\(\) to authenticated/);
    expect(sql).not.toMatch(/p_points integer/);
    expect(sql).toMatch(/floor\(/);
    expect(sql).toMatch(/apply_store_payment_outcome/);
    expect(sql).not.toMatch(/create or replace function public\.apply_store_payment_outcome/);
  });

  it("does not enable CJ fulfillment or live payments", () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/CJ_ORDER_FULFILLMENT_ENABLED/);
    expect(sql).not.toMatch(/stripe/i);
  });
});
