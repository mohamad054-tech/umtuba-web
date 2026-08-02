/**
 * Focused tests — Purchase Stock Decrement Runtime V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import { STORE_COMMISSION_DECOMPOSITION_APPLY_RPC } from "./commissionDecompositionBridgeApply";
import { STORE_DIGITAL_ENTITLEMENT_GRANT_RPC } from "./digitalEntitlementGrant";
import {
  buildPurchaseStockDecrementEventKey,
  PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
} from "./purchaseStockDecrementFoundation";
import {
  decrementPurchaseStockAfterTrustedCapture,
  purchaseStockDecrementRuntimeScope,
  PURCHASE_STOCK_DECREMENT_RUNTIME_ID,
  STORE_PURCHASE_STOCK_DECREMENT_RPC,
} from "./purchaseStockDecrementRuntime";
import { applyVerifiedStorePaymentOutcome } from "./stripePaymentOutcomeApply";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260893_store_purchase_stock_decrement_runtime_v1.sql";
const ATTEMPT = "22222222-2222-4222-8222-222222222222";
const CAPTURE_KEY = "stripe:pi_test_1234567890abcdef:captured";
const CORR = "stripe-attempt-222222222222422282222222222222";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Purchase stock decrement runtime — migration contracts", () => {
  it("ships 20260893 with idempotency table, RPC, locks, and finite-only path", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260893_store_purchase_stock_decrement_runtime_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /create table if not exists public\.store_purchase_stock_decrement_events/
    );
    expect(sql).toMatch(/decrement_store_purchase_stock_after_capture/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/transition_inventory_reservation/);
    expect(sql).toMatch(/on_hand = on_hand -/);
    expect(sql).toMatch(/'physical',\s*'booking'/);
    expect(sql).toMatch(/'digital',\s*'service',\s*'subscription',\s*'bundle'/);
    expect(sql).toMatch(
      /grant execute on function public\.decrement_store_purchase_stock_after_capture\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.decrement_store_purchase_stock_after_capture\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/reservation store diverges from order store/);
    expect(sql).toMatch(/insufficient on_hand/);
    expect(sql).toMatch(/on_hand would go negative/);
    expect(sql).not.toMatch(/refund.*restock|cancel.*restock|warehouse_pick/i);
  });

  it("consumes reservation before on_hand decrement in SQL order", () => {
    const sql = read(MIGRATION);
    const consumeAt = sql.indexOf("transition_inventory_reservation");
    const decrementAt = sql.indexOf("on_hand = on_hand -");
    expect(consumeAt).toBeGreaterThan(0);
    expect(decrementAt).toBeGreaterThan(consumeAt);
  });
});

describe("Purchase stock decrement runtime — helpers", () => {
  it("exposes runtime scope and deterministic event keys", () => {
    const scope = purchaseStockDecrementRuntimeScope();
    expect(scope.runtimeId).toBe(PURCHASE_STOCK_DECREMENT_RUNTIME_ID);
    expect(scope.commitmentPoint).toBe(PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT);
    expect(scope.rpc).toBe(STORE_PURCHASE_STOCK_DECREMENT_RPC);
    expect(scope.ownsRefundRestock).toBe(false);
    expect(buildPurchaseStockDecrementEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:purchase_stock`
    );
  });

  it("maps successful finite decrement and idempotent replay", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        lines_decremented: 1,
        quantity_decremented: 2,
        reservations_consumed: 1,
      },
      error: null,
    }));
    const first = await decrementPurchaseStockAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("decremented");
    if (first.status === "decremented") {
      expect(first.quantityDecremented).toBe(2);
      expect(first.replayed).toBe(false);
    }
    expect(rpc).toHaveBeenCalledWith(STORE_PURCHASE_STOCK_DECREMENT_RPC, {
      p_payment_attempt_id: ATTEMPT,
      p_event_key: `${CAPTURE_KEY}:purchase_stock`,
      p_correlation_id: CORR,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        lines_decremented: 1,
        quantity_decremented: 2,
        reservations_consumed: 1,
      },
      error: null,
    } as never);
    const second = await decrementPurchaseStockAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("decremented");
    if (second.status === "decremented") expect(second.replayed).toBe(true);
  });

  it("maps digital/unlimited all-skip as noop and RPC failure as failed", async () => {
    const noopRpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        lines_decremented: 0,
        quantity_decremented: 0,
        reservations_consumed: 0,
      },
      error: null,
    }));
    const noop = await decrementPurchaseStockAfterTrustedCapture(
      { rpc: noopRpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(noop.status).toBe("noop");

    const failRpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "purchase stock decrement blocked: reservation store diverges from order store",
      },
    }));
    const failed = await decrementPurchaseStockAfterTrustedCapture(
      { rpc: failRpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(failed.status).toBe("failed");
    if (failed.status === "failed") {
      expect(failed.message).toMatch(/store diverges|insufficient|missing/i);
    }
  });
});

describe("Purchase stock decrement runtime — capture wiring", () => {
  it("runs after commission and before entitlement; gates release on failure", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false, event_id: "evt-1" }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        if (args?.p_action === "release") {
          return { data: { replayed: false, action: "release" }, error: null };
        }
        return { data: { replayed: false, action: "allocate" }, error: null };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_APPLY_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            policy_status: "not_configured",
            lifecycle_status: "not_configured",
            capture_amount_minor: 2500,
          },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_DECREMENT_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            lines_decremented: 1,
            quantity_decremented: 1,
            reservations_consumed: 1,
          },
          error: null,
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            entitlements_granted: 1,
            reservations_consumed: 0,
            fulfillment_marked: true,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.purchaseStock.status).toBe("decremented");
    expect(applied.entitlement.status).toBe("granted");
    expect(applied.release.status).toBe("released");
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_SETTLEMENT_RPC,
      STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
      STORE_PURCHASE_STOCK_DECREMENT_RPC,
      STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
      STORE_SETTLEMENT_RPC,
    ]);

    rpc.mockClear();
    rpc.mockImplementation((async (
      name: string,
      args?: Record<string, unknown>
    ) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        return { data: { replayed: false, action: "allocate" }, error: null };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_APPLY_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            policy_status: "not_configured",
            lifecycle_status: "not_configured",
            capture_amount_minor: 2500,
          },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_DECREMENT_RPC) {
        return {
          data: null,
          error: {
            message: "purchase stock decrement blocked: insufficient on_hand",
          },
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            entitlements_granted: 1,
            reservations_consumed: 0,
            fulfillment_marked: true,
          },
          error: null,
        };
      }
      return {
        data: null,
        error: { message: `unexpected ${name} ${args?.p_action}` },
      };
    }) as never);

    const failedStock = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(failedStock.ok).toBe(true);
    if (!failedStock.ok) return;
    expect(failedStock.purchaseStock.status).toBe("failed");
    expect(failedStock.release.status).toBe("skipped");
    expect(
      rpc.mock.calls.some(
        (c) => c[0] === STORE_SETTLEMENT_RPC && c[1]?.p_action === "release"
      )
    ).toBe(false);
  });

  it("skips purchase stock for non-captured outcomes and stays server-only", async () => {
    const rpc = vi.fn(async () => ({
      data: { replayed: false },
      error: null,
    }));
    const cancelled = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "cancelled",
        eventKey: "stripe:pi_x:cancelled",
        correlationId: CORR,
        providerReference: "pi_x",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.purchaseStock.status).toBe("skipped");
    expect(rpc).toHaveBeenCalledTimes(1);

    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).toMatch(/decrementPurchaseStockAfterTrustedCapture/);
    expect(apply).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/decrement_store_purchase_stock/);
  });
});
