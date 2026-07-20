/**
 * Checkout orchestration helpers for deferred payment attempts.
 * Amount/currency are never taken from the client — the RPC derives them
 * from the locked order row.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapPaymentRpcError } from "./payments";

type AnyClient = SupabaseClient;

export type DeferredPaymentAttemptData = {
  attemptId: string;
  orderId: string;
  status: string;
  provider: string;
  amountMinor: number;
  currency: string;
  reused: boolean;
};

export type PaymentActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; requiresAuth?: boolean };

function parseAttemptPayload(
  data: unknown,
  fallbackOrderId: string
): PaymentActionResult<DeferredPaymentAttemptData> {
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

  return {
    ok: true,
    data: {
      attemptId,
      orderId: String(payload.order_id ?? fallbackOrderId),
      status: String(payload.status ?? "deferred"),
      provider: String(payload.provider ?? "none"),
      amountMinor,
      currency,
      reused: Boolean(payload.reused),
    },
  };
}

export async function createDeferredPaymentAttempt(
  supabase: AnyClient,
  orderId: string,
  idempotencyKey?: string
): Promise<PaymentActionResult<DeferredPaymentAttemptData>> {
  const trimmed = orderId.trim();
  if (!trimmed) {
    return { ok: false, message: "Order id is required." };
  }

  const { data, error } = await supabase.rpc("create_deferred_payment_attempt", {
    p_order_id: trimmed,
    p_idempotency_key: idempotencyKey?.trim() || null,
  });

  if (error) {
    return { ok: false, message: mapPaymentRpcError(error.message) };
  }

  return parseAttemptPayload(data, trimmed);
}

/**
 * Recovery path: ensure a deferred payment attempt exists for each order.
 * Safe to call repeatedly (RPC is idempotent per order for provider=none).
 */
export async function ensureDeferredPaymentAttempts(
  supabase: AnyClient,
  orderIds: string[]
): Promise<{
  attempts: DeferredPaymentAttemptData[];
  failures: Array<{ orderId: string; message: string }>;
}> {
  const attempts: DeferredPaymentAttemptData[] = [];
  const failures: Array<{ orderId: string; message: string }> = [];
  const seen = new Set<string>();

  for (const raw of orderIds) {
    const orderId = raw.trim();
    if (!orderId || seen.has(orderId)) continue;
    seen.add(orderId);

    const result = await createDeferredPaymentAttempt(
      supabase,
      orderId,
      `deferred-${orderId.replace(/-/g, "")}`
    );
    if (result.ok) {
      attempts.push(result.data);
    } else {
      failures.push({ orderId, message: result.message });
    }
  }

  return { attempts, failures };
}
