/**
 * Commerce Live Payment Capture Adapter V1 — Stripe test-mode orchestration.
 * Amount/currency always from DB attempt/order. Never trusts client money fields.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPaymentRpcError, type PaymentProviderAdapter, type CreatePaymentIntentInput, type PaymentIntentResult } from "./payments";
import { STORE_PAYMENT_SYNC_RPC, type StorePaymentOutcome } from "./paymentOutcomeSync";
import {
  createStripeCheckoutSession,
  paymentIntentIdFromSession,
  retrieveStripeCheckoutSession,
  retrieveStripePaymentIntent,
  type StripeCheckoutSession,
} from "./stripeApi";
import { getStripeLiveCaptureConfig } from "./stripeConfig";

type AnyClient = SupabaseClient;

export const LIVE_CAPTURE_ADAPTER_ID =
  "commerce.payments.live_capture_adapter_v1" as const;

export type StripePaymentAttemptData = {
  attemptId: string;
  orderId: string;
  status: string;
  provider: string;
  methodKind: string;
  amountMinor: number;
  currency: string;
  providerReference: string | null;
  idempotencyKey: string;
  reused: boolean;
};

export type LiveCaptureResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; code?: string };

function parseAttemptRow(
  data: unknown
): LiveCaptureResult<StripePaymentAttemptData> {
  const payload = (data ?? {}) as Record<string, unknown>;
  const attemptId = String(payload.attempt_id ?? "");
  const amountMinor = payload.amount_minor;
  const currency = String(payload.currency ?? "").toUpperCase();
  if (!attemptId) {
    return { ok: false, message: "Unexpected payment attempt response." };
  }
  if (
    typeof amountMinor !== "number" ||
    !Number.isInteger(amountMinor) ||
    amountMinor < 0
  ) {
    return { ok: false, message: "Unexpected payment amount in response." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, message: "Unexpected payment currency in response." };
  }
  if (String(payload.provider ?? "") !== "stripe") {
    return { ok: false, message: "Unexpected payment provider in response." };
  }
  return {
    ok: true,
    data: {
      attemptId,
      orderId: String(payload.order_id ?? ""),
      status: String(payload.status ?? "pending"),
      provider: "stripe",
      methodKind: String(payload.method_kind ?? "card"),
      amountMinor,
      currency,
      providerReference:
        typeof payload.provider_reference === "string"
          ? payload.provider_reference
          : null,
      idempotencyKey: String(payload.idempotency_key ?? ""),
      reused: Boolean(payload.reused),
    },
  };
}

export async function createStripePaymentAttemptRow(
  supabase: AnyClient,
  orderId: string,
  idempotencyKey?: string
): Promise<LiveCaptureResult<StripePaymentAttemptData>> {
  const trimmed = orderId.trim();
  if (!trimmed) return { ok: false, message: "Order id is required." };

  const { data, error } = await supabase.rpc(
    "create_my_store_stripe_payment_attempt",
    {
      p_order_id: trimmed,
      p_idempotency_key: idempotencyKey?.trim() || null,
    }
  );
  if (error) {
    return { ok: false, message: mapPaymentRpcError(error.message) };
  }
  return parseAttemptRow(data);
}

export async function attachStripeProviderReference(
  supabase: AnyClient,
  attemptId: string,
  providerReference: string
): Promise<LiveCaptureResult<{ attemptId: string; providerReference: string }>> {
  const { data, error } = await supabase.rpc(
    "attach_my_store_stripe_provider_reference",
    {
      p_attempt_id: attemptId,
      p_provider_reference: providerReference,
    }
  );
  if (error) {
    return { ok: false, message: mapPaymentRpcError(error.message) };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    data: {
      attemptId: String(payload.attempt_id ?? attemptId),
      providerReference: String(payload.provider_reference ?? providerReference),
    },
  };
}

/**
 * Create or resume a Stripe Checkout Session for a buyer-owned order.
 * Rejects client-supplied amount/currency. Uses attempt row totals only.
 */
