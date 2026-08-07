/**
 * Derive safe admin observability for provider-money executions.
 * Does not expose secrets/raw Stripe payloads.
 */

import type { PartialRefundProviderExecutionRecord } from "./types";

export type ProviderMoneyLatestOperation = "SUBMIT" | "LOOKUP" | "NONE";

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Infer whether the latest durable touch was a submit path or lookup recovery.
 * Prefer LOOKUP when last_lookup_at is the newest known activity timestamp.
 */
export function deriveProviderMoneyLatestOperation(
  row: Pick<
    PartialRefundProviderExecutionRecord,
    "startedAtIso" | "completedAtIso" | "lastLookupAtIso" | "createdAtIso" | "status"
  >
): ProviderMoneyLatestOperation {
  const lookup = parseIsoMs(row.lastLookupAtIso);
  const started = parseIsoMs(row.startedAtIso);
  const completed = parseIsoMs(row.completedAtIso);
  const activity = Math.max(started ?? 0, completed ?? 0);

  if (lookup != null && lookup >= activity) {
    return "LOOKUP";
  }
  if (started != null || completed != null || row.status === "executing") {
    return "SUBMIT";
  }
  if (row.status === "planned") {
    return "NONE";
  }
  return activity > 0 ? "SUBMIT" : "NONE";
}

export type ProviderMoneyAuditView = {
  executionId: string;
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  amountMinor: number;
  currency: string;
  providerKind: string;
  idempotencyKey: string;
  status: string;
  providerRefundId: string | null;
  providerStatusSafe: string | null;
  failureCode: string | null;
  createdAtIso: string;
  startedAtIso: string | null;
  completedAtIso: string | null;
  lastLookupAtIso: string | null;
  latestOperation: ProviderMoneyLatestOperation;
};

export function toProviderMoneyAuditView(
  row: PartialRefundProviderExecutionRecord
): ProviderMoneyAuditView {
  return {
    executionId: row.executionId,
    ledgerId: row.ledgerId,
    storeId: row.storeId,
    orderId: row.orderId,
    paymentAttemptId: row.paymentAttemptId,
    amountMinor: row.trustedAmountMinor,
    currency: row.currency,
    providerKind: row.providerKind,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    providerRefundId: row.providerRefundId,
    providerStatusSafe: row.providerStatusSafe,
    failureCode: row.failureCode,
    createdAtIso: row.createdAtIso,
    startedAtIso: row.startedAtIso,
    completedAtIso: row.completedAtIso,
    lastLookupAtIso: row.lastLookupAtIso,
    latestOperation: deriveProviderMoneyLatestOperation(row),
  };
}
