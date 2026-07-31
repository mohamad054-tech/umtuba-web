"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import { rejectClientMoneyFormFields } from "../../lib/store/tradingContracts";
import { startStripeCheckoutSessionForOrder } from "../../lib/store/stripeLiveCapture";
import { isStripeLiveCaptureConfigured } from "../../lib/store/stripeConfig";

export type StartStripePaymentResult =
  | {
      ok: true;
      checkoutUrl: string;
      attemptId: string;
      orderId: string;
      status: "awaiting_payment";
    }
  | { ok: false; message: string; code?: string; requiresAuth?: boolean };

/**
 * Start Stripe Checkout for a buyer order (test or gated live mode).
 * Rejects any client money fields. Does not mark the order paid.
 */
export async function startStripeTestCheckoutAction(input: {
  orderId: unknown;
  amountMinor?: unknown;
  currency?: unknown;
}): Promise<StartStripePaymentResult> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to pay.",
      requiresAuth: true,
    };
  }

  if (!isStripeLiveCaptureConfigured()) {
    return {
      ok: false,
      message: "Stripe payment is unavailable.",
      code: "unavailable",
    };
  }

  const orderId =
    typeof input.orderId === "string" ? input.orderId.trim() : "";
  if (!orderId) {
    return { ok: false, message: "Order id is required." };
  }

  // Explicit fail-closed: never accept client money even if present.
  const moneyReject = rejectClientMoneyFormFields((key) => {
    if (key === "amount_minor" || key === "grand_total_minor") {
      return input.amountMinor !== undefined && input.amountMinor !== null;
    }
    if (key === "currency") {
      return input.currency !== undefined && input.currency !== null;
    }
    return false;
  });
  if (!moneyReject.ok) {
    return {
      ok: false,
      message: "Client-supplied payment amounts are not accepted.",
      code: "client_money_rejected",
    };
  }

  const supabase = await createClient();
  const started = await startStripeCheckoutSessionForOrder(supabase, {
    orderId,
    buyerId: user.id,
    ...(input.amountMinor !== undefined
      ? { clientAmountMinor: input.amountMinor }
      : {}),
    ...(input.currency !== undefined
      ? { clientCurrency: input.currency }
      : {}),
  });

  if (!started.ok) {
    return {
      ok: false,
      message: started.message,
      code: started.code,
    };
  }

  return {
    ok: true,
    checkoutUrl: started.data.checkoutUrl,
    attemptId: started.data.attemptId,
    orderId: started.data.orderId,
    status: "awaiting_payment",
  };
}
