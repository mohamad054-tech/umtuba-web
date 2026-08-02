/**
 * Focused tests — Commerce Commission Decomposition Bridge Apply V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import { STORE_DIGITAL_ENTITLEMENT_GRANT_RPC } from "./digitalEntitlementGrant";
import {
  applyCommissionDecompositionAfterTrustedCapture,
  buildCommissionDecompositionApplyEventKey,
  COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID,
  getCommissionDecompositionForAttempt,
  markCommissionDecompositionAfterTrustedRefund,
  STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
  STORE_COMMISSION_DECOMPOSITION_GET_RPC,
  STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
} from "./commissionDecompositionBridgeApply";
import { applyVerifiedStorePaymentOutcome } from "./stripePaymentOutcomeApply";
import {
  applyFullOrderRefund,
  type TrustedFullOrderRefundContext,
} from "./fullOrderRefundPath";
import { STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC } from "./digitalEntitlementRevoke";
import { STORE_PURCHASE_STOCK_RESTOCK_RPC } from "./refundStockRestockRuntime";
import {
  calculateCommissionSplit,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql";
const STORE = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const CAPTURE_KEY = "stripe:pi_commission_bridge_capture_key_v1:captured";
const CORR = "stripe-attempt-333333333333433383333333333333";
const IDEM = "full-order-refund-idem-key-comm-01";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const POLICY: CommissionPolicyContract = {
  policyCode: "store.default.commission",
  version: 1,
  status: "active",
  currency: "USD",
  effectiveFrom: "2020-01-01T00:00:00.000Z",
  effectiveTo: null,
  basisKind: "grand_total",
  lines: [
    { role: "platform", bps: 1000 },
    { role: "seller", bps: 9000 },
  ],
};

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

describe("Commission decomposition bridge apply — migration contracts", () => {
  it("ships 20260890 with apply/mark/get RPCs and service_role only", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260890_store_commission_decomposition_bridge_apply_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /create table if not exists public\.store_commission_decomposition_events/
    );
    expect(sql).toMatch(/apply_store_commission_decomposition_after_capture/);
    expect(sql).toMatch(/mark_store_commission_decomposition_after_refund/);
    expect(sql).toMatch(/get_store_commission_decomposition_for_attempt/);
    expect(sql).toMatch(/resolve_store_commission_policy/);
    expect(sql).toMatch(/compute_store_commission_split/);
    expect(sql).toMatch(/superseded_by_refund/);
    expect(sql).toMatch(
      /commission decomposition does not reconcile to basis_minor/
    );
    expect(sql).toMatch(
      /grant execute on function public\.apply_store_commission_decomposition_after_capture\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.apply_store_commission_decomposition_after_capture\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).not.toMatch(/marketer|payout_execution|bank_account/i);
  });
});

describe("Commission decomposition bridge apply — helpers", () => {
  it("builds deterministic commission event keys and reconciles foundation split", () => {
    expect(buildCommissionDecompositionApplyEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:commission`
    );
    expect(COMMISSION_DECOMPOSITION_BRIDGE_APPLY_ID).toBe(
      "commerce.revenue.commission_decomposition_bridge_apply_v1"
    );
    const split = calculateCommissionSplit({
      policy: POLICY,
      basisMinor: 5000,
      currency: "USD",
    });
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(
      split.platformCommissionMinor +
        split.sellerAmountMinor +
        split.supplierAmountMinor +
        split.affiliateAmountMinor +
        split.partnerAmountMinor
    ).toBe(5000);
  });

  it("applies via RPC and reports replayed on duplicate", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          policy_status: "applied",
          lifecycle_status: "applied",
          basis_minor: 5000,
          capture_amount_minor: 5000,
          platform_commission_minor: 500,
          seller_amount_minor: 4500,
          supplier_amount_minor: 0,
          affiliate_amount_minor: 0,
          partner_amount_minor: 0,
          calculation_fingerprint: "fp",
          policy_code: "store.default.commission",
          policy_version: 1,
        },
        error: null,
      })
    );
    const first = await applyCommissionDecompositionAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("applied");
    if (first.status === "applied") {
      expect(first.basisMinor).toBe(5000);
      expect(
        first.platformCommissionMinor +
          first.sellerAmountMinor +
          first.supplierAmountMinor +
          first.affiliateAmountMinor +
          first.partnerAmountMinor
      ).toBe(first.basisMinor);
      expect(first.basisMinor).toBe(first.captureAmountMinor);
    }
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
    ]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_event_key: `${CAPTURE_KEY}:commission`,
      p_correlation_id: CORR,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        policy_status: "applied",
        lifecycle_status: "applied",
        basis_minor: 5000,
        capture_amount_minor: 5000,
        platform_commission_minor: 500,
        seller_amount_minor: 4500,
        supplier_amount_minor: 0,
        affiliate_amount_minor: 0,
        partner_amount_minor: 0,
        calculation_fingerprint: "fp",
        policy_code: "store.default.commission",
        policy_version: 1,
      },
      error: null,
    } as never);
    const second = await applyCommissionDecompositionAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("applied");
    if (second.status === "applied") expect(second.replayed).toBe(true);
  });

  it("preserves not_configured when no active policy", async () => {
    const rpc = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        policy_status: "not_configured",
        lifecycle_status: "not_configured",
        capture_amount_minor: 5000,
        currency: "USD",
      },
      error: null,
    }));
    const result = await applyCommissionDecompositionAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(result.status).toBe("not_configured");
  });

  it("fails closed on RPC linkage errors", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message:
          "commission policy includes supplier share but order has no supplier_store_id linkage",
      },
    }));
    const result = await applyCommissionDecompositionAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(result.status).toBe("failed");
  });

  it("marks decomposition after refund and loads for reference", async () => {
    const markRpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          skipped: false,
          lifecycle_status: "superseded_by_refund",
          policy_status: "applied",
        },
        error: null,
      })
    );
    const marked = await markCommissionDecompositionAfterTrustedRefund(
      { rpc: markRpc } as never,
      { paymentAttemptId: ATTEMPT, correlationId: CORR }
    );
    expect(marked.status).toBe("marked");
    expect(markRpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    ]);

    const getRpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          found: true,
          payment_attempt_id: ATTEMPT,
          lifecycle_status: "superseded_by_refund",
          policy_status: "applied",
          seller_amount_minor: 4500,
        },
        error: null,
      })
    );
    const loaded = await getCommissionDecompositionForAttempt(
      { rpc: getRpc } as never,
      ATTEMPT
    );
    expect(loaded.ok).toBe(true);
    if (loaded.ok && loaded.found) {
      expect(loaded.data.lifecycle_status).toBe("superseded_by_refund");
    }
    expect(getRpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_COMMISSION_DECOMPOSITION_GET_RPC,
    ]);
  });
});

describe("Commission decomposition bridge apply — capture wiring", () => {
  it("applies commission after allocate and before entitlement/release", async () => {
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
        expect(args).toMatchObject({
          p_event_key: `${CAPTURE_KEY}:commission`,
          p_correlation_id: CORR,
        });
        return {
          data: {
            ok: true,
            replayed: false,
            policy_status: "applied",
            lifecycle_status: "applied",
            basis_minor: 2500,
            capture_amount_minor: 2500,
            platform_commission_minor: 250,
            seller_amount_minor: 2250,
            supplier_amount_minor: 0,
            affiliate_amount_minor: 0,
            partner_amount_minor: 0,
            calculation_fingerprint: "fp",
            policy_code: "store.default.commission",
            policy_version: 1,
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
            if (name === "decrement_store_purchase_stock_after_capture") {
        return {
          data: {
            ok: true,
            replayed: false,
            lines_decremented: 0,
            quantity_decremented: 0,
            reservations_consumed: 0,
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
        providerReference: "pi_commission_bridge",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.settlement.status).toBe("allocated");
    expect(applied.commission.status).toBe("applied");
    expect(applied.entitlement.status).toBe("granted");
    expect(applied.release.status).toBe("released");
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_SETTLEMENT_RPC,
      STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
      "decrement_store_purchase_stock_after_capture",
      STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
      STORE_SETTLEMENT_RPC,
    ]);
  });

  it("skips commission when allocate fails; non-capture outcomes skip commission", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        return {
          data: null,
          error: { message: "allocate failed" },
        };
      }
      if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
        return {
          data: {
            ok: true,
            replayed: false,
            entitlements_granted: 0,
            reservations_consumed: 0,
            fulfillment_marked: false,
          },
          error: null,
        };
      }
            if (name === "decrement_store_purchase_stock_after_capture") {
        return {
          data: {
            ok: true,
            replayed: false,
            lines_decremented: 0,
            quantity_decremented: 0,
            reservations_consumed: 0,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const failedAllocate = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_x",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(failedAllocate.ok).toBe(true);
    if (!failedAllocate.ok) return;
    expect(failedAllocate.commission.status).toBe("skipped");
    expect(rpc.mock.calls.map((c) => c[0])).not.toContain(
      STORE_COMMISSION_DECOMPOSITION_APPLY_RPC
    );

    rpc.mockClear();
    rpc.mockImplementation(async () => ({
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
    expect(cancelled.commission.status).toBe("skipped");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("Commission decomposition bridge apply — refund reference", () => {
  it("marks persisted decomposition after Sync refund (success + replay)", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return {
          data: { replayed: false, outcome: "refunded", event_key: IDEM },
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
            replayed: false,
            skipped: false,
            lifecycle_status: "superseded_by_refund",
            policy_status: "applied",
          },
          error: null,
        };
      }
      if (name === STORE_PURCHASE_STOCK_RESTOCK_RPC) {
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
      return { data: null, error: { message: `unexpected ${name}` } };
    });

    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      },
      { loadContext: async () => ({ ok: true, context: baseContext() }) }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.commissionDecomposition.status).toBe("marked");
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_PURCHASE_STOCK_RESTOCK_RPC,
      STORE_DIGITAL_ENTITLEMENT_REVOKE_RPC,
      STORE_COMMISSION_DECOMPOSITION_MARK_REFUND_RPC,
    ]);
  });
});
