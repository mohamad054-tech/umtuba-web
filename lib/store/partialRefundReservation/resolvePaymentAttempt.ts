/**
 * Resolve a captured payment attempt for an order (server-only identity lookup).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isPartialRefundUuid } from "../partialRefundPath/calculate";

type AnyClient = SupabaseClient;

export type ResolveCapturedPaymentAttemptResult =
  | { ok: true; paymentAttemptId: string; captureEventId: string }
  | { ok: false; code: "not_found" | "unauthorized" | "malformed_id" | "rpc_failed"; message: string };

export async function resolveCapturedPaymentAttemptForOrder(
  supabase: AnyClient,
  input: { storeId: string; orderId: string }
): Promise<ResolveCapturedPaymentAttemptResult> {
  if (
    !isPartialRefundUuid(input.storeId) ||
    !isPartialRefundUuid(input.orderId)
  ) {
    return {
      ok: false,
      code: "malformed_id",
      message: "storeId and orderId must be valid UUIDs.",
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

  const { data: attempts, error: attemptErr } = await supabase
    .from("payment_attempts")
    .select("id, created_at")
    .eq("order_id", input.orderId)
    .order("created_at", { ascending: false });

  if (attemptErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: "Unable to load payment attempts.",
    };
  }
  if (!attempts || attempts.length === 0) {
    return {
      ok: false,
      code: "not_found",
      message: "No payment attempts for this order.",
    };
  }

  for (const attempt of attempts) {
    const { data: outcomes, error: outcomeErr } = await supabase
      .from("store_payment_outcome_events")
      .select("id, outcome")
      .eq("payment_attempt_id", attempt.id);

    if (outcomeErr) {
      return {
        ok: false,
        code: "rpc_failed",
        message: "Unable to load payment outcomes.",
      };
    }
    const capture = (outcomes ?? []).find(
      (o: { outcome: string }) => o.outcome === "captured"
    );
    if (capture) {
      return {
        ok: true,
        paymentAttemptId: String(attempt.id),
        captureEventId: String(capture.id),
      };
    }
  }

  return {
    ok: false,
    code: "not_found",
    message: "No captured payment attempt for this order.",
  };
}
