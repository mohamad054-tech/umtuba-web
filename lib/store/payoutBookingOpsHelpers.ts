/**
 * Payout Booking Ops Helpers V1.
 * Trusted service-side submit / fail / confirm over Seller Payout Foundation.
 * Server-only. No bank rails, no UI, no client-trusted money fields.
 * Money movement remains DB-authoritative via apply_store_payout_event.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORE_PAYOUT_ACTIONS,
  STORE_PAYOUT_RPC,
  type StorePayoutAction,
  type StorePayoutState,
} from "./sellerPayoutFoundation";
import {
  reconcileSettlementPayoutCapture,
  type SettlementPayoutReconRow,
} from "./settlementPayoutReconciliation";

export const PAYOUT_BOOKING_OPS_HELPERS_ID =
  "commerce.settlement.payout_booking_ops_helpers_v1" as const;

export const PAYOUT_BOOKING_OPS_ACTIONS = STORE_PAYOUT_ACTIONS;
export type PayoutBookingOpsAction = StorePayoutAction;

type AnyClient = SupabaseClient;

export type TrustedPayoutBookingContext = {
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  captureEventKey: string;
  correlationId: string;
  amountMinor: number;
  currency: string;
  orderPaymentStatus: string;
  attemptStatus: string;
  settlementState: "RELEASED" | "NOT_RELEASED" | "REVERSED_OR_BLOCKED";
  payoutState: StorePayoutState;
  hasRefund: boolean;
  hasDisputedOrReversedFunds: boolean;
  submitCount: number;
  failCount: number;
  confirmCount: number;
};

export type PayoutBookingOpsFailureCode =
  | "malformed_id"
  | "unauthorized_store"
  | "missing_capture"
  | "missing_settlement"
  | "not_released"
  | "refunded_or_disputed"
  | "currency_mismatch"
  | "inconsistent_ledger"
  | "invalid_idempotency_key"
  | "client_money_rejected"
  | "stale_state"
  | "terminal_completed"
  | "concurrent_conflict"
  | "rpc_failed";

export type PayoutBookingOpsResult =
  | {
      ok: true;
      action: PayoutBookingOpsAction;
      replayed: boolean;
      payoutState: StorePayoutState;
      amountMinor: number;
      currency: string;
      storeId: string;
      orderId: string;
      paymentAttemptId: string;
      captureEventId: string;
      eventKey: string;
      eventId: string | null;
      data: Record<string, unknown>;
      reconciliation: SettlementPayoutReconRow;
    }
  | {
      ok: false;
      code: PayoutBookingOpsFailureCode;
      message: string;
    };

export type PayoutBookingOpsInput = {
  storeId: string;
  paymentAttemptId: string;
  /** Claim-first idempotency key (8..128). Replays return the original result. */
  idempotencyKey: string;
  /**
   * Optional assertion only — must match trusted capture currency.
   * Never used as the money source of truth.
   */
  expectedCurrency?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeCurrency(currency: string): string | null {
  const c = currency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

function validateIdempotencyKey(
  key: string
): { ok: true; key: string } | { ok: false; message: string } {
  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 128) {
    return {
      ok: false,
      message: "idempotencyKey must be 8..128 characters.",
    };
  }
  return { ok: true, key: trimmed };
}

/** Fail closed if a loose bag smuggles client money / commission fields. */
export function rejectClientPayoutBookingMoneyFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(amount|total|balance|commission|net_|gross_|fee|payout_sum)/i.test(
        key
      ) ||
      /_minor$/i.test(key) ||
      key === "amountMinor" ||
      key === "amount_minor" ||
      key === "lines" ||
      key === "submit_event_id" ||
      key === "rail" ||
      key === "bank_account" ||
      key === "beneficiary"
    ) {
      if (
        key === "storeId" ||
        key === "store_id" ||
        key === "paymentAttemptId" ||
        key === "payment_attempt_id" ||
        key === "idempotencyKey" ||
        key === "expectedCurrency"
      ) {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply money, commission, rail, or posting fields to payout booking ops.",
      };
    }
  }
  return { ok: true };
}

