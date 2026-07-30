import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import { applyVerifiedStorePaymentOutcome } from "../../../../../../lib/store/stripePaymentOutcomeApply";
import { verifyStripeCheckoutSessionForCapture } from "../../../../../../lib/store/stripeLiveCapture";

export const runtime = "nodejs";

/**
 * Trusted return URL after Stripe Checkout.
 * Browser success alone is insufficient — we re-fetch the session from Stripe,
 * match attempt/order/amount/currency, then call apply_store_payment_outcome.
 */
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.redirect(
      new URL("/store/orders?payment=failed", request.url)
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/store/orders", request.url)
    );
  }

  const supabase = await createClient();
  const { data: attempt, error } = await supabase
    .from("payment_attempts")
    .select(
      "id, order_id, buyer_id, provider, status, amount_minor, currency, provider_reference"
    )
    .eq("provider", "stripe")
    .eq("provider_reference", sessionId)
    .maybeSingle();

  if (error || !attempt) {
    return NextResponse.redirect(
      new URL("/store/orders?payment=failed", request.url)
    );
  }
  if (attempt.buyer_id !== user.id) {
    return NextResponse.redirect(
      new URL("/store/orders?payment=failed", request.url)
    );
  }

  const verified = await verifyStripeCheckoutSessionForCapture({
    sessionId,
    expectedAttemptId: attempt.id as string,
    expectedOrderId: attempt.order_id as string,
    expectedAmountMinor: attempt.amount_minor as number,
    expectedCurrency: String(attempt.currency),
  });

  if (!verified.ok) {
    const orderId = attempt.order_id as string;
    const code = verified.code === "processing" ? "processing" : "failed";
    return NextResponse.redirect(
      new URL(`/store/orders/${orderId}?payment=${code}`, request.url)
    );
  }

  const applied = await applyVerifiedStorePaymentOutcome({
    paymentAttemptId: attempt.id as string,
    outcome: verified.data.outcome,
    eventKey: verified.data.eventKey,
    correlationId: verified.data.correlationId,
    providerReference: verified.data.paymentIntentId,
    amountMinor: attempt.amount_minor as number,
    currency: String(attempt.currency),
  });

  const orderId = attempt.order_id as string;
  if (!applied.ok) {
    return NextResponse.redirect(
      new URL(`/store/orders/${orderId}?payment=failed`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL(
      `/store/orders/${orderId}?payment=${applied.replayed ? "paid" : "paid"}`,
      request.url
    )
  );
}
