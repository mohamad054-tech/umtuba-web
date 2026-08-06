/**
 * Server-only trusted fact loader for partial-refund reservation wiring.
 *
 * Accepts identity references + quantity intents only.
 * Derives amount/currency exclusively from payment_attempts, orders,
 * store_payment_outcome_events (captured), and order_items.
 *
 * Never accepts client amount, currency, price, totals, or status as authority.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isPartialRefundUuid,
  rejectClientPartialRefundMoneyFields,
} from "../partialRefundPath/calculate";
import type {
  PartialRefundLineIntent,
  TrustedPartialRefundCaptureFact,
  TrustedPartialRefundLineFact,
} from "../partialRefundPath/types";

type AnyClient = SupabaseClient;

export type TrustedPartialRefundFactLoadFailureCode =
  | "malformed_id"
  | "client_money_rejected"
  | "not_found"
  | "unauthorized"
  | "unsupported"
  | "currency_mismatch"
  | "inconsistent_ledger"
  | "rpc_failed"
  | "empty_selection"
  | "validation_failed";

export type TrustedPartialRefundFactLoadSuccess = {
  ok: true;
  capture: TrustedPartialRefundCaptureFact;
  lines: readonly TrustedPartialRefundLineFact[];
  /** All order lines for UI selection (purchased qty only; no money input). */
  selectableLines: readonly {
    orderItemId: string;
    purchasedQuantity: number;
    titleSnapshot: string;
  }[];
};

export type TrustedPartialRefundFactLoadFailure = {
  ok: false;
  code: TrustedPartialRefundFactLoadFailureCode;
  message: string;
};

export type TrustedPartialRefundFactLoadResult =
  | TrustedPartialRefundFactLoadSuccess
  | TrustedPartialRefundFactLoadFailure;

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function fail(
  code: TrustedPartialRefundFactLoadFailureCode,
  message: string
): TrustedPartialRefundFactLoadFailure {
  return { ok: false, code, message };
}

/**
 * Load trusted capture + order-line facts for reservation.
 * `supabase` must be a privileged (service-role) or otherwise authorized
 * server client that can read payment_attempts / outcomes / order_items.
 */
