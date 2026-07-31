/**
 * Focused tests — Full Order Refund Path V1.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import {
  applyFullOrderRefund,
  assertTrustedFullOrderRefundContext,
  buildFullOrderRefundHoldEventKey,
  buildFullOrderRefundReverseEventKey,
  FULL_ORDER_REFUND_PATH_ID,
  planFullOrderRefund,
  rejectClientFullOrderRefundMoneyFields,
  type TrustedFullOrderRefundContext,
} from "./fullOrderRefundPath";
import type { CommissionPolicyContract } from "./commissionPolicyFoundation";

const ROOT = join(__dirname, "../..");
const STORE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ATTEMPT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const CAPTURE = "55555555-5555-4555-8555-555555555555";
const CAPTURE_KEY = "stripe:pi_refund_path_capture_key_v1:captured";
const CORR = "stripe-attempt-333333333333433383333333333333";
const IDEM = "full-order-refund-idem-key-0001";

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
    settlementState: "RELEASED",
    payoutState: "NONE",
    hasRefund: false,
    merchandiseNetMinor: 4500,
    ...overrides,
  };
}

const POLICY: CommissionPolicyContract = {
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
};

describe("Full order refund path — contracts", () => {
  it("ships capability and reuses Sync + Settlement RPCs (no new migration)", () => {
    expect(FULL_ORDER_REFUND_PATH_ID).toBe(
      "commerce.payments.full_order_refund_path_v1"
    );
    expect(STORE_PAYMENT_SYNC_RPC).toBe("apply_store_payment_outcome");
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("full_order_refund_path"))
    ).toBe(false);
    expect(existsSync(join(ROOT, "lib/store/fullOrderRefundPath.ts"))).toBe(
      true
    );
    expect(
      existsSync(
        join(ROOT, "docs/store/implementation/FULL_ORDER_REFUND_PATH_V1.md")
      )
    ).toBe(true);
    const src = read("lib/store/fullOrderRefundPath.ts");
    expect(src).toMatch(/STORE_SETTLEMENT_RPC/);
    expect(src).toMatch(/STORE_PAYMENT_SYNC_RPC/);
    expect(src).not.toMatch(/stripe\.refunds|Refund\.create|Payout\.create/i);
    expect(src).not.toMatch(/from ["']@\/app\/(dashboard|admin)/i);
  });

  it("builds deterministic hold/reverse keys from capture", () => {
    expect(buildFullOrderRefundHoldEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:refund:hold`
    );
    expect(buildFullOrderRefundReverseEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:refund:reverse`
    );
  });

  it("rejects client money fields", () => {
    expect(
      rejectClientFullOrderRefundMoneyFields({
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      }).ok
    ).toBe(true);
    expect(
      rejectClientFullOrderRefundMoneyFields({ amountMinor: 100 }).ok
    ).toBe(false);
  });
});

describe("Full order refund path — planning", () => {
  it("plans RELEASED → hold → reverse → sync refund", () => {
    const plan = planFullOrderRefund(baseContext());
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.settlementActions).toEqual([
      "hold",
      "reverse_allocation",
    ]);
  });

  it("plans ALLOCATED → reverse only", () => {
    const plan = planFullOrderRefund(
      baseContext({ settlementState: "ALLOCATED" })
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.settlementActions).toEqual(["reverse_allocation"]);
  });

  it("plans UNALLOCATED → sync refund only", () => {
    const plan = planFullOrderRefund(
      baseContext({ settlementState: "UNALLOCATED" })
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.plan.settlementActions).toEqual([]);
  });

  it("rejects already refunded / payout in transit / completed", () => {
    expect(
      planFullOrderRefund(baseContext({ hasRefund: true }))
    ).toMatchObject({ ok: false, code: "already_refunded" });
    expect(
      planFullOrderRefund(baseContext({ payoutState: "IN_TRANSIT" }))
    ).toMatchObject({ ok: false, code: "payout_in_transit" });
    expect(
      planFullOrderRefund(baseContext({ payoutState: "COMPLETED" }))
    ).toMatchObject({ ok: false, code: "payout_completed" });
  });

  it("rejects currency mismatch assertion", () => {
    expect(
      assertTrustedFullOrderRefundContext(baseContext(), "ZAR")
    ).toMatchObject({ ok: false, code: "currency_mismatch" });
  });
});

describe("Full order refund path — apply", () => {
  it("successful full refund: hold + reverse + sync refunded", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === STORE_SETTLEMENT_RPC) {
        if (args?.p_action === "hold") {
          expect(args.p_event_key).toBe(`${CAPTURE_KEY}:refund:hold`);
          expect(args.p_amount_minor).toBe(5000);
          expect(args.p_currency).toBe("USD");
          return {
            data: {
              replayed: false,
              action: "hold",
              settlement_state: "HELD",
            },
            error: null,
          };
        }
        expect(args?.p_action).toBe("reverse_allocation");
        expect(args?.p_event_key).toBe(`${CAPTURE_KEY}:refund:reverse`);
        return {
          data: {
            replayed: false,
            action: "reverse_allocation",
            settlement_state: "REVERSED",
          },
          error: null,
        };
      }
      expect(name).toBe(STORE_PAYMENT_SYNC_RPC);
      expect(args).toMatchObject({
        p_outcome: "refunded",
        p_event_key: IDEM,
        p_correlation_id: CORR,
        p_payment_attempt_id: ATTEMPT,
        p_amount_minor: 5000,
        p_currency: "USD",
      });
      return {
        data: {
          replayed: false,
          outcome: "refunded",
          order_payment_status: "refunded",
          event_key: IDEM,
        },
        error: null,
      };
    });

    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
        commissionPolicy: POLICY,
      },
      {
        loadContext: async () => ({ ok: true, context: baseContext() }),
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settlementSteps).toHaveLength(2);
    expect(result.settlementSteps[0]?.action).toBe("hold");
    expect(result.settlementSteps[1]?.action).toBe("reverse_allocation");
    expect(result.finalSettlementState).toBe("REVERSED");
    expect(result.refund.replayed).toBe(false);
    expect(result.sellerPayableProtected).toBe(true);
    expect(result.payoutProtected).toBe(true);
    expect(result.commission.policyStatus).toBe("applied");
    expect(result.commission.consistent).toBe(true);
    expect(
      (result.commission.platformCommissionMinor ?? 0) +
        (result.commission.sellerAmountMinor ?? 0)
    ).toBe(4500);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("duplicate refund with same key replays safely", async () => {
    const rpc = vi.fn(async () => ({
      data: { replayed: true, outcome: "refunded", event_key: IDEM },
      error: null,
    }));
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
    if (result.ok) {
      expect(result.replayed).toBe(true);
      expect(result.refund.replayed).toBe(true);
    }
  });

  it("already refunded with conflicting key fails closed", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {
        message: "outcome refunded already finalized for payment attempt",
      },
    }));
    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: "different-refund-idem-key-9999",
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({
            hasRefund: true,
            orderPaymentStatus: "refunded",
            attemptStatus: "refunded",
          }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "duplicate_refund" });
  });

  it("rejects payout already completed before any RPC write", async () => {
    const rpc = vi.fn();
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
          context: baseContext({ payoutState: "COMPLETED" }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "payout_completed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects payout in transit before any RPC write", async () => {
    const rpc = vi.fn();
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
          context: baseContext({ payoutState: "IN_TRANSIT" }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "payout_in_transit" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("settlement reversal surfaces foundation failure", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_SETTLEMENT_RPC) {
        return {
          data: null,
          error: {
            message:
              "reverse_allocation forbidden while settlement funds are RELEASED",
          },
        };
      }
      return { data: null, error: { message: "should not sync" } };
    });
    // Simulate bad plan path: ALLOCATED reverse fails
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
          context: baseContext({ settlementState: "ALLOCATED" }),
        }),
      }
    );
    expect(result).toMatchObject({
      ok: false,
      code: "settlement_unwind_failed",
    });
  });

  it("commission consistency requires matching currency policy", async () => {
    const rpc = vi.fn();
    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
        commissionPolicy: { ...POLICY, currency: "EUR" },
      },
      {
        loadContext: async () => ({
          ok: true,
          context: baseContext({ settlementState: "UNALLOCATED" }),
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "inconsistent_ledger" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("seller balance path: UNALLOCATED refunds without settlement writes", async () => {
    const rpc = vi.fn(async (name: string) => {
      expect(name).toBe(STORE_PAYMENT_SYNC_RPC);
      return {
        data: { replayed: false, outcome: "refunded" },
        error: null,
      };
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
          context: baseContext({ settlementState: "UNALLOCATED" }),
        }),
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.settlementSteps).toEqual([]);
      expect(result.sellerPayableProtected).toBe(true);
    }
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("currency consistency: expectedCurrency mismatch fails closed", async () => {
    const rpc = vi.fn();
    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: STORE,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
        expectedCurrency: "GBP",
      },
      {
        loadContext: async () => ({ ok: true, context: baseContext() }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "currency_mismatch" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("authorization: foreign store rejected", async () => {
    const rpc = vi.fn();
    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: OTHER,
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      },
      {
        loadContext: async () => ({
          ok: false,
          code: "unauthorized_store",
          message: "Payment attempt does not belong to the requested store.",
        }),
      }
    );
    expect(result).toMatchObject({ ok: false, code: "unauthorized_store" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("malformed identifiers fail closed", async () => {
    const rpc = vi.fn();
    const result = await applyFullOrderRefund(
      { rpc } as never,
      {
        storeId: "bad",
        paymentAttemptId: ATTEMPT,
        idempotencyKey: IDEM,
      }
    );
    expect(result).toMatchObject({ ok: false, code: "malformed_id" });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("Full order refund path — foundation regression anchors", () => {
  it("settlement still forbids reverse from RELEASED without hold", () => {
    const sql = read(
      "supabase/migrations/20260881_store_seller_payout_foundation_v1.sql"
    );
    expect(sql).toMatch(
      /reverse_allocation forbidden while settlement funds are RELEASED/
    );
    expect(sql).toMatch(
      /settlement action % blocked: seller payout IN_TRANSIT/
    );
    expect(sql).toMatch(
      /settlement action % blocked: seller payout COMPLETED/
    );
    expect(sql).toMatch(/payout blocked: trusted refund outcome already exists/);
  });

  it("Sync refund still requires capture provenance and full amount", () => {
    const sql = read(
      "supabase/migrations/20260823_store_payment_outcome_sync_v1.sql"
    );
    expect(sql).toMatch(/refund requires a prior trusted capture outcome/);
    expect(sql).toMatch(/refund amount\/currency must match trusted capture/);
    expect(sql).toMatch(/refund already finalized for payment attempt/);
  });

  it("payout booking ops helpers remain present and refund-aware", () => {
    expect(existsSync(join(ROOT, "lib/store/payoutBookingOpsHelpers.ts"))).toBe(
      true
    );
    const src = read("lib/store/payoutBookingOpsHelpers.ts");
    expect(src).toMatch(/refunded_or_disputed/);
    expect(src).toMatch(/PAYOUT_BOOKING_OPS_HELPERS_ID/);
  });
});
