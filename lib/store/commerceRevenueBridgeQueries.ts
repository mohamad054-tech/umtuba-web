/**
 * Server-side Commerce → shared ledger bridge orchestration.
 * Money is always reloaded from order rows. Ledger writes require a
 * service-role Supabase client (existing Sync/Settlement EXECUTE grants).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCommerceFinancialEvent,
  planCommerceRevenueBridgePosting,
  rejectClientBridgeMoneyFields,
  type CommerceOrderMoneySnapshot,
  type CommerceRevenueBridgeResult,
  type CommerceRevenueReconciliationIssue,
} from "./commerceRevenueBridge";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";

type AnyClient = SupabaseClient;

function uuidOk(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Reload trusted order money + best payment attempt from the database.
 * Never trusts client money fields.
 */
export async function loadCommerceOrderMoneySnapshot(
  supabase: AnyClient,
  orderId: string
): Promise<
  | { ok: true; snapshot: CommerceOrderMoneySnapshot }
  | { ok: false; message: string; issue: CommerceRevenueReconciliationIssue }
> {
  const trimmed = orderId.trim();
  if (!uuidOk(trimmed)) {
    return {
      ok: false,
      message: "Order not found.",
      issue: {
        code: "order_unresolvable",
        severity: "error",
        message: "Order id invalid.",
        orderId: trimmed,
      },
    };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, store_id, buyer_id, currency, subtotal_minor, discount_total_minor, tax_total_minor, shipping_total_minor, grand_total_minor, payment_status, status, created_at, confirmed_at"
    )
    .eq("id", trimmed)
    .maybeSingle();

  if (error || !order) {
    return {
      ok: false,
      message: "Order not found.",
      issue: {
        code: "order_unresolvable",
        severity: "error",
        message: "Order could not be resolved server-side.",
        orderId: trimmed,
      },
    };
  }

  const { data: attempts } = await supabase
    .from("payment_attempts")
    .select("id, status, amount_minor, currency, created_at")
    .eq("order_id", trimmed)
    .order("created_at", { ascending: false })
    .limit(5);

  const preferred =
    (attempts ?? []).find((a) =>
      ["captured", "paid", "authorized", "deferred", "pending"].includes(
        String(a.status)
      )
    ) ?? (attempts ?? [])[0];

  const snapshot: CommerceOrderMoneySnapshot = {
    orderId: String(order.id),
    storeId: String(order.store_id),
    buyerUserId: order.buyer_id ? String(order.buyer_id) : null,
    currency: String(order.currency),
    subtotalMinor: Number(order.subtotal_minor),
    discountTotalMinor: Number(order.discount_total_minor),
    taxTotalMinor: Number(order.tax_total_minor),
    shippingTotalMinor: Number(order.shipping_total_minor),
    grandTotalMinor: Number(order.grand_total_minor),
    paymentStatus: String(order.payment_status),
    orderStatus: String(order.status),
    occurredAt: String(
      order.confirmed_at ?? order.created_at ?? new Date().toISOString()
    ),
    paymentAttemptId: preferred?.id ? String(preferred.id) : null,
  };

  return { ok: true, snapshot };
}

/**
 * Build the canonical financial event + posting plan from a trusted order id.
 * Does not post unless executePosting=true and a service-role client is used.
 */
