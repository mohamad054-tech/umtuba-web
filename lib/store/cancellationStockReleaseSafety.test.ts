/**
 * Focused tests — Cancellation Stock Release & Safety Audit V1.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertSellerCancelAllowedForStockSafety,
  cancellationStockReleaseSafetyScope,
  CANCELLATION_STOCK_RELEASE_SAFETY_ID,
} from "./cancellationStockReleaseSafety";
import {
  sellerOrderStatusOptions,
  sellerTransitionPaymentBlocked,
} from "./sellerOrdersPresentation";
import { refundStockRestockRuntimeScope } from "./refundStockRestockRuntime";

const ROOT = join(__dirname, "../..");
const BASE = "supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql";
const PATCH =
  "supabase/migrations/20260895_store_cancellation_stock_release_safety_v1.sql";
const DECREMENT =
  "supabase/migrations/20260893_store_purchase_stock_decrement_runtime_v1.sql";
const RESTOCK =
  "supabase/migrations/20260894_store_purchase_stock_restock_runtime_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("Cancellation stock release safety — contracts", () => {
  it("exposes audit scope without owning cancel restock", () => {
    const scope = cancellationStockReleaseSafetyScope();
    expect(scope.id).toBe(CANCELLATION_STOCK_RELEASE_SAFETY_ID);
    expect(scope.releaseNeverIncrementsOnHand).toBe(true);
    expect(scope.ownsCancellationRestock).toBe(false);
    expect(scope.paidCancelRequiresRefundPath).toBe(true);
    expect(refundStockRestockRuntimeScope().ownsCancellationRestock).toBe(
      false
    );
  });

  it("blocks seller cancel for paid/authorized and consumed reservations", () => {
    expect(
      assertSellerCancelAllowedForStockSafety({ paymentStatus: "pending" }).ok
    ).toBe(true);
    expect(
      assertSellerCancelAllowedForStockSafety({ paymentStatus: "paid" })
    ).toMatchObject({ ok: false, code: "paid_cancel_forbidden" });
    expect(
      assertSellerCancelAllowedForStockSafety({
        paymentStatus: "authorized",
      })
    ).toMatchObject({ ok: false, code: "paid_cancel_forbidden" });
    expect(
      assertSellerCancelAllowedForStockSafety({
        paymentStatus: "pending",
        hasConsumedReservations: true,
      })
    ).toMatchObject({ ok: false, code: "consumed_reservations" });
  });

  it("blocks paid cancel in seller status menus; unpaid cancel stays available", () => {
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "paid",
        toStatus: "cancelled",
      }).blocked
    ).toBe(true);
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "authorized",
        toStatus: "cancelled",
      }).blocked
    ).toBe(true);
    expect(
      sellerTransitionPaymentBlocked({
        paymentStatus: "pending",
        toStatus: "cancelled",
      }).blocked
    ).toBe(false);

    const paidOptions = sellerOrderStatusOptions({
      status: "packed",
      paymentStatus: "paid",
    });
    expect(paidOptions.find((o) => o.value === "cancelled")?.paymentBlocked).toBe(
      true
    );
    const unpaidOptions = sellerOrderStatusOptions({
      status: "packed",
      paymentStatus: "pending",
    });
    expect(
      unpaidOptions.find((o) => o.value === "cancelled")?.paymentBlocked
    ).toBe(false);
  });
});

describe("Cancellation stock release safety — SQL contracts", () => {
  it("ships 20260895 patch with paid-cancel and paid-release guards", () => {
    expect(existsSync(join(ROOT, PATCH))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260895_store_cancellation_stock_release_safety_v1.sql"
    );
    const sql = read(PATCH);
    expect(sql).toMatch(/Cannot cancel a paid or authorized order/);
    expect(sql).toMatch(/use full-order refund path/);
    expect(sql).toMatch(/order_has_consumed_reservations/);
    expect(sql).toMatch(
      /Cannot release inventory reservations while order payment is paid or authorized/
    );
    expect(sql).toMatch(/security definer/i);
    expect(sql).not.toMatch(/on_hand\s*=\s*on_hand\s*\+/);
    expect(sql).not.toMatch(/restock_store_purchase_stock_after_refund/);
  });

  it("base cancel release never increments on_hand and never selects consumed", () => {
    const sql = read(BASE);
    const releaseStart = sql.indexOf(
      "create or replace function public.release_inventory_reservations_for_order"
    );
    const releaseEnd = sql.indexOf(
      "create or replace function public.order_has_consumed_reservations"
    );
    const release = sql.slice(releaseStart, releaseEnd);
    expect(release).toMatch(/status in \('active', 'pending_capture'\)/);
    expect(release).not.toMatch(/on_hand\s*=\s*on_hand\s*\+/);
    expect(release).not.toMatch(/'consumed'/);

    const transition = sql.slice(
      sql.indexOf(
        "create or replace function public.transition_inventory_reservation"
      )
    );
    expect(transition).toMatch(/Invalid reservation transition/);
    // consumed is terminal — not listed as a from→released edge beyond idempotent same-status.
    expect(transition).toMatch(
      /from_st = 'active' and p_to_status in \(\s*'pending_capture',\s*'consumed',\s*'released',\s*'expired'\s*\)/
    );
    expect(transition).not.toMatch(
      /from_st = 'consumed' and p_to_status in \(\s*'released'/
    );
  });

  it("buyer cancel stays unpaid-only; decrement/restock remain separate lifecycles", () => {
    const base = read(BASE);
    const buyer = base.slice(
      base.indexOf("create or replace function public.buyer_cancel_store_order")
    );
    expect(buyer).toMatch(
      /Only pending-payment orders can be cancelled by the buyer/
    );
    expect(buyer).toMatch(/order_has_consumed_reservations/);

    const decrement = read(DECREMENT);
    expect(decrement).toMatch(
      /purchase stock decrement blocked for closed orders/
    );
    expect(decrement).toMatch(/on_hand = on_hand -/);

    const restock = read(RESTOCK);
    expect(restock).toMatch(/requires a trusted refunded outcome event/);
    expect(restock).toMatch(
      /requires prior purchase stock decrement event/
    );
    expect(restock).toMatch(/on_hand = on_hand \+/);
  });
});