export function buildPayoutBookingEventKey(
  captureEventKey: string,
  action: PayoutBookingOpsAction,
  attemptOrdinal = 1
): string {
  const base = captureEventKey.trim();
  if (action === "submit" && attemptOrdinal > 1) {
    return `${base}:payout:submit:${attemptOrdinal}`;
  }
  return `${base}:payout:${action}`;
}

function mapPayoutState(raw: unknown): StorePayoutState {
  const s = String(raw ?? "NONE").toUpperCase();
  if (s === "IN_TRANSIT" || s === "COMPLETED" || s === "NONE") return s;
  return "NONE";
}

function classifyRpcError(message: string): PayoutBookingOpsFailureCode {
  const m = message.toLowerCase();
  if (
    m.includes("concurrent") ||
    m.includes("double submit") ||
    m.includes("active in-transit")
  ) {
    return "concurrent_conflict";
  }
  if (m.includes("completed") && (m.includes("terminal") || m.includes("confirm"))) {
    return "terminal_completed";
  }
  if (
    m.includes("already finalized") ||
    m.includes("not allowed in state") ||
    m.includes("requires an active") ||
    m.includes("replay original")
  ) {
    return "stale_state";
  }
  if (m.includes("refund")) return "refunded_or_disputed";
  if (m.includes("released") || m.includes("settlement state")) {
    return "not_released";
  }
  if (m.includes("currency") || m.includes("amount_minor")) {
    return "currency_mismatch";
  }
  if (
    m.includes("fingerprint") ||
    m.includes("idempotency conflict") ||
    m.includes("diverges") ||
    m.includes("inconsistent")
  ) {
    return "inconsistent_ledger";
  }
  if (
    m.includes("not found") ||
    m.includes("capture") ||
    m.includes("payment attempt")
  ) {
    return "missing_capture";
  }
  return "rpc_failed";
}

/**
 * Validate loaded trusted facts before any write.
 * Does not trust caller money — only verifies consistency of server facts.
 * Payout state-machine / idempotent replay remain DB-authoritative in
 * apply_store_payout_event (so duplicate keys can still replay safely).
 */
export function assertTrustedPayoutBookingContext(
  ctx: TrustedPayoutBookingContext,
  _action: PayoutBookingOpsAction,
  expectedCurrency?: string
): { ok: true } | { ok: false; code: PayoutBookingOpsFailureCode; message: string } {
  const currency = normalizeCurrency(ctx.currency);
  if (!currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Trusted capture currency is invalid.",
    };
  }
  if (
    typeof ctx.amountMinor !== "number" ||
    !Number.isInteger(ctx.amountMinor) ||
    ctx.amountMinor <= 0
  ) {
    return {
      ok: false,
      code: "inconsistent_ledger",
      message: "Trusted capture amount is invalid.",
    };
  }
  if (ctx.hasRefund || ctx.hasDisputedOrReversedFunds) {
    return {
      ok: false,
      code: "refunded_or_disputed",
      message:
        "Payout blocked: refunded, disputed, or reversed funds cannot move.",
    };
  }
  if (ctx.settlementState === "REVERSED_OR_BLOCKED") {
    return {
      ok: false,
      code: "refunded_or_disputed",
      message: "Payout blocked: settlement funds are reversed or blocked.",
    };
  }
  if (ctx.settlementState !== "RELEASED") {
    return {
      ok: false,
      code: "not_released",
      message: `Payout requires settlement RELEASED (state ${ctx.settlementState}).`,
    };
  }
  if (ctx.orderPaymentStatus !== "paid" || ctx.attemptStatus !== "captured") {
    return {
      ok: false,
      code: "inconsistent_ledger",
      message: "Payout requires paid order and captured payment attempt.",
    };
  }
  if (expectedCurrency) {
    const expected = normalizeCurrency(expectedCurrency);
    if (!expected || expected !== currency) {
      return {
        ok: false,
        code: "currency_mismatch",
        message: "Caller expectedCurrency does not match trusted capture currency.",
      };
    }
  }

  return { ok: true };
}

