import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  paymentIntentIdFromSession,
  retrieveStripeCheckoutSession,
  retrieveStripePaymentIntent,
  verifyStripeWebhookEvent,
  type StripeCheckoutSession,
} from "../../../../../../lib/store/stripeApi";
import { getStripeLiveCaptureConfig } from "../../../../../../lib/store/stripeConfig";
import {
  buildStripeCaptureCorrelationId,
  buildStripeCaptureEventKey,
  mapStripeSessionToOutcome,
} from "../../../../../../lib/store/stripeLiveCapture";
import { applyVerifiedStorePaymentOutcome } from "../../../../../../lib/store/stripePaymentOutcomeApply";

export const runtime = "nodejs";

/**
 * Stripe webhook. Signature required. Mode follows Production Gate config.
 * Deduplicates via apply_store_payment_outcome event_key.
 * Production hardening deferred: retry storm metrics, dispute events.
 */
export async function POST(request: NextRequest) {
  const config = getStripeLiveCaptureConfig();
  if (!config.ok || !config.webhookSecret) {
    return NextResponse.json(
      { ok: false, message: "Webhook unavailable." },
      { status: 503 }
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const verified = await verifyStripeWebhookEvent(
    config.webhookSecret,
    rawBody,
    signature
  );
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, message: verified.message },
      { status: 400 }
    );
  }

  const event = verified.data;
  const type = String(event.type ?? "");
  if (
    type !== "checkout.session.completed" &&
    type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const obj = (event.data as { object?: StripeCheckoutSession } | undefined)
    ?.object;
  if (!obj || typeof obj !== "object" || !obj.id) {
    return NextResponse.json(
      { ok: false, message: "Invalid session object." },
      { status: 400 }
    );
  }

  // Re-fetch from Stripe — never trust webhook body amounts alone.
  const live = await retrieveStripeCheckoutSession(config.secretKey, obj.id);
  if (!live.ok) {
    return NextResponse.json(
      { ok: false, message: live.message },
      { status: 502 }
    );
  }

  const outcome = mapStripeSessionToOutcome(live.data);
  if (!outcome) {
    return NextResponse.json({ ok: true, ignored: true, reason: "not_final" });
  }

  const attemptId = live.data.metadata?.attempt_id?.trim() ?? "";
  if (!attemptId) {
    return NextResponse.json(
      { ok: false, message: "Missing attempt metadata." },
      { status: 400 }
    );
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!envUrl || !envKey) {
    return NextResponse.json(
      { ok: false, message: "Server configuration missing." },
      { status: 503 }
    );
  }

  const admin = createClient(envUrl, envKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: attempt, error } = await admin
    .from("payment_attempts")
    .select("id, order_id, amount_minor, currency, provider, status")
    .eq("id", attemptId)
    .eq("provider", "stripe")
    .maybeSingle();

  if (error || !attempt) {
    return NextResponse.json(
      { ok: false, message: "Payment attempt not found." },
      { status: 404 }
    );
  }

  const paymentIntentId = paymentIntentIdFromSession(live.data);
  if (!paymentIntentId) {
    return NextResponse.json(
      { ok: false, message: "Payment intent missing." },
      { status: 400 }
    );
  }

  const pi = await retrieveStripePaymentIntent(
    config.secretKey,
    paymentIntentId
  );
  if (!pi.ok) {
    return NextResponse.json(
      { ok: false, message: pi.message },
      { status: 502 }
    );
  }
  if (
    outcome === "captured" &&
    (pi.data.status !== "succeeded" ||
      pi.data.amount !== attempt.amount_minor ||
      pi.data.currency.toUpperCase() !==
        String(attempt.currency).toUpperCase())
  ) {
    return NextResponse.json(
      { ok: false, message: "Payment intent verification failed." },
      { status: 409 }
    );
  }

  const applied = await applyVerifiedStorePaymentOutcome({
    paymentAttemptId: attempt.id as string,
    outcome,
    eventKey: buildStripeCaptureEventKey({ paymentIntentId, outcome }),
    correlationId: buildStripeCaptureCorrelationId(attempt.id as string),
    providerReference: paymentIntentId,
    amountMinor: attempt.amount_minor as number,
    currency: String(attempt.currency),
    metadata: {
      provider_event_type: type,
      provider_payload_id: String(event.id ?? paymentIntentId),
    },
  });

  if (!applied.ok) {
    return NextResponse.json(
      { ok: false, message: applied.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    replayed: applied.replayed,
    settlement: applied.settlement,
    purchaseStock: applied.purchaseStock,
    entitlement: applied.entitlement,
    release: applied.release,
  });
}
