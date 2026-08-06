/**
 * Pure validation for ledger plan / commit boundary inputs.
 */

import { partialRefundLedgerCapabilityOwnership } from "./capability";
import type {
  PartialRefundLedgerFailureCode,
  PartialRefundLedgerLineRecord,
  PartialRefundLedgerPlanInput,
  PartialRefundLedgerResult,
} from "./types";
import {
  PARTIAL_REFUND_LEDGER_ID,
  PARTIAL_REFUND_LEDGER_VERSION,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPartialRefundLedgerUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function failLedger<T>(
  code: PartialRefundLedgerFailureCode,
  message: string
): PartialRefundLedgerResult<T> {
  return {
    ok: false,
    capability: PARTIAL_REFUND_LEDGER_ID,
    version: PARTIAL_REFUND_LEDGER_VERSION,
    ownership: partialRefundLedgerCapabilityOwnership(),
    code,
    message,
  };
}

export function okLedger<T>(value: T): PartialRefundLedgerResult<T> {
  return {
    ok: true,
    capability: PARTIAL_REFUND_LEDGER_ID,
    version: PARTIAL_REFUND_LEDGER_VERSION,
    ownership: partialRefundLedgerCapabilityOwnership(),
    value,
  };
}

export function validateIdempotencyKey(
  key: string
): { ok: true } | { ok: false; message: string } {
  const t = key.trim();
  if (t.length < 8 || t.length > 128) {
    return { ok: false, message: "idempotencyKey must be 8..128 characters." };
  }
  return { ok: true };
}

export function validateLedgerLines(
  lines: readonly PartialRefundLedgerLineRecord[],
  refundAmountMinor: number
):
  | { ok: true }
  | { ok: false; code: PartialRefundLedgerFailureCode; message: string } {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, code: "empty_lines", message: "Ledger lines required." };
  }
  const seen = new Set<string>();
  let sum = 0;
  for (const line of lines) {
    if (!isPartialRefundLedgerUuid(line.orderItemId)) {
      return {
        ok: false,
        code: "malformed_id",
        message: "Order item id is malformed.",
      };
    }
    if (seen.has(line.orderItemId)) {
      return {
        ok: false,
        code: "duplicate_commit",
        message: "Duplicate order item on ledger lines.",
      };
    }
    seen.add(line.orderItemId);
    if (!Number.isInteger(line.requestedQuantity) || line.requestedQuantity <= 0) {
      return {
        ok: false,
        code: "inconsistent_line_math",
        message: "Requested quantity must be a positive integer.",
      };
    }
    if (!Number.isInteger(line.refundAmountMinor) || line.refundAmountMinor <= 0) {
      return {
        ok: false,
        code: "zero_amount",
        message: "Line refund amount must be a positive integer.",
      };
    }
    sum += line.refundAmountMinor;
  }
  if (sum !== refundAmountMinor) {
    return {
      ok: false,
      code: "inconsistent_line_math",
      message: "Sum of line amounts must equal ledger refund amount.",
    };
  }
  return { ok: true };
}

export function validateLedgerPlanInput(
  input: PartialRefundLedgerPlanInput
): PartialRefundLedgerResult<PartialRefundLedgerPlanInput> {
  if (
    !isPartialRefundLedgerUuid(input.ledgerId) ||
    !isPartialRefundLedgerUuid(input.storeId) ||
    !isPartialRefundLedgerUuid(input.orderId) ||
    !isPartialRefundLedgerUuid(input.paymentAttemptId) ||
    !isPartialRefundLedgerUuid(input.captureEventId)
  ) {
    return failLedger("malformed_id", "Ledger plan ids are malformed.");
  }
  const idem = validateIdempotencyKey(input.idempotencyKey);
  if (!idem.ok) {
    return failLedger("malformed_idempotency_key", idem.message);
  }
  if (!Number.isInteger(input.captureAmountMinor) || input.captureAmountMinor <= 0) {
    return failLedger("missing_capture", "Capture amount must be a positive integer.");
  }
  if (!Number.isInteger(input.refundAmountMinor)) {
    return failLedger("negative_amount", "Refund amount must be an integer.");
  }
  if (input.refundAmountMinor < 0) {
    return failLedger("negative_amount", "Refund amount cannot be negative.");
  }
  if (input.refundAmountMinor === 0) {
    return failLedger("zero_amount", "Refund amount must be greater than zero.");
  }
  if (input.refundAmountMinor > input.captureAmountMinor) {
    return failLedger(
      "over_refund",
      "Refund amount exceeds capture amount before prior accounting."
    );
  }
  const currency = input.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    return failLedger("currency_mismatch", "Currency must be a 3-letter code.");
  }
  if (!Number.isInteger(input.expectedAccountingVersion) || input.expectedAccountingVersion < 0) {
    return failLedger("stale_version", "expectedAccountingVersion must be a non-negative integer.");
  }
  if (!input.calculationFingerprint.trim()) {
    return failLedger(
      "missing_ownership",
      "calculationFingerprint from trusted plan is required."
    );
  }
  const linesOk = validateLedgerLines(input.lines, input.refundAmountMinor);
  if (!linesOk.ok) {
    return failLedger(linesOk.code, linesOk.message);
  }
  return okLedger({
    ...input,
    currency,
    idempotencyKey: input.idempotencyKey.trim(),
    calculationFingerprint: input.calculationFingerprint.trim(),
  });
}

/**
 * Fail-closed: money execution / provider refund is never owned here.
 */
export function assertPartialRefundMoneyExecutionAllowed(): PartialRefundLedgerResult<never> {
  return failLedger(
    "unsupported_runtime",
    "Partial refund money execution is not owned by ledger commit boundary V1."
  );
}
