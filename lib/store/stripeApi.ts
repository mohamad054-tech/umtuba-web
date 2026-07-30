/**
 * Minimal Stripe HTTP client (test-mode) — no Stripe SDK dependency.
 * Server-only. Secrets must never reach the browser.
 */

export type StripeApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status?: number };

function formBody(params: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    body.set(key, String(value));
  }
  return body.toString();
}

async function stripeRequest<T>(
  secretKey: string,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, string | number | undefined>,
  idempotencyKey?: string
): Promise<StripeApiResult<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  };
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`https://api.stripe.com/v1${path}`, {
      method,
      headers,
      body: method === "POST" && params ? formBody(params) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Unable to reach Stripe." };
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    return { ok: false, message: "Invalid Stripe response.", status: response.status };
  }

  if (!response.ok) {
    const err = json as { error?: { message?: string } };
    return {
      ok: false,
      message: err.error?.message?.trim() || "Stripe request failed.",
      status: response.status,
    };
  }

  return { ok: true, data: json as T };
}

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status: string;
  payment_intent: string | { id: string } | null;
  amount_total: number | null;
  currency: string | null;
  metadata?: Record<string, string>;
  status?: string;
};

export type StripePaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
};

export async function createStripeCheckoutSession(
  secretKey: string,
  input: {
    amountMinor: number;
    currency: string;
    attemptId: string;
    orderId: string;
    buyerId: string;
    successUrl: string;
    cancelUrl: string;
    idempotencyKey: string;
  }
): Promise<StripeApiResult<StripeCheckoutSession>> {
  return stripeRequest<StripeCheckoutSession>(
    secretKey,
    "POST",
    "/checkout/sessions",
    {
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.attemptId,
      "metadata[attempt_id]": input.attemptId,
      "metadata[order_id]": input.orderId,
      "metadata[buyer_id]": input.buyerId,
      "metadata[adapter]": "commerce.payments.live_capture_adapter_v1",
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": input.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": input.amountMinor,
      "line_items[0][price_data][product_data][name]": "UMTUBA order",
      "payment_intent_data[metadata][attempt_id]": input.attemptId,
      "payment_intent_data[metadata][order_id]": input.orderId,
    },
    input.idempotencyKey
  );
}

export async function retrieveStripeCheckoutSession(
  secretKey: string,
  sessionId: string
): Promise<StripeApiResult<StripeCheckoutSession>> {
  return stripeRequest<StripeCheckoutSession>(
    secretKey,
    "GET",
    `/checkout/sessions/${encodeURIComponent(sessionId)}`
  );
}

export async function retrieveStripePaymentIntent(
  secretKey: string,
  paymentIntentId: string
): Promise<StripeApiResult<StripePaymentIntent>> {
  return stripeRequest<StripePaymentIntent>(
    secretKey,
    "GET",
    `/payment_intents/${encodeURIComponent(paymentIntentId)}`
  );
}

/**
 * Verify Stripe webhook signature (v1). Returns the event payload object.
 */
export async function verifyStripeWebhookEvent(
  webhookSecret: string,
  rawBody: string,
  signatureHeader: string | null
): Promise<StripeApiResult<Record<string, unknown>>> {
  if (!signatureHeader) {
    return { ok: false, message: "Missing Stripe signature." };
  }

  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp = "";
  const v1Signatures: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "t") timestamp = v ?? "";
    if (k === "v1" && v) v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0) {
    return { ok: false, message: "Invalid Stripe signature header." };
  }

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSec) || ageSec > 300) {
    return { ok: false, message: "Stripe signature timestamp expired." };
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${rawBody}`)
  );
  const digest = Buffer.from(signed).toString("hex");

  const matched = v1Signatures.some((sig) => {
    if (sig.length !== digest.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i += 1) {
      diff |= sig.charCodeAt(i) ^ digest.charCodeAt(i);
    }
    return diff === 0;
  });

  if (!matched) {
    return { ok: false, message: "Stripe signature verification failed." };
  }

  try {
    const event = JSON.parse(rawBody) as Record<string, unknown>;
    if (!event || typeof event !== "object") {
      return { ok: false, message: "Invalid Stripe event payload." };
    }
    return { ok: true, data: event };
  } catch {
    return { ok: false, message: "Invalid Stripe event JSON." };
  }
}

export function paymentIntentIdFromSession(
  session: StripeCheckoutSession
): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string" && pi.startsWith("pi_")) return pi;
  if (pi && typeof pi === "object" && typeof pi.id === "string") return pi.id;
  return null;
}