function buildReconFromContext(
  ctx: TrustedPayoutBookingContext,
  payoutState: StorePayoutState,
  counts?: { submit: number; fail: number; confirm: number }
): SettlementPayoutReconRow {
  return reconcileSettlementPayoutCapture({
    orderId: ctx.orderId,
    paymentAttemptId: ctx.paymentAttemptId,
    captureEventId: ctx.captureEventId,
    amountMinor: ctx.amountMinor,
    currency: ctx.currency,
    settlementState: ctx.settlementState === "RELEASED" ? "RELEASED" : "ALLOCATED",
    payoutState,
    submitCount: counts?.submit ?? ctx.submitCount,
    failCount: counts?.fail ?? ctx.failCount,
    confirmCount: counts?.confirm ?? ctx.confirmCount,
    hasRefund: ctx.hasRefund,
    captureCreatedAt: "1970-01-01T00:00:00.000Z",
  });
}

function projectSuccess(
  action: PayoutBookingOpsAction,
  ctx: TrustedPayoutBookingContext,
  payload: Record<string, unknown>,
  eventKey: string
): Extract<PayoutBookingOpsResult, { ok: true }> {
  const payoutState = mapPayoutState(payload.payout_state);
  const replayed = Boolean(payload.replayed);
  let submitCount = ctx.submitCount;
  let failCount = ctx.failCount;
  let confirmCount = ctx.confirmCount;
  if (!replayed) {
    if (action === "submit") submitCount += 1;
    if (action === "fail") failCount += 1;
    if (action === "confirm") confirmCount += 1;
  }
  return {
    ok: true,
    action,
    replayed,
    payoutState,
    amountMinor: ctx.amountMinor,
    currency: ctx.currency,
    storeId: ctx.storeId,
    orderId: ctx.orderId,
    paymentAttemptId: ctx.paymentAttemptId,
    captureEventId: ctx.captureEventId,
    eventKey: String(payload.event_key ?? eventKey),
    eventId:
      typeof payload.event_id === "string"
        ? payload.event_id
        : payload.event_id == null
          ? null
          : String(payload.event_id),
    data: payload,
    reconciliation: buildReconFromContext(ctx, payoutState, {
      submit: submitCount,
      fail: failCount,
      confirm: confirmCount,
    }),
  };
}

type OutcomeRow = {
  id: string;
  event_key: string;
  correlation_id: string;
  amount_minor: number;
  currency: string;
  outcome: string;
  order_id: string;
  created_at: string;
};

type PayoutEventRow = {
  id: string;
  action: string;
  submit_event_id: string | null;
};

/**
 * Load trusted booking context from settlement / payout / capture facts.
 * Fail closed on missing rows, foreign store, or inconsistent money.
 */
export async function loadTrustedPayoutBookingContext(
  supabase: AnyClient,
  input: { storeId: string; paymentAttemptId: string }
): Promise<
  | { ok: true; context: TrustedPayoutBookingContext }
  | { ok: false; code: PayoutBookingOpsFailureCode; message: string }
