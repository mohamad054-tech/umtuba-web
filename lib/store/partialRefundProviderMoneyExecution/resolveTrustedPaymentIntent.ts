/**
 * Trusted Stripe PaymentIntent resolution from persisted capture/attempt facts.
 * Never trusts client-supplied pi_ / form / query params as authority.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isProviderMoneyUuid,
  isStripePaymentIntentRef,
} from "./validate";

type AnyClient = SupabaseClient;

export type TrustedStripePaymentIntentResolution =
  | {
      ok: true;
      paymentIntentId: string;
      source:
        | "capture_provider_reference"
        | "capture_event_key"
        | "attempt_provider_reference";
      captureEventId: string;
      paymentAttemptId: string;
      storeId: string;
      orderId: string;
    }
  | {
      ok: false;
      code:
        | "malformed_id"
        | "not_found"
        | "unauthorized"
        | "missing_ownership"
        | "provider_not_allowed"
        | "missing_provider_payment_ref"
        | "invalid_state"
        | "rpc_failed";
      message: string;
    };

const EVENT_KEY_PI_RE =
  /^stripe:(pi_[A-Za-z0-9]+):(captured|authorized|refunded|failed|cancelled)$/i;

function extractPiFromEventKey(eventKey: string): string | null {
  const m = eventKey.trim().match(EVENT_KEY_PI_RE);
  if (!m) return null;
  const pi = m[1];
  return isStripePaymentIntentRef(pi) ? pi : null;
}

/**
 * Resolve authoritative Stripe PaymentIntent for a committed ledger's capture.
 */
export async function resolveTrustedStripePaymentIntentRef(
  supabase: AnyClient,
  input: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    /** Rejected if present — client must never supply authoritative PI. */
    clientProviderPaymentRef?: string | null;
  }
): Promise<TrustedStripePaymentIntentResolution> {
  if (
    input.clientProviderPaymentRef != null &&
    String(input.clientProviderPaymentRef).trim() !== ""
  ) {
    return {
      ok: false,
      code: "missing_provider_payment_ref",
      message:
        "Client-supplied provider payment references are not accepted as authority.",
    };
  }

  if (
    !isProviderMoneyUuid(input.storeId) ||
    !isProviderMoneyUuid(input.orderId) ||
    !isProviderMoneyUuid(input.paymentAttemptId) ||
    !isProviderMoneyUuid(input.captureEventId)
  ) {
    return {
      ok: false,
      code: "malformed_id",
      message: "Ownership ids malformed.",
    };
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, store_id")
    .eq("id", input.orderId)
    .maybeSingle();
  if (orderErr) {
    return { ok: false, code: "rpc_failed", message: "Unable to load order." };
  }
  if (!order) {
    return { ok: false, code: "not_found", message: "Order not found." };
  }
  if (String(order.store_id) !== input.storeId) {
    return {
      ok: false,
      code: "unauthorized",
      message: "Order does not belong to the requested store.",
    };
  }

  const { data: attempt, error: attemptErr } = await supabase
    .from("payment_attempts")
    .select("id, order_id, provider, provider_reference, status")
    .eq("id", input.paymentAttemptId)
    .maybeSingle();
  if (attemptErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: "Unable to load payment attempt.",
    };
  }
  if (!attempt) {
    return {
      ok: false,
      code: "not_found",
      message: "Payment attempt not found.",
    };
  }
  if (String(attempt.order_id) !== input.orderId) {
    return {
      ok: false,
      code: "missing_ownership",
      message: "Payment attempt does not belong to the order.",
    };
  }
  const provider = String(attempt.provider ?? "").toLowerCase();
  if (provider !== "stripe") {
    return {
      ok: false,
      code: "provider_not_allowed",
      message: "Only Stripe payment attempts are supported for provider refunds.",
    };
  }

  const { data: capture, error: captureErr } = await supabase
    .from("store_payment_outcome_events")
    .select(
      "id, payment_attempt_id, order_id, outcome, provider_reference, event_key"
    )
    .eq("id", input.captureEventId)
    .maybeSingle();
  if (captureErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: "Unable to load capture outcome.",
    };
  }
  if (!capture) {
    return {
      ok: false,
      code: "not_found",
      message: "Capture outcome not found.",
    };
  }
  if (String(capture.payment_attempt_id) !== input.paymentAttemptId) {
    return {
      ok: false,
      code: "missing_ownership",
      message: "Capture does not belong to the payment attempt.",
    };
  }
  if (String(capture.order_id) !== input.orderId) {
    return {
      ok: false,
      code: "missing_ownership",
      message: "Capture does not belong to the order.",
    };
  }
  if (String(capture.outcome) !== "captured") {
    return {
      ok: false,
      code: "invalid_state",
      message: "Capture outcome must be captured.",
    };
  }

  const captureRef = String(capture.provider_reference ?? "").trim();
  if (isStripePaymentIntentRef(captureRef)) {
    return {
      ok: true,
      paymentIntentId: captureRef,
      source: "capture_provider_reference",
      captureEventId: input.captureEventId,
      paymentAttemptId: input.paymentAttemptId,
      storeId: input.storeId,
      orderId: input.orderId,
    };
  }

  const fromKey = extractPiFromEventKey(String(capture.event_key ?? ""));
  if (fromKey) {
    return {
      ok: true,
      paymentIntentId: fromKey,
      source: "capture_event_key",
      captureEventId: input.captureEventId,
      paymentAttemptId: input.paymentAttemptId,
      storeId: input.storeId,
      orderId: input.orderId,
    };
  }

  const attemptRef = String(attempt.provider_reference ?? "").trim();
  if (isStripePaymentIntentRef(attemptRef)) {
    return {
      ok: true,
      paymentIntentId: attemptRef,
      source: "attempt_provider_reference",
      captureEventId: input.captureEventId,
      paymentAttemptId: input.paymentAttemptId,
      storeId: input.storeId,
      orderId: input.orderId,
    };
  }

  return {
    ok: false,
    code: "missing_provider_payment_ref",
    message:
      "No trusted Stripe PaymentIntent reference found on capture/attempt facts.",
  };
}
