/**
 * Focused tests — Refund Stock Restock Runtime V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import { STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC } from "./digitalEntitlementRevoke";
import { STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC } from "./commissionDecompositionBridgeApply";
import {
  buildRefundStockRestockEventKey,
  REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
} from "./refundStockRestockFoundation";
import {
  refundStockRestockRuntimeScope,
  restockPurchaseStockAfterTrustedRefund,
  REFUND_STOCK_RESTOCK_RUNTIME_ID,
  STORE_PURCHASE_STOCK_RESTOCK_RPC,
} from "./refundStockRestockRuntime";
import {
  applyFullOrderRefund,
  type TrustedFullOrderRefundContext,
} from "./fullOrderRefundPath";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260894_store_purchase_stock_restock_runtime_v1.sql";
const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const CAPTURE_KEY = "stripe:pi_refund_restock_capture_key_v1:captured";
const CORR = "stripe-attempt-333333333333433383333333333333";
const IDEM = "full-order-refund-restock-idem-0001";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function baseContext(
  overrides: Partial<TrustedFullOrderRefundContext> = {}
): TrustedFullOrderRefundContext {
  return {
    storeId: STORE,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    captureEventKey: CAPTURE_KEY,
    correlationId: CORR,
    amountMinor: 5000,
    currency: "USD",
    orderPaymentStatus: "paid",
    attemptStatus: "captured",
    settlementState: "UNALLOCATED",
    payoutState: "NONE",
    hasRefund: false,
    merchandiseNetMinor: 4500,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Refund stock restock runtime — migration contracts", () => {
  it("ships 20260894 with idempotency table, RPC, locks, prior-decrement gate", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260894_store_purchase_stock_restock_runtime_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /create table if not exists public\.store_purchase_stock_restock_events/
    );
    expect(sql).toMatch(/restock_store_purchase_stock_after_refund/);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/on_hand = on_hand \+/);
    expect(sql).toMatch(/'physical',\s*'booking'/);
    expect(sql).toMatch(/'digital',\s*'service',\s*'subscription',\s*'bundle'/);
    expect(sql).toMatch(
      /purchase stock restock requires prior purchase stock decrement event/
    );
    expect(sql).toMatch(
      /restock quantity % diverges from prior decrement %/
    );
    expect(sql).toMatch(/reservation store diverges from order store/);
    expect(sql).toMatch(
      /grant execute on function public\.restock_store_purchase_stock_after_refund\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.restock_store_purchase_stock_after_refund\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/requires a trusted refunded outcome event/);
    expect(sql).toMatch(/Partial refunds are out of scope/i);
    expect(sql).not.toMatch(/warehouse_pick|supplier_sync|partial_restock_qty/i);
  });

  it("documents concurrent serialization via advisory lock before idempotency read", () => {
    const sql = read(MIGRATION);
    const lockAt = sql.indexOf("pg_advisory_xact_lock");
    const existingAt = sql.indexOf(
      "from public.store_purchase_stock_restock_events"
    );
    expect(lockAt).toBeGreaterThan(0);
    expect(existingAt).toBeGreaterThan(lockAt);
  });
});

describe("Refund stock restock runtime — helpers", () => {
  it("exposes runtime scope and deterministic restock event keys", () => {
    const scope = refundStockRestockRuntimeScope();
    expect(scope.runtimeId).toBe(REFUND_STOCK_RESTOCK_RUNTIME_ID);
    expect(scope.commitmentPoint).toBe(REFUND_STOCK_RESTOCK_COMMITMENT_POINT);
    expect(scope.rpc).toBe(STORE_PURCHASE_STOCK_RESTOCK_RPC);
    expect(scope.ownsPartialRefundRestock).toBe(false);
    expect(buildRefundStockRestockEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:purchase_stock:restock`
    );
  });

  it("maps successful finite restock and idempotent retry", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        lines_restocked: 1,
        quantity_restocked: 2,
        prior_decrement_event_key: `${CAPTURE_KEY}:purchase_stock`,
      },
      error: null,
    }));
    const first = await restockPurchaseStockAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("restocked");
    if (first.status === "restocked") {
      expect(first.quantityRestocked).toBe(2);
      expect(first.replayed).toBe(false);
    }
    expect(rpc).toHaveBeenCalledWith(STORE_PURCHASE_STOCK_RESTOCK_RPC, {
      p_payment_attempt_id: ATTEMPT,
      p_event_key: `${CAPTURE_KEY}:purchase_stock:restock`,
      p_correlation_id: CORR,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        lines_restocked: 1,
        quantity_restocked: 2,
        prior_decrement_event_key: `${CAPTURE_KEY}:purchase_stock`,
      },
      error: null,
    } as never);
    const second = await restockPurchaseStockAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("restocked");
    if (second.status === "restocked") expect(second.replayed).toBe(true);
  });

  it("maps digital/unlimited prior-noop as noop", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        lines_restocked: 0,
        quantity_restocked: 0,
        prior_decrement_event_key: `${CAPTURE_KEY}:purchase_stock`,
      },
      error: null,
    }));
    const noop = await restockPurchaseStockAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(noop.status).toBe("noop");
  });

  it("maps missing decrement / wrong store / wrong reservation as failed", async () => {
    for (const message of [
      "purchase stock restock requires prior purchase stock decrement event",
      "purchase stock restock blocked: reservation store diverges from order store",
      "purchase stock restock blocked: inventory row missing for variant",
    ]) {
      const rpc = vi.fn(async () => ({
        data: null,
        error: { message },
      }));
      const failed = await restockPurchaseStockAfterTrustedRefund(
        { rpc } as never,
        {
          paymentAttemptId: ATTEMPT,
          captureEventKey: CAPTURE_KEY,
          correlationId: CORR,
        }
      );
      expect(failed.status).toBe("failed");
      if (failed.status === "failed") {
        expect(failed.message).toMatch(
          /prior purchase stock decrement|store diverges|missing/i
        );
      }
    }
  });

  it("SQL fail-closed paths cover double refund qty mismatch and rollback semantics", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/idempotency conflict for purchase stock restock/);
    expect(sql).toMatch(/restock quantity % diverges from prior decrement %/);
    expect(sql).toMatch(/reserved would exceed on_hand after restock/);
    // Exceptions abort the PL/pgSQL function → Postgres rolls back the xact.
    expect(sql).toMatch(/raise exception/i);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
  });
});

describe("Refund stock restock runtime — refund path wiring", () => {
  it("runs after Sync refunded and before entitlement revoke; fail-closed on restock error", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: { replayed: false, outcome: "refunded", event_key: IDEM },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            lines_restocked: 1,
            quantity_restocked: 1,
            prior_decrement_event_key: `${CAPTURE_KEY}:purchase_stock`,
          },
          error: null,
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: { ok: true, replayed: false, entitlements_revoked: 0 },
          error: null,
        };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC) {
        return {
          data: {
            ok: true,
            skipped: true,
            reason: "no_commission_decomposition_for_attempt",
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      },
      {
        loadContext: async () => ({ ok: true, context: baseContext() }),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stockRestock.status).toBe("restocked");
    expect(result.stockRestock.quantityRestocked).toBe(1);
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_PURCHASE_STOCK_RESTOCK_RPC,
      STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
      STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    ]);

    rpc.mockClear();
    rpc.mockImplementation((async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: { replayed: false, outcome: "refunded", event_key: IDEM },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return {
          data: null,
          error: {
            message:
              "purchase stock restock requires prior purchase stock decrement event",
          },
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: { ok: true, replayed: false, entitlements_revoked: 0 },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    }) as never);

    const failed = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      },
      {
        loadContext: async () => ({ ok: true, context: baseContext() }),
      }
    );
    expect(failed).toMatchObject({ ok: false, code: "stock_restock_failed" });
    expect(
      rpc.mock.calls.some((c) => c[0] === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC)
    ).toBe(false);
    expect(rpc.mock.calls.map((c) => c[0])).not.toContain(STORE_SETTLEMENT_RPC);
  });

  it("idempotent refund replay still invokes restock RPC for persisted replay", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: { replayed: true, outcome: "refunded", event_key: IDEM },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return {
          data: {
            ok: true,
            replayed: true,
            lines_restocked: 1,
            quantity_restocked: 2,
          },
          error: null,
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: { ok: true, replayed: true, entitlements_revoked: 1 },
          error: null,
        };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC) {
        return {
          data: {
            ok: true,
            replayed: true,
            skipped: false,
            lifecycle_status: "superseded_by_refund",
            policy_status: "applied",
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            hasRefund: true,
            orderPaymentStatus: "refunded",
            attemptStatus: "refunded",
            settlementState: "REVERSED",
          }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replayed).toBe(true);
    expect(result.stockRestock.replayed).toBe(true);
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_PURCHASE_STOCK_RESTOCK_RPC,
      STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
      STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    ]);
  });

  it("keeps restock server-only and out of client checkout", () => {
    const apply = read("lib/store/fullOrderRefundPath.ts");
    expect(apply).toMatch(/restockPurchaseStockAfterTrustedRefund/);
    expect(apply).toMatch(/stock_restock_failed/);
    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/restock_store_purchase_stock/);
  });
});