> {
  if (!isUuid(input.storeId) || !isUuid(input.paymentAttemptId)) {
    return {
      ok: false,
      code: "malformed_id",
      message: "storeId and paymentAttemptId must be valid UUIDs.",
    };
  }

  const { data: attempt, error: attemptErr } = await supabase
    .from("payment_attempts")
    .select("id, order_id, amount_minor, currency, status")
    .eq("id", input.paymentAttemptId)
    .maybeSingle();

  if (attemptErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: attemptErr.message?.trim() || "Unable to load payment attempt.",
    };
  }
  if (!attempt) {
    return {
      ok: false,
      code: "missing_capture",
      message: "Payment attempt not found.",
    };
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, store_id, currency, grand_total_minor, payment_status")
    .eq("id", attempt.order_id)
    .maybeSingle();

  if (orderErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: orderErr.message?.trim() || "Unable to load order.",
    };
  }
  if (!order) {
    return {
      ok: false,
      code: "missing_capture",
      message: "Order not found for payment attempt.",
    };
  }
  if (String(order.store_id) !== input.storeId) {
    return {
      ok: false,
      code: "unauthorized_store",
      message: "Payment attempt does not belong to the requested store.",
    };
  }

  const { data: outcomes, error: outcomeErr } = await supabase
    .from("store_payment_outcome_events")
    .select(
      "id, event_key, correlation_id, amount_minor, currency, outcome, order_id, created_at"
    )
    .eq("payment_attempt_id", input.paymentAttemptId)
    .order("created_at", { ascending: true });

  if (outcomeErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: outcomeErr.message?.trim() || "Unable to load payment outcomes.",
    };
  }

  const rows = (outcomes ?? []) as OutcomeRow[];
  const capture = rows.find((r) => r.outcome === "captured");
  if (!capture) {
    return {
      ok: false,
      code: "missing_capture",
      message: "Trusted capture outcome is required for payout booking.",
    };
  }
  const hasRefund = rows.some((r) => r.outcome === "refunded");

  const attemptCurrency = normalizeCurrency(String(attempt.currency ?? ""));
  const orderCurrency = normalizeCurrency(String(order.currency ?? ""));
  const captureCurrency = normalizeCurrency(String(capture.currency ?? ""));
  if (!attemptCurrency || !orderCurrency || !captureCurrency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Trusted currency is missing or invalid.",
    };
  }
  if (
    attemptCurrency !== orderCurrency ||
    attemptCurrency !== captureCurrency
  ) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Currency mismatch across attempt, order, and capture.",
    };
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
    return {
      ok: false,
      code: "inconsistent_ledger",
      message: "Amount mismatch across attempt, order, and capture.",
    };
  }

  const { data: settlementEvents, error: settleErr } = await supabase
    .from("store_settlement_events")
    .select("id, action, ueos_journal_entry_id, created_at")
    .eq("capture_event_id", capture.id)
    .order("created_at", { ascending: true });

  if (settleErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: settleErr.message?.trim() || "Unable to load settlement events.",
    };
  }

  const settleRows = (settlementEvents ?? []) as Array<{
    id: string;
    action: string;
    ueos_journal_entry_id: string | null;
  }>;
  const hasReverse = settleRows.some((e) => e.action === "reverse");
  const release = [...settleRows]
    .reverse()
    .find((e) => e.action === "release" && e.ueos_journal_entry_id != null);

  let settlementState: TrustedPayoutBookingContext["settlementState"] =
    "NOT_RELEASED";
  if (hasReverse && !release) {
    settlementState = "REVERSED_OR_BLOCKED";
  } else if (release) {
    // If a reverse appears after the latest completed release, treat as blocked.
    const releaseIdx = settleRows.findIndex((e) => e.id === release.id);
    const reverseAfter = settleRows
      .slice(releaseIdx + 1)
      .some((e) => e.action === "reverse");
    settlementState = reverseAfter ? "REVERSED_OR_BLOCKED" : "RELEASED";
  } else if (hasReverse) {
    settlementState = "REVERSED_OR_BLOCKED";
  }

  const { data: payoutEvents, error: payoutErr } = await supabase
    .from("store_payout_events")
    .select("id, action, submit_event_id")
    .eq("capture_event_id", capture.id)
    .order("created_at", { ascending: true });

  if (payoutErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: payoutErr.message?.trim() || "Unable to load payout events.",
    };
  }

  const payoutRows = (payoutEvents ?? []) as PayoutEventRow[];
  const submitCount = payoutRows.filter((e) => e.action === "submit").length;
  const failCount = payoutRows.filter((e) => e.action === "fail").length;
  const confirmCount = payoutRows.filter((e) => e.action === "confirm").length;

  let payoutState: StorePayoutState = "NONE";
  for (const ev of payoutRows) {
    if (ev.action === "submit") payoutState = "IN_TRANSIT";
    else if (ev.action === "confirm") {
      if (payoutState !== "IN_TRANSIT") {
        return {
          ok: false,
          code: "inconsistent_ledger",
          message: "Corrupt payout history: confirm outside IN_TRANSIT.",
        };
      }
      payoutState = "COMPLETED";
    } else if (ev.action === "fail") {
      if (payoutState !== "IN_TRANSIT") {
        return {
          ok: false,
          code: "inconsistent_ledger",
          message: "Corrupt payout history: fail outside IN_TRANSIT.",
        };
      }
      payoutState = "NONE";
    }
  }

  const disputedStatus =
    String(order.payment_status).toLowerCase() === "disputed";

  return {
    ok: true,
    context: {
      storeId: input.storeId,
      orderId: String(order.id),
      paymentAttemptId: input.paymentAttemptId,
      captureEventId: String(capture.id),
      captureEventKey: String(capture.event_key),
      correlationId: String(capture.correlation_id),
      amountMinor: captureAmount,
      currency: captureCurrency,
      orderPaymentStatus: String(order.payment_status),
      attemptStatus: String(attempt.status),
      settlementState,
      payoutState,
      hasRefund,
      hasDisputedOrReversedFunds:
        disputedStatus || settlementState === "REVERSED_OR_BLOCKED",
      submitCount,
      failCount,
      confirmCount,
    },
  };
}

