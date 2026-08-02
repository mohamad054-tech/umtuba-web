/**
 * Focused tests — Commerce Digital Entitlement Revoke on Refund V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import {
  buildDigitalEntitlementRevokeEventKey,
  DIGITAL_ENTITLEMENT_REVOKE_ID,
  revokeDigitalEntitlementsAfterTrustedRefund,
  STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
} from "./digitalEntitlementRevoke";
import { STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC } from "./commissionDecompositionBridgeApply";
import { STORE_PURCHASE_STOCK_RESTOCK_RPC } from "./refundStockRestockRuntime";
import {
  applyFullOrderRefund,
  type TrustedFullOrderRefundContext,
} from "./fullOrderRefundPath";

function mockStockRestockSuccess() {
  return {
    data: {
      ok: true,
      replayed: false,
      lines_restocked: 0,
      quantity_restocked: 0,
    },
    error: null,
  };
}

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql";
const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const CAPTURE_KEY = "stripe:pi_revoke_on_refund_capture_key_v1:captured";
const CORR = "stripe-attempt-333333333333433383333333333333";
const IDEM = "full-order-refund-idem-key-revoke-01";

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

describe("Digital entitlement revoke — migration contracts", () => {
  it("ships 20260889 with revoke RPC, events table, and service_role only", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260889_store_digital_entitlement_revoke_on_refund_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /create table if not exists public\.store_digital_entitlement_revoke_events/
    );
    expect(sql).toMatch(/add column if not exists revoked_at/);
    expect(sql).toMatch(/revoke_store_digital_entitlements_after_refund/);
    expect(sql).toMatch(/status = 'revoked'/);
    expect(sql).toMatch(
      /digital entitlement revoke requires a trusted refunded outcome event/
    );
    expect(sql).toMatch(
      /grant execute on function public\.revoke_store_digital_entitlements_after_refund\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.revoke_store_digital_entitlements_after_refund\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).toMatch(/force row level security/);
    expect(sql).not.toMatch(/payout|carrier|warehouse_pick|shipping_label|partial/i);
  });
});

describe("Digital entitlement revoke — helpers", () => {
  it("builds deterministic revoke event keys from capture", () => {
    expect(buildDigitalEntitlementRevokeEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:entitlement:revoke`
    );
    expect(DIGITAL_ENTITLEMENT_REVOKE_ID).toBe(
      "commerce.digital.entitlement_revoke_on_refund_v1"
    );
  });

  it("revokes via RPC and reports replayed on duplicate", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          entitlements_revoked: 2,
        },
        error: null,
      })
    );
    const first = await revokeDigitalEntitlementsAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("revoked");
    if (first.status === "revoked") {
      expect(first.entitlementsRevoked).toBe(2);
      expect(first.replayed).toBe(false);
    }
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
    ]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_event_key: `${CAPTURE_KEY}:entitlement:revoke`,
      p_correlation_id: CORR,
      p_payment_attempt_id: ATTEMPT,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        entitlements_revoked: 2,
      },
      error: null,
    } as never);
    const second = await revokeDigitalEntitlementsAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("revoked");
    if (second.status === "revoked") expect(second.replayed).toBe(true);
  });

  it("fails closed when RPC errors", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "digital entitlement revoke requires a trusted refunded outcome event",
      },
    }));
    const result = await revokeDigitalEntitlementsAfterTrustedRefund(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(result.status).toBe("failed");
  });
});

describe("Digital entitlement revoke — refund path wiring", () => {
  it("revokes after Sync refunded on success and replay paths", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: {
            replayed: false,
            outcome: "refunded",
            event_key: IDEM,
          },
          error: null,
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            entitlements_revoked: 1,
          },
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
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return mockStockRestockSuccess();
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
          context: baseContext(),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entitlementRevoke.entitlementsRevoked).toBe(1);
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
          data: { replayed: true, outcome: "refunded", event_key: IDEM },
          error: null,
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: {
            ok: true,
            replayed: true,
            entitlements_revoked: 1,
          },
          error: null,
        };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC) {
        return {
          data: {
            ok: true,
            replayed: true,
            skipped: false,
            reason: null,
            lifecycle_status: "superseded_by_refund",
          },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return {
          data: {
            ok: true,
            replayed: true,
            lines_restocked: 0,
            quantity_restocked: 0,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    }) as never);

    const replay = await applyFullOrderRefund(
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
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replayed).toBe(true);
    expect(replay.entitlementRevoke.replayed).toBe(true);
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_PURCHASE_STOCK_RESTOCK_RPC,
      STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
      STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    ]);
  });

  it("fails closed when revoke fails after Sync refund", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: { replayed: false, outcome: "refunded", event_key: IDEM },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
        return mockStockRestockSuccess();
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC) {
        return {
          data: null,
          error: {
            message:
              "digital entitlement revoke failed closed: 1 active entitlement(s) remain",
          },
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
          context: baseContext(),
        }),
      }
    );
    expect(result).toMatchObject({
      ok: false,
      code: "entitlement_revoke_failed",
    });
  });

  it("keeps revoke server-only and does not redesign settlement", () => {
    const refundPath = read("lib/store/fullOrderRefundPath.ts");
    expect(refundPath).toMatch(/revokeDigitalEntitlementsAfterTrustedRefund/);
    expect(refundPath).toMatch(/entitlement_revoke_failed/);
    expect(refundPath).not.toMatch(/stripe\.refunds|Refund\.create/i);

    expect(read("lib/store/refundOperations/service.ts")).toMatch(
      /applyFullOrderRefund/
    );
    expect(read("lib/store/digitalAccessDelivery.ts")).toMatch(
      /entitlement_inactive|status !== ["']active["']/
    );
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
  });
});
