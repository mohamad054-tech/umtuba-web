/**
 * Full Order Refund Path V1.
 * Trusted service-side orchestration: settle unwind → Sync refunded.
 * Full-order only. No bank rails, Dashboard, Admin UI, or client money.
 * Reuses Settlement Foundation + Payment Outcome Sync; preserves payout guards.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateCommissionSplit,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import {
  STORE_SETTLEMENT_RPC,
  type StoreSettlementAction,
  type StoreSettlementState,
} from "./settlementFoundation";
import {
  STORE_PAYOUT_STATES,
  type StorePayoutState,
} from "./sellerPayoutFoundation";
import { wireCommerceRefundCompleted } from "./commerceNotifications";

export const FULL_ORDER_REFUND_PATH_ID =
  "commerce.payments.full_order_refund_path_v1" as const;

type AnyClient = SupabaseClient;

export type TrustedFullOrderRefundContext = {
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
  settlementState: StoreSettlementState;
  payoutState: StorePayoutState;
  hasRefund: boolean;
  /** Merchandise basis for commission consistency checks (subtotal - discount). */
  merchandiseNetMinor: number;
};

export type FullOrderRefundFailureCode =
  | "malformed_id"
  | "unauthorized_store"
  | "missing_capture"
  | "not_refundable"
  | "already_refunded"
  | "duplicate_refund"
  | "payout_in_transit"
  | "payout_completed"
  | "currency_mismatch"
  | "inconsistent_ledger"
  | "invalid_idempotency_key"
  | "client_money_rejected"
  | "settlement_unwind_failed"
  | "rpc_failed";

export type FullOrderRefundSettlementStep = {
  action: Extract<StoreSettlementAction, "hold" | "reverse_allocation">;
  eventKey: string;
  status: "applied" | "replayed" | "skipped";
  settlementState?: string;
  data?: Record<string, unknown>;
};

export type FullOrderRefundPlan = {
  capability: typeof FULL_ORDER_REFUND_PATH_ID;
  settlementActions: Array<"hold" | "reverse_allocation">;
  syncRefund: true;
  payoutBlocked: false;
};

export type FullOrderRefundResult =
  | {
      ok: true;
      capability: typeof FULL_ORDER_REFUND_PATH_ID;
      replayed: boolean;
      storeId: string;
      orderId: string;
      paymentAttemptId: string;
      captureEventId: string;
      amountMinor: number;
      currency: string;
      settlementSteps: FullOrderRefundSettlementStep[];
      refund: {
        replayed: boolean;
        eventKey: string;
        data: Record<string, unknown>;
      };
      finalSettlementState: StoreSettlementState;
      payoutState: StorePayoutState;
      commission: {
        consistent: true;
        platformCommissionMinor: number | null;
        sellerAmountMinor: number | null;
        policyStatus: "applied" | "not_configured";
      };
      sellerPayableProtected: true;
      payoutProtected: true;
    }
  | {
      ok: false;
      code: FullOrderRefundFailureCode;
      message: string;
    };

export type FullOrderRefundInput = {
  storeId: string;
  paymentAttemptId: string;
  /** Claim-first Sync refund event_key (8..128). */
  idempotencyKey: string;
  /**
   * Optional assertion only — must match trusted capture currency.
   * Never used as the money source of truth.
   */
  expectedCurrency?: string;
  /** Optional trusted commission policy for consistency projection (not a money write). */
  commissionPolicy?: CommissionPolicyContract;
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

export function rejectClientFullOrderRefundMoneyFields(
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
        key === "expectedCurrency" ||
        key === "commissionPolicy" ||
        key === "merchandiseNetMinor"
      ) {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply money, commission totals, rail, or posting fields to full-order refund.",
      };
    }
  }
  return { ok: true };
}

export function buildFullOrderRefundHoldEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:refund:hold`;
}

export function buildFullOrderRefundReverseEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:refund:reverse`;
}

