/**
 * Reservation-only partial refund orchestration.
 *
 * Sequence: calculate → ensure → plan → begin → complete
 * Failure after begin: fail RPC (deterministic releasing of committing).
 *
 * Does NOT: payment-provider/Sync refund execution, money movement, restock,
 * entitlement, settlement/commission unwind, payout, commerce_confirm, or UI wiring.
 */

import {
  calculatePartialRefundPlan,
  rejectClientPartialRefundMoneyFields,
  type CalculatePartialRefundInput,
} from "../partialRefundPath/calculate";
import type {
  PartialRefundLineIntent,
  TrustedPartialRefundCaptureFact,
  TrustedPartialRefundLineFact,
} from "../partialRefundPath/types";
import {
  beginPartialRefundLedgerCommit,
  completePartialRefundLedgerCommit,
  failPartialRefundLedgerCommit,
  planPartialRefundLedgerCommit,
  priorAccountingFromCommittedLedger,
  purchasedQuantityGuardFromLineFacts,
} from "./commitBoundary";
import type { PartialRefundLedgerRepository } from "./repository";
import {
  PARTIAL_REFUND_SERVICE_ADAPTER_ID,
  PARTIAL_REFUND_SERVICE_ADAPTER_VERSION,
  partialRefundServiceAdapterOwnership,
  type PartialRefundServiceAdapterOwnership,
} from "./serviceAdapterCapability";
import type {
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerFailureCode,
} from "./types";
import { isPartialRefundLedgerUuid } from "./validate";

export type ReservePartialRefundInput = {
  /** Server-trusted capture facts. */
  capture: TrustedPartialRefundCaptureFact;
  /** Server-trusted order line facts. */
  lines: readonly TrustedPartialRefundLineFact[];
  /** User intent: line ids + quantities only (no money). */
  intent: readonly PartialRefundLineIntent[];
  /** Optional opaque bag checked for forbidden client money keys. */
  intentBag?: Record<string, unknown>;
  ledgerId: string;
  idempotencyKey: string;
};

/** Explicit non-events — reservation commit never implies these became true. */
export type ReservePartialRefundNonEvents = {
  providerRefundExecuted: false;
  moneyMoved: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
  compensationCompleted: false;
  downstreamUnwind: "pending_unsupported";
};

export type ReservePartialRefundSuccess = {
  ok: true;
  capability: typeof PARTIAL_REFUND_SERVICE_ADAPTER_ID;
  version: typeof PARTIAL_REFUND_SERVICE_ADAPTER_VERSION;
  ownership: PartialRefundServiceAdapterOwnership;
  reservationCommitted: true;
  commit: PartialRefundLedgerCommitRecord;
  calculationFingerprint: string;
  refundAmountMinor: number;
  replayedPlan: boolean;
} & ReservePartialRefundNonEvents;

export type ReservePartialRefundFailure = {
  ok: false;
  capability: typeof PARTIAL_REFUND_SERVICE_ADAPTER_ID;
  version: typeof PARTIAL_REFUND_SERVICE_ADAPTER_VERSION;
  ownership: PartialRefundServiceAdapterOwnership;
  reservationCommitted: false;
  code: PartialRefundLedgerFailureCode | string;
  message: string;
  /** Present when begin succeeded and fail transition was attempted. */
  failTransitionApplied?: boolean;
  ledgerId?: string;
} & ReservePartialRefundNonEvents;

export type ReservePartialRefundResult =
  | ReservePartialRefundSuccess
  | ReservePartialRefundFailure;

const NON_EVENTS: ReservePartialRefundNonEvents = {
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
  compensationCompleted: false,
  downstreamUnwind: "pending_unsupported",
};

function failReserve(
  code: string,
  message: string,
  extra?: Partial<ReservePartialRefundFailure>
): ReservePartialRefundFailure {
  return {
    ok: false,
    capability: PARTIAL_REFUND_SERVICE_ADAPTER_ID,
    version: PARTIAL_REFUND_SERVICE_ADAPTER_VERSION,
    ownership: partialRefundServiceAdapterOwnership(),
    reservationCommitted: false,
    ...NON_EVENTS,
    code,
    message,
    ...extra,
  };
}

/**
 * Durable reservation orchestration only.
 * Never calls full-order refund runtime or any payment provider.
 */
