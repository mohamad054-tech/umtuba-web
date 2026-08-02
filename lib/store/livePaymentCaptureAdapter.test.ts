/**
 * Focused tests — Commerce Live Payment Capture Adapter V1 (Stripe test-mode).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DeferredPaymentAdapter } from "./payments";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import {
  buildStripeCaptureCorrelationId,
  buildStripeCaptureEventKey,
  mapStripeSessionToOutcome,
  startStripeCheckoutSessionForOrder,
  StripeTestPaymentAdapter,
  STORE_STRIPE_PAYMENT_RPCS,
  verifyStripeCheckoutSessionForCapture,
} from "./stripeLiveCapture";
import { getStripeLiveCaptureConfig } from "./stripeConfig";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260876_store_live_payment_capture_adapter_v1.sql";

const ORDER = "11111111-1111-4111-8111-111111111111";
const ATTEMPT = "22222222-2222-4222-8222-222222222222";
const BUYER = "33333333-3333-4333-8333-333333333333";
const PI = "pi_test_1234567890abcdef";
const SESSION = "cs_test_abc";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Live payment capture — migration", () => {
  it("ships 20260876 with stripe attempt RPCs and provider_reference uniqueness", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260876_store_live_payment_capture_adapter_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create_my_store_stripe_payment_attempt/);
    expect(sql).toMatch(/attach_my_store_stripe_provider_reference/);
    expect(sql).toMatch(/payment_attempts_provider_reference_uidx/);
    expect(sql).toMatch(/digital checkout orders/);
    expect(sql).toMatch(/provider = 'stripe'/);
    expect(sql).not.toMatch(/grant execute on function public\.apply_store_payment_outcome/i);
  });
});

describe("Live payment capture — config fail-closed", () => {
  it("fails closed when Stripe configuration is missing", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    expect(getStripeLiveCaptureConfig().ok).toBe(false);
  });

  it("rejects live Stripe secrets without production gate", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_not_allowed");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const cfg = getStripeLiveCaptureConfig();
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) {
      expect(cfg.message).toMatch(/live|production gate|forbidden|unavailable/i);
    }
  });
});

describe("Live payment capture — adapter contracts", () => {
  it("DeferredPaymentAdapter rejects Stripe provider requests (no silent downgrade)", async () => {
    const deferred = new DeferredPaymentAdapter();
    const result = await deferred.createIntent({
      orderId: ORDER,
      buyerId: BUYER,
      money: { amountMinor: 1000, currency: "USD" },
      provider: "stripe",
      methodKind: "card",
      idempotencyKey: "stripe-order-key-01",
    });
    expect(result.ok).toBe(false);
  });

  it("StripeTestPaymentAdapter rejects non-stripe provider", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const adapter = new StripeTestPaymentAdapter();
    const result = await adapter.createIntent({
      orderId: ORDER,
      buyerId: BUYER,
      money: { amountMinor: 1000, currency: "USD" },
      provider: "none",
      methodKind: "deferred",
      idempotencyKey: "stripe-order-key-02",
    });
    expect(result.ok).toBe(false);
  });
});

describe("Live payment capture — money trust + checkout start", () => {
  it("rejects client amount tampering", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    const result = await startStripeCheckoutSessionForOrder(
      { rpc: vi.fn() } as never,
      {
        orderId: ORDER,
        buyerId: BUYER,
        clientAmountMinor: 1,
        clientCurrency: "USD",
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("client_money_rejected");
  });

  it("uses server attempt amount and deterministic idempotency", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");

    const rpc = vi.fn(async (name: string) => {
      if (name === STORE_STRIPE_PAYMENT_RPCS.createAttempt) {
        return {
          data: {
            attempt_id: ATTEMPT,
            order_id: ORDER,
            status: "pending",
            provider: "stripe",
            method_kind: "card",
            amount_minor: 2500,
            currency: "USD",
            provider_reference: null,
            idempotency_key: `stripe-${ORDER.replace(/-/g, "")}`,
            reused: false,
          },
          error: null,
        };
      }
      if (name === STORE_STRIPE_PAYMENT_RPCS.attachReference) {
        return {
          data: {
            attempt_id: ATTEMPT,
            provider_reference: SESSION,
            status: "pending",
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

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: SESSION,
          url: "https://checkout.stripe.com/c/pay/cs_test",
          payment_status: "unpaid",
          payment_intent: null,
          amount_total: 2500,
          currency: "usd",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const started = await startStripeCheckoutSessionForOrder(
      { rpc } as never,
      { orderId: ORDER, buyerId: BUYER }
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.checkoutUrl).toContain("checkout.stripe.com");
    expect(rpc).toHaveBeenCalledWith(
      STORE_STRIPE_PAYMENT_RPCS.createAttempt,
      expect.objectContaining({
        p_order_id: ORDER,
        p_idempotency_key: `stripe-${ORDER.replace(/-/g, "")}`,
      })
    );
    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(String(init.headers && (init.headers as Record<string, string>)["Idempotency-Key"] || "")).toContain("stripe-");
  });
});

describe("Live payment capture — outcome mapping + sync boundary", () => {
  it("maps successful and cancelled sessions", () => {
    expect(
      mapStripeSessionToOutcome({
        id: SESSION,
        url: null,
        payment_status: "paid",
        payment_intent: PI,
        amount_total: 100,
        currency: "usd",
      })
    ).toBe("captured");
    expect(
      mapStripeSessionToOutcome({
        id: SESSION,
        url: null,
        payment_status: "unpaid",
        payment_intent: null,
        amount_total: 100,
        currency: "usd",
        status: "expired",
      })
    ).toBe("cancelled");
  });

  it("builds stable event keys for duplicate/out-of-order replay", () => {
    const a = buildStripeCaptureEventKey({
      paymentIntentId: PI,
      outcome: "captured",
    });
    const b = buildStripeCaptureEventKey({
      paymentIntentId: PI,
      outcome: "captured",
    });
    expect(a).toBe(b);
    expect(a).toBe(`stripe:${PI}:captured`);
    expect(buildStripeCaptureCorrelationId(ATTEMPT)).toMatch(/^stripe-attempt-/);
  });

  it("verifies capture against trusted server totals and rejects mismatch", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/checkout/sessions/")) {
        return new Response(
          JSON.stringify({
            id: SESSION,
            url: null,
            payment_status: "paid",
            payment_intent: PI,
            amount_total: 9999,
            currency: "usd",
            metadata: { attempt_id: ATTEMPT, order_id: ORDER },
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ error: { message: "no" } }), {
        status: 400,
      });
    });

    const bad = await verifyStripeCheckoutSessionForCapture({
      sessionId: SESSION,
      expectedAttemptId: ATTEMPT,
      expectedOrderId: ORDER,
      expectedAmountMinor: 2500,
      expectedCurrency: "USD",
    });
    expect(bad.ok).toBe(false);
  });

  it("successful capture verification returns Sync event key for apply_store_payment_outcome", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes("/checkout/sessions/")) {
        return new Response(
          JSON.stringify({
            id: SESSION,
            url: null,
            payment_status: "paid",
            payment_intent: PI,
            amount_total: 2500,
            currency: "usd",
            metadata: { attempt_id: ATTEMPT, order_id: ORDER },
          }),
          { status: 200 }
        );
      }
      if (u.includes("/payment_intents/")) {
        return new Response(
          JSON.stringify({
            id: PI,
            status: "succeeded",
            amount: 2500,
            currency: "usd",
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 404 });
    });

    const ok = await verifyStripeCheckoutSessionForCapture({
      sessionId: SESSION,
      expectedAttemptId: ATTEMPT,
      expectedOrderId: ORDER,
      expectedAmountMinor: 2500,
      expectedCurrency: "USD",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.data.outcome).toBe("captured");
    expect(ok.data.eventKey).toBe(`stripe:${PI}:captured`);
    expect(STORE_STRIPE_PAYMENT_RPCS.applyOutcome).toBe(STORE_PAYMENT_SYNC_RPC);
  });
});

describe("Live payment capture — architecture boundaries", () => {
  it("keeps secrets out of client checkout and documents deferred webhook hardening", () => {
    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).toMatch(/Pay with Stripe/);
    expect(checkout).not.toMatch(/STRIPE_SECRET_KEY|sk_test_|sk_live_/);
    expect(checkout).toMatch(/startStripeTestCheckoutAction/);

    const actions = read("app/actions/storeStripePayments.ts");
    expect(actions).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(actions).toMatch(/Client-supplied payment amounts are not accepted/);

    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).toMatch(/apply_store_payment_outcome|STORE_PAYMENT_SYNC_RPC/);
    expect(apply).toMatch(/allocateSettlementAfterTrustedCapture|STORE_SETTLEMENT/);
    expect(apply).toMatch(/releaseSettlementAfterTrustedFulfillment/);
    expect(apply).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);

    const webhook = read("app/api/store/payments/stripe/webhook/route.ts");
    expect(webhook).toMatch(/stripe-signature/);
    expect(webhook).toMatch(/Production hardening deferred/);

    const returnRoute = read("app/api/store/payments/stripe/return/route.ts");
    expect(returnRoute).toMatch(/verifyStripeCheckoutSessionForCapture/);
    expect(returnRoute).toMatch(/applyVerifiedStorePaymentOutcome/);
  });

  it("preserves listing provenance modules untouched by payment adapter", () => {
    const listing = read("lib/store/listingProvenance.ts");
    expect(listing).toMatch(/sellerListingId|STORE_PRODUCT_LISTING_QUERY_PARAM/);
    expect(read("lib/store/stripeLiveCapture.ts")).not.toMatch(
      /seller_listing_id|sellerListingId/
    );
  });
});