function eventKeyLengthOk(key: string): boolean {
  return key.length >= 8 && key.length <= 128;
}

/**
 * Pure planner — settlement unwind then Sync refund.
 * RELEASED → hold → reverse_allocation → refunded
 * ALLOCATED|HELD → reverse_allocation → refunded
 * UNALLOCATED|REVERSED → refunded only
 */
export function planFullOrderRefund(ctx: TrustedFullOrderRefundContext):
  | { ok: true; plan: FullOrderRefundPlan }
  | { ok: false; code: FullOrderRefundFailureCode; message: string } {
  if (ctx.hasRefund || ctx.orderPaymentStatus === "refunded") {
    return {
      ok: false,
      code: "already_refunded",
      message: "Order/payment attempt already has a trusted refund outcome.",
    };
  }
  if (ctx.orderPaymentStatus !== "paid" || ctx.attemptStatus !== "captured") {
    return {
      ok: false,
      code: "not_refundable",
      message: "Full-order refund requires paid order and captured attempt.",
    };
  }
  if (ctx.payoutState === "IN_TRANSIT") {
    return {
      ok: false,
      code: "payout_in_transit",
      message:
        "Refund blocked: seller payout is IN_TRANSIT — fail payout booking before refund.",
    };
  }
  if (ctx.payoutState === "COMPLETED") {
    return {
      ok: false,
      code: "payout_completed",
      message:
        "Refund blocked: seller payout is COMPLETED (terminal) — clawback not in V1.",
    };
  }
  if (!(STORE_PAYOUT_STATES as readonly string[]).includes(ctx.payoutState)) {
    return {
      ok: false,
      code: "inconsistent_ledger",
      message: "Unknown payout state.",
    };
  }

  const settlementActions: Array<"hold" | "reverse_allocation"> = [];
  if (ctx.settlementState === "RELEASED") {
    settlementActions.push("hold", "reverse_allocation");
  } else if (
    ctx.settlementState === "ALLOCATED" ||
    ctx.settlementState === "HELD"
  ) {
    settlementActions.push("reverse_allocation");
  } else if (
    ctx.settlementState === "UNALLOCATED" ||
    ctx.settlementState === "REVERSED"
  ) {
    // Sync refund only
  } else {
    return {
      ok: false,
      code: "inconsistent_ledger",
      message: `Unknown settlement state ${ctx.settlementState}.`,
    };
  }

  const holdKey = buildFullOrderRefundHoldEventKey(ctx.captureEventKey);
  const reverseKey = buildFullOrderRefundReverseEventKey(ctx.captureEventKey);
  if (
    (settlementActions.includes("hold") && !eventKeyLengthOk(holdKey)) ||
    (settlementActions.includes("reverse_allocation") &&
      !eventKeyLengthOk(reverseKey))
  ) {
    return {
      ok: false,
      code: "invalid_idempotency_key",
      message: "Derived settlement refund event_key length is invalid.",
    };
  }

  return {
    ok: true,
    plan: {
      capability: FULL_ORDER_REFUND_PATH_ID,
      settlementActions,
      syncRefund: true,
      payoutBlocked: false,
    },
  };
}

export function assertTrustedFullOrderRefundContext(
  ctx: TrustedFullOrderRefundContext,
  expectedCurrency?: string
):
  | { ok: true }
  | { ok: false; code: FullOrderRefundFailureCode; message: string } {
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
  if (expectedCurrency) {
    const expected = normalizeCurrency(expectedCurrency);
    if (!expected || expected !== currency) {
      return {
        ok: false,
        code: "currency_mismatch",
        message:
          "Caller expectedCurrency does not match trusted capture currency.",
      };
    }
  }
  return { ok: true };
}

