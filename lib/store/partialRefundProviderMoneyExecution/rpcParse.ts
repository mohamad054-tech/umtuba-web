/**
 * Parse privileged provider-execution RPC JSON → domain records.
 */

import type { PartialRefundProviderExecutionRecord } from "./types";
import {
  PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES,
  type PartialRefundProviderExecutionStatus,
} from "./types";
import { isProviderMoneyUuid, normalizeCurrency } from "./validate";

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function asStatus(value: unknown): PartialRefundProviderExecutionStatus | null {
  const s = str(value);
  return (PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES as readonly string[]).includes(
    s
  )
    ? (s as PartialRefundProviderExecutionStatus)
    : null;
}

export function parsePartialRefundProviderExecution(
  raw: unknown
): PartialRefundProviderExecutionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const executionId = str(row.execution_id ?? row.executionId);
  const storeId = str(row.store_id ?? row.storeId);
  const ledgerId = str(row.ledger_id ?? row.ledgerId);
  const orderId = str(row.order_id ?? row.orderId);
  const paymentAttemptId = str(
    row.payment_attempt_id ?? row.paymentAttemptId
  );
  const captureEventId = str(row.capture_event_id ?? row.captureEventId);
  const status = asStatus(row.status);
  const amount = num(row.trusted_amount_minor ?? row.trustedAmountMinor);
  const currency = normalizeCurrency(str(row.currency ?? ""));
  const idempotencyKey = str(row.idempotency_key ?? row.idempotencyKey);
  const providerKind = str(row.provider_kind ?? row.providerKind);

  if (
    !isProviderMoneyUuid(executionId) ||
    !isProviderMoneyUuid(storeId) ||
    !isProviderMoneyUuid(ledgerId) ||
    !isProviderMoneyUuid(orderId) ||
    !isProviderMoneyUuid(paymentAttemptId) ||
    !isProviderMoneyUuid(captureEventId) ||
    !status ||
    amount === null ||
    amount <= 0 ||
    !currency ||
    idempotencyKey.length < 8 ||
    providerKind !== "stripe"
  ) {
    return null;
  }

  const nullOr = (v: unknown): string | null => {
    const s = str(v).trim();
    return s.length > 0 ? s : null;
  };

  return {
    executionId,
    storeId,
    ledgerId,
    orderId,
    paymentAttemptId,
    captureEventId,
    providerKind: "stripe",
    providerPaymentRef: nullOr(
      row.provider_payment_ref ?? row.providerPaymentRef
    ),
    trustedAmountMinor: amount,
    currency,
    idempotencyKey,
    status,
    providerRefundId: nullOr(row.provider_refund_id ?? row.providerRefundId),
    providerStatusSafe: nullOr(
      row.provider_status_safe ?? row.providerStatusSafe
    ),
    failureCode: nullOr(row.failure_code ?? row.failureCode),
    failureMessageSafe: nullOr(
      row.failure_message_safe ?? row.failureMessageSafe
    ),
    operatorUserId: nullOr(row.operator_user_id ?? row.operatorUserId),
    operatorReasonSafe: nullOr(
      row.operator_reason_safe ?? row.operatorReasonSafe
    ),
    startedAtIso: nullOr(row.started_at ?? row.startedAtIso),
    completedAtIso: nullOr(row.completed_at ?? row.completedAtIso),
    lastLookupAtIso: nullOr(row.last_lookup_at ?? row.lastLookupAtIso),
    createdAtIso:
      str(row.created_at ?? row.createdAtIso) || new Date(0).toISOString(),
    updatedAtIso:
      str(row.updated_at ?? row.updatedAtIso) || new Date(0).toISOString(),
  };
}

export function parseClaimEnvelope(raw: unknown):
  | { ok: true; execution: PartialRefundProviderExecutionRecord; replayed: boolean }
  | { ok: false; code: "malformed_rpc_response"; message: string } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Claim RPC response malformed.",
    };
  }
  const row = raw as Record<string, unknown>;
  if (row.ok === false) {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Claim RPC returned failure.",
    };
  }
  const execution = parsePartialRefundProviderExecution(row.execution);
  if (!execution) {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Claim execution payload malformed.",
    };
  }
  return { ok: true, execution, replayed: Boolean(row.replayed) };
}

export function parseUpdateEnvelope(raw: unknown):
  | { ok: true; execution: PartialRefundProviderExecutionRecord }
  | { ok: false; code: "malformed_rpc_response"; message: string } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Update RPC response malformed.",
    };
  }
  const row = raw as Record<string, unknown>;
  const execution = parsePartialRefundProviderExecution(row.execution);
  if (!execution) {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Update execution payload malformed.",
    };
  }
  return { ok: true, execution };
}

export function parseGetEnvelope(raw: unknown):
  | { ok: true; execution: PartialRefundProviderExecutionRecord | null }
  | { ok: false; code: "malformed_rpc_response"; message: string } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Get RPC response malformed.",
    };
  }
  const row = raw as Record<string, unknown>;
  if (row.execution == null) {
    return { ok: true, execution: null };
  }
  const execution = parsePartialRefundProviderExecution(row.execution);
  if (!execution) {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "Get execution payload malformed.",
    };
  }
  return { ok: true, execution };
}

export function parseListEnvelope(raw: unknown):
  | { ok: true; executions: PartialRefundProviderExecutionRecord[] }
  | { ok: false; code: "malformed_rpc_response"; message: string } {
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "List RPC response malformed.",
    };
  }
  const row = raw as Record<string, unknown>;
  const arr = row.executions;
  if (!Array.isArray(arr)) {
    return {
      ok: false,
      code: "malformed_rpc_response",
      message: "List executions payload malformed.",
    };
  }
  const out: PartialRefundProviderExecutionRecord[] = [];
  for (const item of arr) {
    const parsed = parsePartialRefundProviderExecution(item);
    if (!parsed) {
      return {
        ok: false,
        code: "malformed_rpc_response",
        message: "List contained malformed execution.",
      };
    }
    out.push(parsed);
  }
  return { ok: true, executions: out };
}