export async function bridgeCommerceOrderToRevenueLedger(
  supabase: AnyClient,
  input: {
    orderId: string;
    /** Forbidden — any money keys cause rejection. */
    clientFields?: Record<string, unknown>;
    allocateSettlement?: boolean;
    /**
     * When true, calls Sync/Settlement RPCs. Requires service_role privileges.
     * Default false = auditable plan only (safe for authenticated diagnostics).
     */
    executePosting?: boolean;
  }
): Promise<CommerceRevenueBridgeResult> {
  const moneyGate = rejectClientBridgeMoneyFields(input.clientFields ?? {});
  if (!moneyGate.ok) {
    return {
      ok: false,
      event: null,
      plan: null,
      postingStatus: "rejected",
      message: moneyGate.message,
      reconciliationIssues: [moneyGate.issue],
    };
  }

  const loaded = await loadCommerceOrderMoneySnapshot(supabase, input.orderId);
  if (!loaded.ok) {
    return {
      ok: false,
      event: null,
      plan: null,
      postingStatus: "rejected",
      message: loaded.message,
      reconciliationIssues: [loaded.issue],
    };
  }

  const built = buildCommerceFinancialEvent(loaded.snapshot);
  if (!built.ok) {
    return {
      ok: false,
      event: null,
      plan: null,
      postingStatus: "rejected",
      message: built.message,
      reconciliationIssues: [built.issue],
    };
  }

  const plan = planCommerceRevenueBridgePosting(built.event, {
    allocateSettlement: input.allocateSettlement,
  });

  if (!input.executePosting) {
    const issues: CommerceRevenueReconciliationIssue[] = [];
    if (built.event.commission.policyStatus === "not_configured") {
      issues.push({
        code: "missing_commission_policy",
        severity: "info",
        message: built.event.commission.message,
        orderId: built.event.orderId,
        storeId: built.event.storeId,
        sourceEventId: built.event.sourceEventId,
      });
    }
    if (
      built.event.financialEligibility === "eligible_for_capture_posting" &&
      !built.event.paymentAttemptId
    ) {
      issues.push({
        code: "missing_payment_attempt",
        severity: "warning",
        message: "Paid order lacks a payment attempt for Sync posting.",
        orderId: built.event.orderId,
        storeId: built.event.storeId,
      });
    }
    return {
      ok: true,
      event: built.event,
      plan,
      postingStatus: "planned_only",
      message: plan.reason,
      reconciliationIssues: issues,
    };
  }

  if (!plan.willPostLedger || !plan.sync) {
    return {
      ok: true,
      event: built.event,
      plan,
      postingStatus: "not_attempted",
      message: plan.reason,
      reconciliationIssues: [],
    };
  }

  const { data: syncData, error: syncError } = await supabase.rpc(
    STORE_PAYMENT_SYNC_RPC,
    {
      p_payment_attempt_id: plan.sync.paymentAttemptId,
      p_outcome: plan.sync.outcome,
      p_event_key: plan.sync.eventKey,
      p_correlation_id: plan.sync.correlationId,
    }
  );

  if (syncError) {
    const msg = syncError.message || "Ledger Sync posting failed.";
    const requiresServiceRole =
      /permission|denied|not authorized|42501/i.test(msg);
    return {
      ok: false,
      event: built.event,
      plan,
      postingStatus: "failed",
      message: msg,
      reconciliationIssues: [
        {
          code: requiresServiceRole
            ? "ledger_posting_requires_service_role"
            : "bridge_failure_review_required",
          severity: "error",
          message: msg,
          orderId: built.event.orderId,
          storeId: built.event.storeId,
          sourceEventId: built.event.sourceEventId,
        },
      ],
    };
  }

  const syncPayload = (syncData ?? {}) as Record<string, unknown>;
  const replayed = Boolean(
    syncPayload.replayed ?? syncPayload.idempotent_replay
  );

  if (plan.settlement) {
    const { error: settleError } = await supabase.rpc(STORE_SETTLEMENT_RPC, {
      p_action: plan.settlement.action,
      p_event_key: plan.settlement.eventKey,
      p_correlation_id: plan.settlement.correlationId,
      p_payment_attempt_id: plan.settlement.paymentAttemptId,
      p_amount_minor: built.event.grandTotalMinor,
      p_currency: built.event.currency,
    });
    if (settleError) {
      return {
        ok: false,
        event: built.event,
        plan,
        postingStatus: "failed",
        message: settleError.message || "Settlement allocate failed after Sync.",
        reconciliationIssues: [
          {
            code: "bridge_failure_review_required",
            severity: "error",
            message:
              settleError.message ||
              "Partial posting: Sync may have succeeded; settlement failed — reconcile before retry.",
            orderId: built.event.orderId,
            storeId: built.event.storeId,
            sourceEventId: built.event.sourceEventId,
          },
        ],
      };
    }
    return {
      ok: true,
      event: built.event,
      plan,
      postingStatus: "settlement_planned",
      message: "Sync posted and settlement allocate applied.",
      reconciliationIssues: [
        {
          code: "missing_commission_policy",
          severity: "info",
          message: built.event.commission.message,
          orderId: built.event.orderId,
          storeId: built.event.storeId,
        },
      ],
    };
  }

  return {
    ok: true,
    event: built.event,
    plan,
    postingStatus: replayed ? "sync_replayed" : "sync_posted",
    message: replayed
      ? "Idempotent Sync replay — no duplicate journal."
      : "Sync posting applied.",
    reconciliationIssues: [
      {
        code: "missing_commission_policy",
        severity: "info",
        message: built.event.commission.message,
        orderId: built.event.orderId,
        storeId: built.event.storeId,
      },
    ],
  };
}
