/**
 * Parse/normalize privileged partial-refund ledger RPC JSON → domain records.
 */

import type {
  PartialRefundCaptureAccountingSnapshot,
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerLineRecord,
  PartialRefundLedgerState,
} from "./types";
import { PARTIAL_REFUND_LEDGER_STATES } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asBool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function parseLines(raw: unknown): readonly PartialRefundLedgerLineRecord[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PartialRefundLedgerLineRecord[] = [];
  for (const item of raw) {
    if (!isRecord(item)) return null;
    const orderItemId = asString(item.order_item_id ?? item.orderItemId);
    const requestedQuantity = asNumber(
      item.requested_quantity ?? item.requestedQuantity
    );
    const refundAmountMinor = asNumber(
      item.refund_amount_minor ?? item.refundAmountMinor
    );
    if (
      !orderItemId ||
      requestedQuantity === null ||
      refundAmountMinor === null ||
      !Number.isInteger(requestedQuantity) ||
      !Number.isInteger(refundAmountMinor)
    ) {
      return null;
    }
    out.push({ orderItemId, requestedQuantity, refundAmountMinor });
  }
  return out;
}

function parseStatus(raw: unknown): PartialRefundLedgerState | null {
  const s = asString(raw);
  if (!s) return null;
  return (PARTIAL_REFUND_LEDGER_STATES as readonly string[]).includes(s)
    ? (s as PartialRefundLedgerState)
    : null;
}

function isoFromRpc(raw: unknown): string | null {
  if (typeof raw === "string" && raw.length > 0) return raw;
  return null;
}

/** Parse commit object produced by store_partial_refund_ledger_commit_json. */
export function parseLedgerCommitJson(
  raw: unknown
): PartialRefundLedgerCommitRecord | null {
  if (!isRecord(raw)) return null;
  const ledgerId = asString(raw.ledger_id ?? raw.ledgerId);
  const storeId = asString(raw.store_id ?? raw.storeId);
  const orderId = asString(raw.order_id ?? raw.orderId);
  const paymentAttemptId = asString(
    raw.payment_attempt_id ?? raw.paymentAttemptId
  );
  const captureEventId = asString(raw.capture_event_id ?? raw.captureEventId);
  const currency = asString(raw.currency);
  const refundAmountMinor = asNumber(
    raw.refund_amount_minor ?? raw.refundAmountMinor
  );
  const captureAmountMinor = asNumber(
    raw.capture_amount_minor ?? raw.captureAmountMinor
  );
  const calculationFingerprint = asString(
    raw.calculation_fingerprint ?? raw.calculationFingerprint
  );
  const idempotencyKey = asString(raw.idempotency_key ?? raw.idempotencyKey);
  const status = parseStatus(raw.status);
  const lines = parseLines(raw.lines);
  const plannedVersion = asNumber(
    raw.planned_accounting_version ?? raw.plannedAccountingVersion
  );
  const committedVersion = asNumber(
    raw.committed_accounting_version ?? raw.committedAccountingVersion
  );
  const attemptCount = asNumber(raw.attempt_count ?? raw.attemptCount);
  const createdAtIso = isoFromRpc(raw.created_at ?? raw.createdAtIso);
  const updatedAtIso = isoFromRpc(raw.updated_at ?? raw.updatedAtIso);

  if (
    !ledgerId ||
    !storeId ||
    !orderId ||
    !paymentAttemptId ||
    !captureEventId ||
    !currency ||
    refundAmountMinor === null ||
    captureAmountMinor === null ||
    !calculationFingerprint ||
    !idempotencyKey ||
    !status ||
    !lines ||
    plannedVersion === null ||
    attemptCount === null ||
    !createdAtIso ||
    !updatedAtIso
  ) {
    return null;
  }

  const accountingVersion =
    status === "committed" && committedVersion !== null
      ? committedVersion
      : plannedVersion;

  const failureCodeRaw = raw.failure_code ?? raw.failureCode;
  const failureMessageRaw =
    raw.failure_message_safe ?? raw.failureMessageSafe;

  return {
    ledgerId,
    storeId,
    orderId,
    paymentAttemptId,
    captureEventId,
    currency,
    refundAmountMinor,
    captureAmountMinor,
    calculationFingerprint,
    idempotencyKey,
    status,
    lines,
    accountingVersion,
    attemptCount,
    failureCode:
      failureCodeRaw === null || failureCodeRaw === undefined
        ? null
        : (asString(failureCodeRaw) as PartialRefundLedgerCommitRecord["failureCode"]),
    failureMessageSafe:
      failureMessageRaw === null || failureMessageRaw === undefined
        ? null
        : asString(failureMessageRaw),
    createdAtIso,
    updatedAtIso,
  };
}