export async function startStripeCheckoutSessionForOrder(
  supabase: AnyClient,
  input: {
    orderId: string;
    buyerId: string;
    /** Ignored if present — fail closed when client tries to set money. */
    clientAmountMinor?: unknown;
    clientCurrency?: unknown;
  }
): Promise<
  LiveCaptureResult<{
    attemptId: string;
    orderId: string;
    checkoutUrl: string;
    sessionId: string;
    status: "awaiting_payment" | "preparing";
  }>
> {
  if (
    input.clientAmountMinor !== undefined ||
    input.clientCurrency !== undefined
  ) {
    return {
      ok: false,
      message: "Client-supplied payment amounts are not accepted.",
      code: "client_money_rejected",
    };
  }

  const config = getStripeLiveCaptureConfig();
  if (!config.ok) {
    return { ok: false, message: config.message, code: "unavailable" };
  }

  const attempt = await createStripePaymentAttemptRow(
    supabase,
    input.orderId,
    `stripe-${input.orderId.replace(/-/g, "")}`
  );
  if (!attempt.ok) return attempt;

  if (attempt.data.amountMinor <= 0) {
    return { ok: false, message: "Order total must be greater than zero." };
  }

  const successUrl = `${config.appOrigin}/api/store/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${config.appOrigin}/store/orders/${attempt.data.orderId}?payment=cancelled`;

  const session = await createStripeCheckoutSession(config.secretKey, {
    amountMinor: attempt.data.amountMinor,
    currency: attempt.data.currency,
    attemptId: attempt.data.attemptId,
    orderId: attempt.data.orderId,
    buyerId: input.buyerId,
    successUrl,
    cancelUrl,
    idempotencyKey: attempt.data.idempotencyKey || `stripe-session-${attempt.data.attemptId}`,
  });
  if (!session.ok) {
    return { ok: false, message: session.message, code: "provider_error" };
  }
  if (!session.data.url) {
    return { ok: false, message: "Stripe checkout URL missing." };
  }

  const attached = await attachStripeProviderReference(
    supabase,
    attempt.data.attemptId,
    session.data.id
  );
  if (!attached.ok) return attached;

  return {
    ok: true,
    data: {
      attemptId: attempt.data.attemptId,
      orderId: attempt.data.orderId,
      checkoutUrl: session.data.url,
      sessionId: session.data.id,
      status: "awaiting_payment",
    },
  };
}

export function mapStripeSessionToOutcome(
  session: StripeCheckoutSession
): StorePaymentOutcome | null {
  if (session.payment_status === "paid") return "captured";
  if (session.status === "expired") return "cancelled";
  if (session.payment_status === "unpaid" && session.status === "complete") {
    return null;
  }
  return null;
}

export function buildStripeCaptureEventKey(input: {
  paymentIntentId: string;
  outcome: StorePaymentOutcome;
}): string {
  return `stripe:${input.paymentIntentId}:${input.outcome}`;
}

export function buildStripeCaptureCorrelationId(attemptId: string): string {
  return `stripe-attempt-${attemptId.replace(/-/g, "")}`;
}

/**
 * Verify Stripe session server-side and build Sync args. Does not apply Sync.
 */
export async function verifyStripeCheckoutSessionForCapture(input: {
  sessionId: string;
  expectedAttemptId: string;
  expectedOrderId: string;
  expectedAmountMinor: number;
  expectedCurrency: string;
}): Promise<
  LiveCaptureResult<{
    outcome: StorePaymentOutcome;
    paymentIntentId: string;
    eventKey: string;
    correlationId: string;
    providerReference: string;
  }>