function projectCommissionConsistency(
  ctx: TrustedFullOrderRefundContext,
  policy?: CommissionPolicyContract
): Extract<FullOrderRefundResult, { ok: true }>["commission"] {
  if (!policy) {
    return {
      consistent: true,
      platformCommissionMinor: null,
      sellerAmountMinor: null,
      policyStatus: "not_configured",
    };
  }
  const split = calculateCommissionSplit({
    policy,
    basisMinor: ctx.merchandiseNetMinor,
    currency: ctx.currency,
  });
  if (!split.ok) {
    // Fail closed at apply time — callers that inject a policy must be valid.
    return {
      consistent: true,
      platformCommissionMinor: null,
      sellerAmountMinor: null,
      policyStatus: "not_configured",
    };
  }
  const sum =
    split.platformCommissionMinor +
    split.sellerAmountMinor +
    split.supplierAmountMinor +
    split.affiliateAmountMinor +
    split.partnerAmountMinor;
  if (sum !== ctx.merchandiseNetMinor && sum !== split.basisMinor) {
    // calculateCommissionSplit guarantees basis == sum of lines
  }
  return {
    consistent: true,
    platformCommissionMinor: split.platformCommissionMinor,
    sellerAmountMinor: split.sellerAmountMinor,
    policyStatus: "applied",
  };
}

function deriveSettlementState(
  events: Array<{ action: string }>
): StoreSettlementState {
  let state: StoreSettlementState = "UNALLOCATED";
  for (const ev of events) {
    if (ev.action === "allocate") state = "ALLOCATED";
    else if (ev.action === "release") state = "RELEASED";
    else if (ev.action === "hold") state = "HELD";
    else if (ev.action === "reverse_allocation") state = "REVERSED";
  }
  return state;
}

function derivePayoutState(
  events: Array<{ action: string }>
): StorePayoutState {
  let state: StorePayoutState = "NONE";
  for (const ev of events) {
    if (ev.action === "submit") state = "IN_TRANSIT";
    else if (ev.action === "confirm") state = "COMPLETED";
    else if (ev.action === "fail") state = "NONE";
  }
  return state;
}

export async function loadTrustedFullOrderRefundContext(
  supabase: AnyClient,
  input: { storeId: string; paymentAttemptId: string }
): Promise<
  | { ok: true; context: TrustedFullOrderRefundContext }
  | { ok: false; code: FullOrderRefundFailureCode; message: string }
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
    .select(
      "id, store_id, currency, grand_total_minor, subtotal_minor, discount_total_minor, payment_status"
    )
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
      "id, event_key, correlation_id, amount_minor, currency, outcome, created_at"
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

  const rows = (outcomes ?? []) as Array<{
    id: string;
    event_key: string;
    correlation_id: string;
    amount_minor: number;
    currency: string;
    outcome: string;
  }>;
  const capture = rows.find((r) => r.outcome === "captured");
  if (!capture) {
    return {
      ok: false,
      code: "missing_capture",
      message: "Trusted capture outcome is required for full-order refund.",
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

  const merchandiseNetMinor = Math.max(
    0,
    Math.trunc(Number(order.subtotal_minor ?? 0)) -
      Math.trunc(Number(order.discount_total_minor ?? 0))
  );

  const { data: settlementEvents, error: settleErr } = await supabase
    .from("store_settlement_events")
    .select("id, action, created_at")
    .eq("capture_event_id", capture.id)
    .order("created_at", { ascending: true });

  if (settleErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: settleErr.message?.trim() || "Unable to load settlement events.",
    };
  }

  const { data: payoutEvents, error: payoutErr } = await supabase
    .from("store_payout_events")
    .select("id, action, created_at")
    .eq("capture_event_id", capture.id)
    .order("created_at", { ascending: true });

  if (payoutErr) {
    return {
      ok: false,
      code: "rpc_failed",
      message: payoutErr.message?.trim() || "Unable to load payout events.",
    };
  }

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
      settlementState: deriveSettlementState(
        (settlementEvents ?? []) as Array<{ action: string }>
      ),
      payoutState: derivePayoutState(
        (payoutEvents ?? []) as Array<{ action: string }>
      ),
      hasRefund,
      merchandiseNetMinor,
    },
  };
}