export async function reservePartialRefundLedgerCommit(
  repo: PartialRefundLedgerRepository,
  input: ReservePartialRefundInput
): Promise<ReservePartialRefundResult> {
  const ownership = partialRefundServiceAdapterOwnership();
  void ownership;

  if (input.intentBag) {
    const money = rejectClientPartialRefundMoneyFields(input.intentBag);
    if (!money.ok) {
      return failReserve("client_money_rejected", money.message);
    }
  }
  if (
    !isPartialRefundLedgerUuid(input.ledgerId) ||
    !isPartialRefundLedgerUuid(input.capture.captureEventId)
  ) {
    return failReserve("malformed_id", "Ledger or capture id is malformed.");
  }

  // 1) Load prior committed reservations for calculation ceilings.
  const committed = await repo.listCommittedForCapture(
    input.capture.captureEventId
  );
  const prior = priorAccountingFromCommittedLedger(committed);

  const calcInput: CalculatePartialRefundInput = {
    capture: input.capture,
    lines: input.lines,
    prior,
    intent: input.intent,
  };
  const calc = calculatePartialRefundPlan(calcInput);
  if (!calc.ok) {
    return failReserve(calc.code, calc.message);
  }

  // 2) Ensure capture accounting row (DB-owned ceilings).
  const ensured = await repo.ensureCaptureAccounting({
    storeId: input.capture.storeId,
    orderId: input.capture.orderId,
    paymentAttemptId: input.capture.paymentAttemptId,
    captureEventId: input.capture.captureEventId,
    currency: input.capture.currency,
    captureAmountMinor: input.capture.captureAmountMinor,
  });
  if (!ensured.ok) {
    return failReserve(ensured.code, ensured.message);
  }

  // Prefer latest accounting version from durable capture row.
  const expectedAccountingVersion = ensured.value.accountingVersion;

  // 3) Plan (idempotent).
  const planned = await planPartialRefundLedgerCommit(repo, {
    ledgerId: input.ledgerId,
    idempotencyKey: input.idempotencyKey,
    storeId: calc.storeId,
    orderId: calc.orderId,
    paymentAttemptId: calc.paymentAttemptId,
    captureEventId: calc.captureEventId,
    currency: calc.currency,
    captureAmountMinor: calc.captureAmountMinor,
    refundAmountMinor: calc.computedRefundAmountMinor,
    calculationFingerprint: calc.calculationFingerprint,
    expectedAccountingVersion,
    lines: calc.lines.map((l) => ({
      orderItemId: l.orderItemId,
      requestedQuantity: l.requestedQuantity,
      refundAmountMinor: l.refundAmountMinor,
    })),
  });
  if (!planned.ok) {
    return failReserve(planned.code, planned.message);
  }

  const replayedPlan =
    planned.value.status !== "planned"
      ? true
      : planned.value.ledgerId !== input.ledgerId
        ? true
        : false;
  // Replayed plan may already be committed — return reservation result without re-begin.
  if (planned.value.status === "committed") {
    return {
      ok: true,
      capability: PARTIAL_REFUND_SERVICE_ADAPTER_ID,
      version: PARTIAL_REFUND_SERVICE_ADAPTER_VERSION,
      ownership: partialRefundServiceAdapterOwnership(),
      reservationCommitted: true,
      ...NON_EVENTS,
      commit: planned.value,
      calculationFingerprint: calc.calculationFingerprint,
      refundAmountMinor: planned.value.refundAmountMinor,
      replayedPlan: true,
    };
  }

  if (planned.value.status === "committing") {
    return failReserve(
      "concurrent_conflict",
      "Ledger commit is already committing — do not auto-retry.",
      { ledgerId: planned.value.ledgerId }
    );
  }

  // 4) Begin
  const quantityGuard = purchasedQuantityGuardFromLineFacts(input.lines);
  const begun = await beginPartialRefundLedgerCommit(
    repo,
    planned.value.ledgerId,
    quantityGuard
  );
  if (!begun.ok) {
    return failReserve(begun.code, begun.message, {
      ledgerId: planned.value.ledgerId,
    });
  }

  // 5) Complete (reservation only)
  const completed = await completePartialRefundLedgerCommit(
    repo,
    begun.value.ledgerId
  );
  if (!completed.ok) {
    const failed = await failPartialRefundLedgerCommit(
      repo,
      begun.value.ledgerId,
      completed.code,
      completed.message.slice(0, 500)
    );
    return failReserve(completed.code, completed.message, {
      ledgerId: begun.value.ledgerId,
      failTransitionApplied: failed.ok,
    });
  }

  return {
    ok: true,
    capability: PARTIAL_REFUND_SERVICE_ADAPTER_ID,
    version: PARTIAL_REFUND_SERVICE_ADAPTER_VERSION,
    ownership: partialRefundServiceAdapterOwnership(),
    reservationCommitted: true,
    ...NON_EVENTS,
    commit: completed.value,
    calculationFingerprint: calc.calculationFingerprint,
    refundAmountMinor: completed.value.refundAmountMinor,
    replayedPlan,
  };
}
