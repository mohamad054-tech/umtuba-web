/**
 * Focused tests — Commerce Post-Capture Settlement Allocate V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import {
  allocateSettlementAfterTrustedCapture,
  buildPostCaptureAllocateEventKey,
  POST_CAPTURE_ALLOCATE_ACTION,
  POST_CAPTURE_SETTLEMENT_ALLOCATE_ID,
} from "./postCaptureSettlementAllocate";
import { applyVerifiedStorePaymentOutcome } from "./stripePaymentOutcomeApply";
import {
  COMMISSION_DECOMPOSITION_UNAVAILABLE,
  COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN,
  COMMERCE_REVENUE_BRIDGE_VERSION,
  planCommerceRevenueBridgePosting,
  type CommerceFinancialEvent,
} from "./commerceRevenueBridge";
import { classifyTradingPaymentState } from "./tradingContracts";

const ROOT = join(__dirname, "../..");
const ATTEMPT = "22222222-2222-4222-8222-222222222222";
const CAPTURE_KEY = "stripe:pi_test_1234567890abcdef:captured";
const CORR = "stripe-attempt-222222222222422282222222222222";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function mockRpcClient(
  handler: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<{ data?: unknown; error?: { message: string } | null }>
) {
  return {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) =>
      handler(name, args)
    ),
  } as never;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Post-capture allocate — contracts", () => {
  it("reuses Settlement Foundation allocate action and RPC only", () => {
    expect(POST_CAPTURE_ALLOCATE_ACTION).toBe("allocate");
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
    expect(buildPostCaptureAllocateEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:allocate`
    );
    const src = read("lib/store/postCaptureSettlementAllocate.ts");
    expect(src).toMatch(/STORE_SETTLEMENT_RPC/);
    expect(src).not.toMatch(/p_action:\s*["']release["']/);
    expect(src).toMatch(/p_action:\s*POST_CAPTURE_ALLOCATE_ACTION/);
  });

  it("aligns allocate event_key pattern with Revenue Bridge", () => {
    const event: CommerceFinancialEvent = {
      version: COMMERCE_REVENUE_BRIDGE_VERSION,
      sourceDomain: COMMERCE_REVENUE_BRIDGE_SOURCE_DOMAIN,
      sourceEventType: "payment_captured",
      sourceEventId: "src",
      idempotencyKey: CAPTURE_KEY,
      orderId: "11111111-1111-4111-8111-111111111111",
      storeId: "44444444-4444-4444-8444-444444444444",
      buyerUserId: "33333333-3333-4333-8333-333333333333",
      currency: "USD",
      grossItemAmountMinor: 2500,
      discountAmountMinor: 0,
      taxAmountMinor: 0,
      deliveryAmountMinor: 0,
      grandTotalMinor: 2500,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      paymentClassification: classifyTradingPaymentState({
        paymentStatus: "paid",
        status: "confirmed",
      }),
      financialEligibility: "eligible_for_capture_posting",
      occurredAt: new Date().toISOString(),
      paymentAttemptId: ATTEMPT,
      commission: COMMISSION_DECOMPOSITION_UNAVAILABLE,
      marketplace: {
        sellerStoreId: "44444444-4444-4444-8444-444444444444",
        supplierStoreId: null,
        listingId: null,
        marketplaceSourceType: "owned",
        settlementDecomposition: "unavailable",
      },
    };
    const plan = planCommerceRevenueBridgePosting(event, {
      allocateSettlement: true,
    });
    expect(plan.settlement?.eventKey).toBe(
      buildPostCaptureAllocateEventKey(CAPTURE_KEY)
    );
    expect(plan.settlement?.action).toBe("allocate");
  });

  it("creates no new migration for this slice", () => {
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("post_capture_settlement_allocate"))
    ).toBe(false);
    expect(
      existsSync(join(ROOT, "lib/store/postCaptureSettlementAllocate.ts"))
    ).toBe(true);
  });
});

describe("Post-capture allocate — RPC behavior", () => {
  it("successful trusted capture allocates exactly once with server-derived money", async () => {
    const client = mockRpcClient(async (name, args) => {
      expect(name).toBe(STORE_SETTLEMENT_RPC);
      expect(args.p_action).toBe("allocate");
      expect(args.p_event_key).toBe(`${CAPTURE_KEY}:allocate`);
      expect(args.p_correlation_id).toBe(CORR);
      expect(args.p_payment_attempt_id).toBe(ATTEMPT);
      expect(args.p_amount_minor).toBe(2500);
      expect(args.p_currency).toBe("USD");
      expect(args.p_metadata).toMatchObject({
        note: POST_CAPTURE_SETTLEMENT_ALLOCATE_ID,
      });
      return { data: { replayed: false, action: "allocate" }, error: null };
    });

    const result = await allocateSettlementAfterTrustedCapture(client, {
      paymentAttemptId: ATTEMPT,
      correlationId: CORR,
      captureEventKey: CAPTURE_KEY,
      amountMinor: 2500,
      currency: "usd",
      providerReference: "pi_test_1234567890abcdef",
    });
    expect(result).toEqual({
      status: "allocated",
      replayed: false,
      data: { replayed: false, action: "allocate" },
    });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).toHaveBeenCalledTimes(1);
  });

  it("duplicate allocate event_key reports replayed and does not invent a second action", async () => {
    const client = mockRpcClient(async () => ({
      data: { replayed: true, action: "allocate" },
      error: null,
    }));
    const result = await allocateSettlementAfterTrustedCapture(client, {
      paymentAttemptId: ATTEMPT,
      correlationId: CORR,
      captureEventKey: CAPTURE_KEY,
      amountMinor: 2500,
      currency: "USD",
    });
    expect(result.status).toBe("allocated");
    if (result.status === "allocated") {
      expect(result.replayed).toBe(true);
    }
  });

  it("fails closed on non-positive amount without calling RPC", async () => {
    const client = mockRpcClient(async () => {
      throw new Error("should not call rpc");
    });
    const result = await allocateSettlementAfterTrustedCapture(client, {
      paymentAttemptId: ATTEMPT,
      correlationId: CORR,
      captureEventKey: CAPTURE_KEY,
      amountMinor: 0,
      currency: "USD",
    });
    expect(result).toEqual({
      status: "failed",
      message: "Settlement allocate requires a positive trusted amount.",
    });
    expect(
      (client as { rpc: ReturnType<typeof vi.fn> }).rpc
    ).not.toHaveBeenCalled();
  });

  it("surfaces RPC failure without reporting allocated", async () => {
    const client = mockRpcClient(async () => ({
      data: null,
      error: { message: "action allocate already finalized for capture" },
    }));
    const result = await allocateSettlementAfterTrustedCapture(client, {
      paymentAttemptId: ATTEMPT,
      correlationId: CORR,
      captureEventKey: CAPTURE_KEY,
      amountMinor: 2500,
      currency: "USD",
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.message).toMatch(/already finalized/i);
    }
  });
});

describe("Post-capture allocate — applyVerifiedStorePaymentOutcome wiring", () => {
  it("captured Sync success then allocates once", async () => {
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false, event_id: "evt-1" }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        expect(args).toMatchObject({
          p_action: "allocate",
          p_event_key: `${CAPTURE_KEY}:allocate`,
          p_correlation_id: CORR,
          p_amount_minor: 2500,
          p_currency: "USD",
        });
        return { data: { replayed: false, action: "allocate" }, error: null };
      }
      if (name === "grant_store_digital_entitlements_after_capture") {
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
    expect(applied.replayed).toBe(false);
    expect(applied.settlement.status).toBe("allocated");
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(rpc.mock.calls[0][0]).toBe(STORE_PAYMENT_SYNC_RPC);
    expect(rpc.mock.calls[1][0]).toBe(STORE_SETTLEMENT_RPC);
  });

  it("replayed capture still attempts allocate with same event_key (idempotent)", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: true, event_id: "evt-1" }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        return { data: { replayed: true, action: "allocate" }, error: null };
      }
      return {
        data: {
          ok: true,
          replayed: true,
          entitlements_granted: 1,
          reservations_consumed: 0,
          fulfillment_marked: true,
        },
        error: null,
      };
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
    expect(applied.replayed).toBe(true);
    expect(applied.settlement.status).toBe("allocated");
    if (applied.settlement.status === "allocated") {
      expect(applied.settlement.replayed).toBe(true);
    }
  });

  it("failed and cancelled outcomes never allocate", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: { replayed: false },
        error: null,
      })
    );

    for (const outcome of ["failed", "cancelled"] as const) {
      rpc.mockClear();
      const applied = await applyVerifiedStorePaymentOutcome(
        {
          paymentAttemptId: ATTEMPT,
          outcome,
          eventKey: `stripe:pi_x:${outcome}`,
          correlationId: CORR,
          providerReference: "pi_x",
          amountMinor: 2500,
          currency: "USD",
        },
        { supabase: { rpc } as never }
      );
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      expect(applied.settlement.status).toBe("skipped");
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc.mock.calls.map((call) => call[0])).toEqual([
        STORE_PAYMENT_SYNC_RPC,
      ]);
    }
  });

  it("allocation failure does not report settlement success while Sync may succeed", async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false, event_id: "evt-1" }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        return {
          data: null,
          error: {
            message: "settlement requires a trusted capture outcome event",
          },
        };
      }
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
    expect(applied.settlement.status).toBe("failed");
    if (applied.settlement.status === "failed") {
      expect(applied.settlement.message).toMatch(/trusted capture/i);
    }
  });

  it("Sync failure never attempts allocate", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: null,
        error: { message: "Unable to apply payment outcome." },
      })
    );
    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls.map((call) => call[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
    ]);
  });
});

describe("Post-capture allocate — architecture boundaries", () => {
  it("keeps allocate server-only and out of client checkout/actions", () => {
    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).toMatch(/allocateSettlementAfterTrustedCapture/);
    expect(apply).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(apply).toMatch(/outcome !== "captured"/);

    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/STORE_SETTLEMENT_RPC|apply_store_settlement/);
    const actions = read("app/actions/storeStripePayments.ts");
    expect(actions).not.toMatch(/STORE_SETTLEMENT_RPC|SUPABASE_SERVICE_ROLE_KEY/);

    const webhook = read("app/api/store/payments/stripe/webhook/route.ts");
    expect(webhook).toMatch(/settlement: applied\.settlement/);
  });

  it("does not introduce release or payout behavior", () => {
    const src = read("lib/store/postCaptureSettlementAllocate.ts");
    expect(src).not.toMatch(/p_action:\s*["']release["']/);
    expect(src).not.toMatch(/p_action:\s*["']hold["']/);
    expect(src).not.toMatch(/p_action:\s*["']reverse_allocation["']/);
    expect(read("lib/store/stripePaymentOutcomeApply.ts")).not.toMatch(
      /p_action:\s*["']release["']/
    );
  });

  it("preserves listing provenance modules", () => {
    expect(read("lib/store/listingProvenance.ts")).toMatch(
      /sellerListingId|STORE_PRODUCT_LISTING_QUERY_PARAM/
    );
  });
});