export async function loadTrustedPartialRefundReservationFacts(
  supabase: AnyClient,
  input: {
    storeId: string;
    paymentAttemptId: string;
    /** When provided, only those lines are returned in `lines` (for reserve). */
    intent?: readonly PartialRefundLineIntent[];
    /** Opaque bag checked for forbidden client money keys. */
    clientBag?: Record<string, unknown>;
  }
): Promise<TrustedPartialRefundFactLoadResult> {
  if (input.clientBag) {
    const money = rejectClientPartialRefundMoneyFields(input.clientBag);
    if (!money.ok) {
      return fail("client_money_rejected", money.message);
    }
  }

  if (
    !isPartialRefundUuid(input.storeId) ||
    !isPartialRefundUuid(input.paymentAttemptId)
  ) {
    return fail(
      "malformed_id",
      "storeId and paymentAttemptId must be valid UUIDs."
    );
  }

  const { data: attempt, error: attemptErr } = await supabase
    .from("payment_attempts")
    .select("id, order_id, amount_minor, currency, status")
    .eq("id", input.paymentAttemptId)
    .maybeSingle();

  if (attemptErr) {
    return fail(
      "rpc_failed",
      "Unable to load payment attempt."
    );
  }
  if (!attempt) {
    return fail("not_found", "Payment attempt not found.");
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, store_id, currency, grand_total_minor, payment_status, status"
    )
    .eq("id", attempt.order_id)
    .maybeSingle();

  if (orderErr) {
    return fail("rpc_failed", "Unable to load order.");
  }
  if (!order) {
    return fail("not_found", "Order not found for payment attempt.");
  }
  if (String(order.store_id) !== input.storeId) {
    return fail(
      "unauthorized",
      "Payment attempt does not belong to the requested store."
    );
  }

  const { data: outcomes, error: outcomeErr } = await supabase
    .from("store_payment_outcome_events")
    .select("id, amount_minor, currency, outcome, created_at")
    .eq("payment_attempt_id", input.paymentAttemptId)
    .order("created_at", { ascending: true });

  if (outcomeErr) {
    return fail("rpc_failed", "Unable to load payment outcomes.");
  }

  const rows = (outcomes ?? []) as Array<{
    id: string;
    amount_minor: number;
    currency: string;
    outcome: string;
  }>;
  const capture = rows.find((r) => r.outcome === "captured");
  if (!capture) {
    return fail(
      "not_found",
      "Trusted capture outcome is required for partial-refund reservation."
    );
  }
  if (rows.some((r) => r.outcome === "refunded")) {
    return fail(
      "unsupported",
      "Capture already has a full refund outcome; partial reservation is unsupported."
    );
  }

  const attemptCurrency = normalizeCurrency(String(attempt.currency ?? ""));
  const orderCurrency = normalizeCurrency(String(order.currency ?? ""));
  const captureCurrency = normalizeCurrency(String(capture.currency ?? ""));
  if (!attemptCurrency || !orderCurrency || !captureCurrency) {
    return fail("currency_mismatch", "Trusted currency is missing or invalid.");
  }
  if (
    attemptCurrency !== orderCurrency ||
    attemptCurrency !== captureCurrency
  ) {
    return fail(
      "currency_mismatch",
      "Currency mismatch across attempt, order, and capture."
    );
  }

  const attemptAmount = Number(attempt.amount_minor);
  const orderAmount = Number(order.grand_total_minor);
  const captureAmount = Number(capture.amount_minor);
  if (
    !Number.isInteger(attemptAmount) ||
    attemptAmount <= 0 ||
    attemptAmount !== orderAmount ||
    attemptAmount !== captureAmount
  ) {
    return fail(
      "inconsistent_ledger",
      "Amount mismatch across attempt, order, and capture."
    );
  }

  const { data: itemRows, error: itemsErr } = await supabase
    .from("order_items")
    .select(
      "id, order_id, quantity, unit_price_minor, total_price_minor, title_snapshot"
    )
    .eq("order_id", order.id);

  if (itemsErr) {
    return fail("rpc_failed", "Unable to load order lines.");
  }
  if (!itemRows || itemRows.length === 0) {
    return fail("not_found", "Order has no line items.");
  }

  const orderId = String(order.id);
  const storeId = input.storeId;
  const allLines: TrustedPartialRefundLineFact[] = [];
  const selectableLines: {
    orderItemId: string;
    purchasedQuantity: number;
    titleSnapshot: string;
  }[] = [];

  for (const raw of itemRows) {
    const orderItemId = String(raw.id);
    const purchasedQuantity = Math.trunc(Number(raw.quantity));
    const unitPriceMinor = Math.trunc(Number(raw.unit_price_minor));
    const totalPriceMinor = Math.trunc(Number(raw.total_price_minor));
    if (
      !isPartialRefundUuid(orderItemId) ||
      !Number.isInteger(purchasedQuantity) ||
      purchasedQuantity <= 0 ||
      !Number.isInteger(unitPriceMinor) ||
      unitPriceMinor < 0 ||
      totalPriceMinor !== unitPriceMinor * purchasedQuantity
    ) {
      return fail(
        "inconsistent_ledger",
        "Order line facts are inconsistent or malformed."
      );
    }
    if (String(raw.order_id) !== orderId) {
      return fail("unauthorized", "Order line does not belong to the order.");
    }
    allLines.push({
      orderItemId,
      orderId,
      storeId,
      purchasedQuantity,
      unitPriceMinor,
      totalPriceMinor,
      currency: attemptCurrency,
    });
    selectableLines.push({
      orderItemId,
      purchasedQuantity,
      titleSnapshot: String(raw.title_snapshot ?? "").trim() || "Line item",
    });
  }

  const captureFact: TrustedPartialRefundCaptureFact = {
    storeId,
    orderId,
    paymentAttemptId: input.paymentAttemptId,
    captureEventId: String(capture.id),
    captureAmountMinor: captureAmount,
    currency: attemptCurrency,
  };

  if (!input.intent || input.intent.length === 0) {
    return {
      ok: true,
      capture: captureFact,
      lines: allLines,
      selectableLines,
    };
  }

  const byId = new Map(allLines.map((l) => [l.orderItemId, l]));
  const selected: TrustedPartialRefundLineFact[] = [];
  const seen = new Set<string>();

  for (const intent of input.intent) {
    if (!isPartialRefundUuid(intent.orderItemId)) {
      return fail("malformed_id", "Order item id is malformed.");
    }
    if (seen.has(intent.orderItemId)) {
      return fail("validation_failed", "Duplicate line in selection.");
    }
    seen.add(intent.orderItemId);
    const fact = byId.get(intent.orderItemId);
    if (!fact) {
      return fail("not_found", "Unknown order line for this capture/order.");
    }
    if (
      !Number.isInteger(intent.requestedQuantity) ||
      intent.requestedQuantity <= 0
    ) {
      return fail(
        "validation_failed",
        "Requested quantity must be a positive integer."
      );
    }
    if (intent.requestedQuantity > fact.purchasedQuantity) {
      return fail(
        "validation_failed",
        "Requested quantity exceeds purchased quantity."
      );
    }
    selected.push(fact);
  }

  if (selected.length === 0) {
    return fail("empty_selection", "At least one order line is required.");
  }

  return {
    ok: true,
    capture: captureFact,
    lines: selected,
    selectableLines,
  };
}