function parseQtyMap(raw: unknown): Record<string, number> | null {
  if (raw === null || raw === undefined) return {};
  if (!isRecord(raw)) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = asNumber(v);
    if (n === null || !Number.isInteger(n)) return null;
    out[k] = n;
  }
  return out;
}

export function parseCaptureAccountingRpc(
  raw: unknown
):
  | { ok: true; found: false }
  | { ok: true; found: true; value: PartialRefundCaptureAccountingSnapshot }
  | { ok: false } {
  if (!isRecord(raw)) return { ok: false };
  if (asBool(raw.ok) === false) return { ok: false };
  if (asBool(raw.found) === false) return { ok: true, found: false };

  const storeId = asString(raw.store_id ?? raw.storeId);
  const orderId = asString(raw.order_id ?? raw.orderId);
  const paymentAttemptId = asString(
    raw.payment_attempt_id ?? raw.paymentAttemptId
  );
  const captureEventId = asString(raw.capture_event_id ?? raw.captureEventId);
  const currency = asString(raw.currency);
  const captureAmountMinor = asNumber(
    raw.capture_amount_minor ?? raw.captureAmountMinor
  );
  const committedRefundAmountMinor = asNumber(
    raw.committed_refund_amount_minor ?? raw.committedRefundAmountMinor
  );
  const accountingVersion = asNumber(
    raw.accounting_version ?? raw.accountingVersion
  );
  const qty = parseQtyMap(
    raw.committed_quantity_by_line_id ?? raw.committedQuantityByLineId
  );

  if (
    !storeId ||
    !orderId ||
    !paymentAttemptId ||
    !captureEventId ||
    !currency ||
    captureAmountMinor === null ||
    committedRefundAmountMinor === null ||
    accountingVersion === null ||
    qty === null
  ) {
    // ensure RPC omits qty map — treat missing qty as empty when found omitted
    if (
      storeId &&
      orderId &&
      paymentAttemptId &&
      captureEventId &&
      currency &&
      captureAmountMinor !== null &&
      committedRefundAmountMinor !== null &&
      accountingVersion !== null &&
      (raw.committed_quantity_by_line_id === undefined &&
        raw.committedQuantityByLineId === undefined)
    ) {
      return {
        ok: true,
        found: true,
        value: {
          storeId,
          orderId,
          paymentAttemptId,
          captureEventId,
          currency,
          captureAmountMinor,
          committedRefundAmountMinor,
          committedQuantityByLineId: {},
          accountingVersion,
        },
      };
    }
    return { ok: false };
  }

  return {
    ok: true,
    found: true,
    value: {
      storeId,
      orderId,
      paymentAttemptId,
      captureEventId,
      currency,
      captureAmountMinor,
      committedRefundAmountMinor,
      committedQuantityByLineId: qty,
      accountingVersion,
    },
  };
}

export function parseCommitEnvelope(
  raw: unknown
):
  | { ok: true; found: false }
  | { ok: true; found: true; commit: PartialRefundLedgerCommitRecord; replayed?: boolean }
  | { ok: false } {
  if (!isRecord(raw)) return { ok: false };
  if (asBool(raw.ok) === false) return { ok: false };
  if (asBool(raw.found) === false) return { ok: true, found: false };

  const commitRaw = raw.commit ?? (asBool(raw.found) === true ? null : raw);
  // plan/begin/complete/fail return { ok, commit } without found
  const hasCommit = raw.commit !== undefined;
  if (!hasCommit && asBool(raw.found) !== true) {
    // maybe bare commit? reject
    if (raw.ledger_id || raw.ledgerId) {
      const commit = parseLedgerCommitJson(raw);
      if (!commit) return { ok: false };
      return { ok: true, found: true, commit };
    }
    return { ok: false };
  }

  if (hasCommit) {
    const commit = parseLedgerCommitJson(raw.commit);
    if (!commit) return { ok: false };
    return {
      ok: true,
      found: true,
      commit,
      replayed: asBool(raw.replayed) === true,
    };
  }

  return { ok: false };
}

export function parseCommittedList(
  raw: unknown
): readonly PartialRefundLedgerCommitRecord[] | null {
  if (!isRecord(raw)) return null;
  if (asBool(raw.ok) !== true) return null;
  const arr = raw.commits;
  if (!Array.isArray(arr)) return null;
  const out: PartialRefundLedgerCommitRecord[] = [];
  for (const item of arr) {
    const c = parseLedgerCommitJson(item);
    if (!c) return null;
    out.push(c);
  }
  return out;
}