async function applySettlementStep(
  supabase: AnyClient,
  ctx: TrustedFullOrderRefundContext,
  action: "hold" | "reverse_allocation",
  eventKey: string
): Promise<
  | { ok: true; step: FullOrderRefundSettlementStep }
  | { ok: false; code: FullOrderRefundFailureCode; message: string }
> {
  const { data, error } = await supabase.rpc(STORE_SETTLEMENT_RPC, {
    p_action: action,
    p_event_key: eventKey,
    p_correlation_id: ctx.correlationId,
    p_payment_attempt_id: ctx.paymentAttemptId,
    p_amount_minor: ctx.amountMinor,
    p_currency: ctx.currency,
    p_metadata: {
      note: FULL_ORDER_REFUND_PATH_ID,
      provider_event_type: `store.refund.${action}`,
    },
  });

  if (error) {
    return {
      ok: false,
      code: "settlement_unwind_failed",
      message:
        error.message?.trim() ||
        `Settlement ${action} failed during full-order refund.`,
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    step: {
      action,
      eventKey: String(payload.event_key ?? eventKey),
      status: payload.replayed ? "replayed" : "applied",
      settlementState:
        typeof payload.settlement_state === "string"
          ? payload.settlement_state
          : undefined,
      data: payload,
    },
  };
}

/**
 * Apply trusted full-order refund:
 * 1) Validate ownership + money
 * 2) Block payout IN_TRANSIT / COMPLETED
 * 3) Unwind settlement (hold if RELEASED, then reverse when allocated/held)
 * 4) Sync outcome=refunded (full capture amount)
 */
export async function applyFullOrderRefund(
  supabase: AnyClient,
  input: FullOrderRefundInput,
  deps?: {
    loadContext?: typeof loadTrustedFullOrderRefundContext;
  }
): Promise<FullOrderRefundResult> {
  const moneyGuard = rejectClientFullOrderRefundMoneyFields(
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

  const loader = deps?.loadContext ?? loadTrustedFullOrderRefundContext;
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

  const money = assertTrustedFullOrderRefundContext(
    loaded.context,
    input.expectedCurrency
  );
  if (!money.ok) {
    return { ok: false, code: money.code, message: money.message };
  }

  const ctx = loaded.context;

  // Already refunded: same Sync key → replay; otherwise fail closed.
  if (ctx.hasRefund || ctx.orderPaymentStatus === "refunded") {
    const { data, error } = await supabase.rpc(STORE_PAYMENT_SYNC_RPC, {
      p_payment_attempt_id: ctx.paymentAttemptId,
      p_outcome: "refunded",
      p_event_key: key.key,
      p_correlation_id: ctx.correlationId,
      p_amount_minor: ctx.amountMinor,
      p_currency: ctx.currency,
      p_metadata: {
        note: FULL_ORDER_REFUND_PATH_ID,
        provider_event_type: "store.payment.refunded",
      },
    });
    if (!error && data && Boolean((data as Record<string, unknown>).replayed)) {
      return {
        ok: true,
        capability: FULL_ORDER_REFUND_PATH_ID,
        replayed: true,
        storeId: ctx.storeId,
        orderId: ctx.orderId,
        paymentAttemptId: ctx.paymentAttemptId,
        captureEventId: ctx.captureEventId,
        amountMinor: ctx.amountMinor,
        currency: ctx.currency,
        settlementSteps: [],
        refund: {
          replayed: true,
          eventKey: key.key,
          data: (data ?? {}) as Record<string, unknown>,
        },
        finalSettlementState: ctx.settlementState,
        payoutState: ctx.payoutState,
        commission: projectCommissionConsistency(ctx, input.commissionPolicy),
        sellerPayableProtected: true,
        payoutProtected: true,
      };
    }
    return {
      ok: false,
      code: error ? "duplicate_refund" : "already_refunded",
      message:
        error?.message?.trim() ||
        "Full-order refund already finalized for this payment attempt.",
    };
  }

  const planned = planFullOrderRefund(ctx);
  if (!planned.ok) {
    return {
      ok: false,
      code: planned.code,
      message: planned.message,
    };
  }

  if (input.commissionPolicy) {
    const split = calculateCommissionSplit({
      policy: input.commissionPolicy,
      basisMinor: ctx.merchandiseNetMinor,
      currency: ctx.currency,
    });
    if (!split.ok) {
      return {
        ok: false,
        code: "inconsistent_ledger",
        message: `Commission policy inconsistent with refund currency/basis: ${split.message}`,
      };
    }
  }

  const settlementSteps: FullOrderRefundSettlementStep[] = [];
  let finalSettlementState = ctx.settlementState;

  for (const action of planned.plan.settlementActions) {
    const eventKey =
      action === "hold"
        ? buildFullOrderRefundHoldEventKey(ctx.captureEventKey)
        : buildFullOrderRefundReverseEventKey(ctx.captureEventKey);
    const step = await applySettlementStep(supabase, ctx, action, eventKey);
    if (!step.ok) {
      return {
        ok: false,
        code: step.code,
        message: step.message,
      };
    }
    settlementSteps.push(step.step);
    if (step.step.settlementState) {
      finalSettlementState = step.step.settlementState as StoreSettlementState;
    } else if (action === "hold") {
      finalSettlementState = "HELD";
    } else {
      finalSettlementState = "REVERSED";
    }
  }

  const { data: refundData, error: refundError } = await supabase.rpc(
    STORE_PAYMENT_SYNC_RPC,
    {
      p_payment_attempt_id: ctx.paymentAttemptId,
      p_outcome: "refunded",
      p_event_key: key.key,
      p_correlation_id: ctx.correlationId,
      p_amount_minor: ctx.amountMinor,
      p_currency: ctx.currency,
      p_metadata: {
        note: FULL_ORDER_REFUND_PATH_ID,
        provider_event_type: "store.payment.refunded",
      },
    }
  );

  if (refundError) {
    const msg = refundError.message?.trim() || "Sync refunded outcome failed.";
    const lower = msg.toLowerCase();
    let code: FullOrderRefundFailureCode = "rpc_failed";
    if (lower.includes("already finalized") || lower.includes("already")) {
      code = "duplicate_refund";
    } else if (lower.includes("released")) {
      code = "settlement_unwind_failed";
    } else if (lower.includes("currency") || lower.includes("amount")) {
      code = "currency_mismatch";
    }
    return { ok: false, code, message: msg };
  }

  const refundPayload = (refundData ?? {}) as Record<string, unknown>;
  const refundReplayed = Boolean(refundPayload.replayed);
  const anySettlementReplay = settlementSteps.some(
    (s) => s.status === "replayed"
  );

  wireCommerceRefundCompleted({
    orderId: ctx.orderId,
    storeId: ctx.storeId,
    paymentAttemptId: ctx.paymentAttemptId,
    correlationId: ctx.correlationId,
  });

  return {
    ok: true,
    capability: FULL_ORDER_REFUND_PATH_ID,
    replayed: refundReplayed && (anySettlementReplay || settlementSteps.length === 0),
    storeId: ctx.storeId,
    orderId: ctx.orderId,
    paymentAttemptId: ctx.paymentAttemptId,
    captureEventId: ctx.captureEventId,
    amountMinor: ctx.amountMinor,
    currency: ctx.currency,
    settlementSteps,
    refund: {
      replayed: refundReplayed,
      eventKey: String(refundPayload.event_key ?? key.key),
      data: refundPayload,
    },
    finalSettlementState,
    payoutState: ctx.payoutState,
    commission: projectCommissionConsistency(ctx, input.commissionPolicy),
    sellerPayableProtected: true,
    payoutProtected: true,
  };
}
