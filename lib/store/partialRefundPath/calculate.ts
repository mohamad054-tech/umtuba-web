/**
 * Pure server-side partial refund calculation / validation.
 * Accepts trusted stored facts + line quantity intents (never client money).
 */

import { partialRefundPathCapabilityOwnership } from "./capability";
import {
  PARTIAL_REFUND_PATH_ID,
  PARTIAL_REFUND_PATH_VERSION,
  type PartialRefundCalculationResult,
  type PartialRefundComputedLine,
  type PartialRefundFailureCode,
  type PartialRefundLineIntent,
  type TrustedPartialRefundCaptureFact,
  type TrustedPartialRefundLineFact,
  type TrustedPartialRefundPriorAccounting,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLIENT_MONEY_KEYS = [
  "amountMinor",
  "amount_minor",
  "trustedAmountMinor",
  "refundAmountMinor",
  "grandTotalMinor",
  "unitPriceMinor",
  "totalPriceMinor",
  "currency",
  "captureAmountMinor",
] as const;

function fail(
  code: PartialRefundFailureCode,
  message: string
): PartialRefundCalculationResult {
  return {
    ok: false,
    capability: PARTIAL_REFUND_PATH_ID,
    version: PARTIAL_REFUND_PATH_VERSION,
    code,
    message,
    ownership: partialRefundPathCapabilityOwnership(),
  };
}

export function isPartialRefundUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Reject accidental client money bags on intent payloads.
 * Intent must carry only orderItemId + requestedQuantity (+ opaque ids).
 */
export function rejectClientPartialRefundMoneyFields(
  bag: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of CLIENT_MONEY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(bag, key)) {
      return {
        ok: false,
        message:
          "Client must not supply monetary refund fields — amounts derive from trusted stored facts.",
      };
    }
  }
  return { ok: true };
}

function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

function assertLineMath(
  line: TrustedPartialRefundLineFact
): PartialRefundCalculationResult | null {
  if (!isPartialRefundUuid(line.orderItemId)) {
    return fail("malformed_id", "Order item id is malformed.");
  }
  if (!isPartialRefundUuid(line.orderId) || !isPartialRefundUuid(line.storeId)) {
    return fail("malformed_id", "Order or store id is malformed.");
  }
  if (
    !Number.isInteger(line.purchasedQuantity) ||
    line.purchasedQuantity <= 0
  ) {
    return fail("malformed_quantity", "Purchased quantity must be a positive integer.");
  }
  if (!Number.isInteger(line.unitPriceMinor) || line.unitPriceMinor < 0) {
    return fail("inconsistent_line_math", "Unit price must be a non-negative integer.");
  }
  if (!Number.isInteger(line.totalPriceMinor) || line.totalPriceMinor < 0) {
    return fail("inconsistent_line_math", "Line total must be a non-negative integer.");
  }
  if (line.totalPriceMinor !== line.unitPriceMinor * line.purchasedQuantity) {
    return fail(
      "inconsistent_line_math",
      "Line total must equal unit price × purchased quantity."
    );
  }
  if (normalizeCurrency(line.currency).length !== 3) {
    return fail("currency_mismatch", "Line currency must be a 3-letter code.");
  }
  return null;
}

function buildFingerprint(parts: unknown[]): string {
  // Deterministic, non-cryptographic fingerprint for idempotency contracts.
  const payload = JSON.stringify(parts);
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `prf1_${(hash >>> 0).toString(16).padStart(8, "0")}_${payload.length}`;
}

export type CalculatePartialRefundInput = {
  capture: TrustedPartialRefundCaptureFact;
  lines: readonly TrustedPartialRefundLineFact[];
  intent: readonly PartialRefundLineIntent[];
  prior: TrustedPartialRefundPriorAccounting;
};

/**
 * Deterministic partial-refund plan from trusted facts + quantity intents.
 * Does not commit money, restock, revoke, or unwind settlement/commission.
 */