async function applyPayoutBookingAction(
  supabase: AnyClient,
  action: PayoutBookingOpsAction,
  input: PayoutBookingOpsInput,
  deps?: {
    loadContext?: typeof loadTrustedPayoutBookingContext;
  }
): Promise<PayoutBookingOpsResult> {
  const moneyGuard = rejectClientPayoutBookingMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!moneyGuard.ok) {
    return {
      ok: false,
      code: "client_money_rejected",
      message: moneyGuard.message,
    };
  }

  if (!isUuid(input.storeId) || !isUuid(input.paymentAttemptId)) {
    return {
      ok: false,
      code: "malformed_id",
      message: "storeId and paymentAttemptId must be valid UUIDs.",
    };
  }

  const key = validateIdempotencyKey(input.idempotencyKey);
  if (!key.ok) {
    return {
      ok: false,
      code: "invalid_idempotency_key",
      message: key.message,
    };
  }

  const loader = deps?.loadContext ?? loadTrustedPayoutBookingContext;
  const loaded = await loader(supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      code: loaded.code,
      message: loaded.message,
    };
  }

  const gate = assertTrustedPayoutBookingContext(
    loaded.context,
    action,
    input.expectedCurrency
  );
  if (!gate.ok) {
    return { ok: false, code: gate.code, message: gate.message };
  }

  const ctx = loaded.context;
  const { data, error } = await supabase.rpc(STORE_PAYOUT_RPC, {
    p_action: action,
    p_event_key: key.key,
    p_correlation_id: ctx.correlationId,
    p_payment_attempt_id: ctx.paymentAttemptId,
    p_amount_minor: ctx.amountMinor,
    p_currency: ctx.currency,
    p_metadata: {
      note: PAYOUT_BOOKING_OPS_HELPERS_ID,
      provider_event_type: `store.payout.${action}`,
    },
  });

  if (error) {
    const message =
      error.message?.trim() || `Payout ${action} failed via foundation RPC.`;
    return {
      ok: false,
      code: classifyRpcError(message),
      message,
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return projectSuccess(action, ctx, payload, key.key);
}

/** Submit: RELEASED payable → IN_TRANSIT (reserve/debit available payable). */
export async function submitPayoutBooking(
  supabase: AnyClient,
  input: PayoutBookingOpsInput,
  deps?: { loadContext?: typeof loadTrustedPayoutBookingContext }
): Promise<PayoutBookingOpsResult> {
  return applyPayoutBookingAction(supabase, "submit", input, deps);
}

/** Fail: IN_TRANSIT → NONE (release reservation back to payable exactly once). */
export async function failPayoutBooking(
  supabase: AnyClient,
  input: PayoutBookingOpsInput,
  deps?: { loadContext?: typeof loadTrustedPayoutBookingContext }
): Promise<PayoutBookingOpsResult> {
  return applyPayoutBookingAction(supabase, "fail", input, deps);
}

/** Confirm: IN_TRANSIT → COMPLETED (custody exit finalize exactly once). */
export async function confirmPayoutBooking(
  supabase: AnyClient,
  input: PayoutBookingOpsInput,
  deps?: { loadContext?: typeof loadTrustedPayoutBookingContext }
): Promise<PayoutBookingOpsResult> {
  return applyPayoutBookingAction(supabase, "confirm", input, deps);
}