> {
  const config = getStripeLiveCaptureConfig();
  if (!config.ok) {
    return { ok: false, message: config.message, code: "unavailable" };
  }

  const sessionResult = await retrieveStripeCheckoutSession(
    config.secretKey,
    input.sessionId
  );
  if (!sessionResult.ok) return sessionResult;

  const session = sessionResult.data;
  const metaAttempt = session.metadata?.attempt_id ?? "";
  const metaOrder = session.metadata?.order_id ?? "";
  if (metaAttempt !== input.expectedAttemptId) {
    return { ok: false, message: "Stripe session attempt mismatch." };
  }
  if (metaOrder !== input.expectedOrderId) {
    return { ok: false, message: "Stripe session order mismatch." };
  }

  const outcome = mapStripeSessionToOutcome(session);
  if (!outcome) {
    return {
      ok: false,
      message: "Stripe payment is not complete yet.",
      code: "processing",
    };
  }

  if (
    typeof session.amount_total === "number" &&
    session.amount_total !== input.expectedAmountMinor
  ) {
    return { ok: false, message: "Stripe amount does not match order." };
  }
  if (
    typeof session.currency === "string" &&
    session.currency.toUpperCase() !== input.expectedCurrency.toUpperCase()
  ) {
    return { ok: false, message: "Stripe currency does not match order." };
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  if (!paymentIntentId) {
    return { ok: false, message: "Stripe payment intent missing." };
  }

  const pi = await retrieveStripePaymentIntent(config.secretKey, paymentIntentId);
  if (!pi.ok) return pi;
  if (outcome === "captured" && pi.data.status !== "succeeded") {
    return {
      ok: false,
      message: "Stripe payment intent is not succeeded.",
      code: "processing",
    };
  }
  if (pi.data.amount !== input.expectedAmountMinor) {
    return { ok: false, message: "Stripe payment intent amount mismatch." };
  }
  if (pi.data.currency.toUpperCase() !== input.expectedCurrency.toUpperCase()) {
    return { ok: false, message: "Stripe payment intent currency mismatch." };
  }

  return {
    ok: true,
    data: {
      outcome,
      paymentIntentId,
      eventKey: buildStripeCaptureEventKey({
        paymentIntentId,
        outcome,
      }),
      correlationId: buildStripeCaptureCorrelationId(input.expectedAttemptId),
      providerReference: paymentIntentId,
    },
  };
}

/**
 * Adapter implementation — refuses Deferred/none downgrade; requires stripe provider.
 */
export class StripeTestPaymentAdapter implements PaymentProviderAdapter {
  readonly provider = "stripe" as const;

  async createIntent(
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntentResult> {
    if (input.provider !== "stripe") {
      return {
        ok: false,
        message:
          "Stripe adapter cannot process a non-Stripe provider request.",
      };
    }
    if (!getStripeLiveCaptureConfig().ok) {
      return {
        ok: false,
        message: "Stripe payment is unavailable (configuration missing).",
      };
    }
    if (!input.orderId || !input.buyerId) {
      return { ok: false, message: "Order and buyer are required." };
    }
    if (
      !Number.isInteger(input.money.amountMinor) ||
      input.money.amountMinor < 0
    ) {
      return { ok: false, message: "Invalid payment amount." };
    }
    if (!/^[A-Z]{3}$/.test(input.money.currency.toUpperCase())) {
      return { ok: false, message: "Invalid currency." };
    }
    if (input.idempotencyKey.trim().length < 8) {
      return { ok: false, message: "Idempotency key is required." };
    }
    // Intent creation against Stripe requires a Supabase client + redirect URLs;
    // use startStripeCheckoutSessionForOrder from server actions.
    return {
      ok: false,
      message:
        "Use startStripeCheckoutSessionForOrder for checkout session creation.",
    };
  }
}

export const STORE_STRIPE_PAYMENT_RPCS = {
  createAttempt: "create_my_store_stripe_payment_attempt",
  attachReference: "attach_my_store_stripe_provider_reference",
  applyOutcome: STORE_PAYMENT_SYNC_RPC,
} as const;