export function calculatePartialRefundPlan(
  input: CalculatePartialRefundInput
): PartialRefundCalculationResult {
  const ownership = partialRefundPathCapabilityOwnership();
  const { capture, lines, intent, prior } = input;

  if (
    !isPartialRefundUuid(capture.storeId) ||
    !isPartialRefundUuid(capture.orderId) ||
    !isPartialRefundUuid(capture.paymentAttemptId) ||
    !isPartialRefundUuid(capture.captureEventId)
  ) {
    return fail("malformed_id", "Capture context ids are malformed.");
  }
  if (
    !Number.isInteger(capture.captureAmountMinor) ||
    capture.captureAmountMinor <= 0
  ) {
    return fail("over_refund", "Capture amount must be a positive integer.");
  }
  const captureCurrency = normalizeCurrency(capture.currency);
  if (captureCurrency.length !== 3) {
    return fail("currency_mismatch", "Capture currency must be a 3-letter code.");
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return fail("empty_selection", "Trusted order lines are required.");
  }
  if (!Array.isArray(intent) || intent.length === 0) {
    return fail("empty_selection", "At least one line selection is required.");
  }

  if (
    !Number.isInteger(prior.priorRefundedAmountMinor) ||
    prior.priorRefundedAmountMinor < 0
  ) {
    return fail(
      "inconsistent_prior_accounting",
      "Prior refunded amount must be a non-negative integer."
    );
  }
  if (prior.priorRefundedAmountMinor > capture.captureAmountMinor) {
    return fail(
      "inconsistent_prior_accounting",
      "Prior refunded amount exceeds capture amount."
    );
  }

  const lineById = new Map<string, TrustedPartialRefundLineFact>();
  let merchandiseTotal = 0;
  for (const line of lines) {
    const mathErr = assertLineMath(line);
    if (mathErr) return mathErr;
    if (line.orderId !== capture.orderId || line.storeId !== capture.storeId) {
      return fail(
        "unknown_line",
        "Trusted line does not belong to the capture order/store."
      );
    }
    if (normalizeCurrency(line.currency) !== captureCurrency) {
      return fail("currency_mismatch", "Line currency does not match capture.");
    }
    if (lineById.has(line.orderItemId)) {
      return fail("duplicate_line", "Duplicate trusted line facts.");
    }
    lineById.set(line.orderItemId, line);
    merchandiseTotal += line.totalPriceMinor;
  }

  // Capture may include tax/shipping; merchandise must not exceed capture.
  if (merchandiseTotal > capture.captureAmountMinor) {
    return fail(
      "inconsistent_line_math",
      "Sum of line totals exceeds trusted capture amount."
    );
  }

  const seenIntent = new Set<string>();
  const computed: PartialRefundComputedLine[] = [];
  let computedRefundAmountMinor = 0;
  let refundedQtyAcrossSelection = 0;
  let remainingQtyAcrossAllLines = 0;

  for (const line of lines) {
    const priorQty = prior.priorRefundedQuantityByLineId[line.orderItemId] ?? 0;
    if (!Number.isInteger(priorQty) || priorQty < 0) {
      return fail(
        "inconsistent_prior_accounting",
        "Prior refunded quantity must be a non-negative integer."
      );
    }
    if (priorQty > line.purchasedQuantity) {
      return fail(
        "inconsistent_prior_accounting",
        "Prior refunded quantity exceeds purchased quantity."
      );
    }
    remainingQtyAcrossAllLines += line.purchasedQuantity - priorQty;
  }

  // Prior qty money ceiling (unit * prior qty) must not exceed prior money.
  let priorQtyMoneyCeiling = 0;
  for (const line of lines) {
    const priorQty = prior.priorRefundedQuantityByLineId[line.orderItemId] ?? 0;
    priorQtyMoneyCeiling += line.unitPriceMinor * priorQty;
  }
  if (prior.priorRefundedAmountMinor < priorQtyMoneyCeiling) {
    return fail(
      "inconsistent_prior_accounting",
      "Prior refunded amount is less than implied line quantity refunds."
    );
  }

  for (const sel of intent) {
    if (!isPartialRefundUuid(sel.orderItemId)) {
      return fail("malformed_id", "Selected order item id is malformed.");
    }
    if (seenIntent.has(sel.orderItemId)) {
      return fail("duplicate_line", "Duplicate line selection is not allowed.");
    }
    seenIntent.add(sel.orderItemId);

    const line = lineById.get(sel.orderItemId);
    if (!line) {
      return fail("unknown_line", "Selected line is not part of the trusted order.");
    }

    if (!Number.isInteger(sel.requestedQuantity)) {
      return fail("malformed_quantity", "Requested quantity must be an integer.");
    }
    if (sel.requestedQuantity === 0) {
      return fail("zero_quantity", "Requested quantity must be greater than zero.");
    }
    if (sel.requestedQuantity < 0) {
      return fail("negative_quantity", "Requested quantity cannot be negative.");
    }

    const priorQty = prior.priorRefundedQuantityByLineId[line.orderItemId] ?? 0;
    const remainingBefore = line.purchasedQuantity - priorQty;
    if (sel.requestedQuantity > remainingBefore) {
      return fail(
        "over_quantity",
        "Requested quantity exceeds remaining refundable quantity for the line."
      );
    }

    const refundAmountMinor = line.unitPriceMinor * sel.requestedQuantity;
    computedRefundAmountMinor += refundAmountMinor;
    refundedQtyAcrossSelection += sel.requestedQuantity;
    computed.push({
      orderItemId: line.orderItemId,
      requestedQuantity: sel.requestedQuantity,
      remainingQuantityBefore: remainingBefore,
      remainingQuantityAfter: remainingBefore - sel.requestedQuantity,
      refundAmountMinor,
      currency: captureCurrency,
    });
  }

  const remainingRefundableAmountMinor =
    capture.captureAmountMinor - prior.priorRefundedAmountMinor;
  if (computedRefundAmountMinor > remainingRefundableAmountMinor) {
    return fail(
      "over_refund",
      "Computed refund amount exceeds remaining refundable capture balance."
    );
  }
  if (computedRefundAmountMinor <= 0) {
    return fail("zero_quantity", "Computed refund amount must be positive.");
  }

  const remainingAfter =
    remainingRefundableAmountMinor - computedRefundAmountMinor;
  const remainingQtyAfter =
    remainingQtyAcrossAllLines - refundedQtyAcrossSelection;
  const isFullRemainingCaptureRefund =
    remainingAfter === 0 && remainingQtyAfter === 0;

  const calculationFingerprint = buildFingerprint([
    PARTIAL_REFUND_PATH_VERSION,
    capture,
    [...lines].sort((a, b) => a.orderItemId.localeCompare(b.orderItemId)),
    prior,
    [...intent].sort((a, b) => a.orderItemId.localeCompare(b.orderItemId)),
  ]);

  return {
    ok: true,
    capability: PARTIAL_REFUND_PATH_ID,
    version: PARTIAL_REFUND_PATH_VERSION,
    storeId: capture.storeId,
    orderId: capture.orderId,
    paymentAttemptId: capture.paymentAttemptId,
    captureEventId: capture.captureEventId,
    currency: captureCurrency,
    captureAmountMinor: capture.captureAmountMinor,
    priorRefundedAmountMinor: prior.priorRefundedAmountMinor,
    remainingRefundableAmountMinor,
    computedRefundAmountMinor,
    remainingRefundableAmountAfterMinor: remainingAfter,
    lines: computed,
    isFullRemainingCaptureRefund,
    calculationFingerprint,
    ownership,
  };
}

/**
 * Fail-closed guard: foundation never owns commit/restock/settlement unwind.
 */
export function assertPartialRefundCommitAllowed(): PartialRefundCalculationResult {
  return fail(
    "unsupported_commit",
    "Partial refund commit is not owned by foundation V1 — use a future commit GO."
  );
}
