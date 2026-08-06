/**
 * Read-only accounting derivation for partial-refund reservation review.
 * Never mutates ledger; never calls plan/begin/complete/fail.
 */

import type { PartialRefundLedgerRepository } from "../partialRefundLedger/repository";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPartialRefundUuid } from "../partialRefundPath/calculate";
import { loadTrustedPartialRefundReservationFacts } from "../partialRefundReservation/trustedFactLoader";
import {
  PARTIAL_REFUND_ACCOUNTING_AUDIT_ID,
  PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION,
  partialRefundAccountingAuditOwnership,
  type PartialRefundAccountingAuditOwnership,
} from "./capability";
import {
  ACCOUNTING_READ_NON_EVENTS,
  type PartialRefundAccountingCommittedView,
  type PartialRefundAccountingLineReview,
  type PartialRefundAccountingNonEvents,
  type PartialRefundAccountingReadStatus,
  type PartialRefundAccountingReviewModel,
} from "./types";

type AnyClient = SupabaseClient;

export type PartialRefundAccountingReadSuccess = {
  ok: true;
  status: "ok";
  capability: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_ID;
  version: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION;
  ownership: PartialRefundAccountingAuditOwnership;
  review: PartialRefundAccountingReviewModel;
} & PartialRefundAccountingNonEvents;

export type PartialRefundAccountingReadFailure = {
  ok: false;
  status: Exclude<PartialRefundAccountingReadStatus, "ok">;
  capability: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_ID;
  version: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION;
  ownership: PartialRefundAccountingAuditOwnership;
  message: string;
  code?: string;
} & PartialRefundAccountingNonEvents;

export type PartialRefundAccountingReadResult =
  | PartialRefundAccountingReadSuccess
  | PartialRefundAccountingReadFailure;

export type PartialRefundAccountingDetailSuccess = {
  ok: true;
  status: "ok";
  capability: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_ID;
  version: typeof PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION;
  ownership: PartialRefundAccountingAuditOwnership;
  reservation: PartialRefundAccountingCommittedView;
} & PartialRefundAccountingNonEvents;

export type PartialRefundAccountingDetailResult =
  | PartialRefundAccountingDetailSuccess
  | PartialRefundAccountingReadFailure;

function baseMeta() {
  return {
    capability: PARTIAL_REFUND_ACCOUNTING_AUDIT_ID,
    version: PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION,
    ownership: partialRefundAccountingAuditOwnership(),
    ...ACCOUNTING_READ_NON_EVENTS,
  } as const;
}

function fail(
  status: PartialRefundAccountingReadFailure["status"],
  message: string,
  code?: string
): PartialRefundAccountingReadFailure {
  return {
    ok: false,
    status,
    message,
    code,
    ...baseMeta(),
  };
}

function toCommittedView(
  commit: PartialRefundLedgerCommitRecord
): PartialRefundAccountingCommittedView {
  return {
    ledgerId: commit.ledgerId,
    status: commit.status,
    currency: commit.currency,
    reservedAmountMinor: commit.refundAmountMinor,
    calculationFingerprint: commit.calculationFingerprint,
    idempotencyKey: commit.idempotencyKey,
    lines: commit.lines.map((l) => ({
      orderItemId: l.orderItemId,
      requestedQuantity: l.requestedQuantity,
      reservedAmountMinor: l.refundAmountMinor,
    })),
    createdAtIso: commit.createdAtIso,
    updatedAtIso: commit.updatedAtIso,
  };
}

/**
 * Load capture accounting + committed reservations + derived remainings.
 * Read-only: uses getCaptureAccounting + listCommittedForCapture only.
 */
export async function loadPartialRefundCaptureAccountingReview(
  deps: {
    factClient: AnyClient;
    repository: PartialRefundLedgerRepository;
  },
  input: { storeId: string; paymentAttemptId: string }
): Promise<PartialRefundAccountingReadResult> {
  if (
    !isPartialRefundUuid(input.storeId) ||
    !isPartialRefundUuid(input.paymentAttemptId)
  ) {
    return fail(
      "validation_failed",
      "storeId and paymentAttemptId must be valid UUIDs.",
      "malformed_id"
    );
  }

  const facts = await loadTrustedPartialRefundReservationFacts(deps.factClient, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
  });
  if (!facts.ok) {
    if (facts.code === "unauthorized") {
      return fail("unauthorized", facts.message, facts.code);
    }
    if (facts.code === "not_found" || facts.code === "malformed_id") {
      return fail(
        facts.code === "malformed_id" ? "validation_failed" : "not_found",
        facts.message,
        facts.code
      );
    }
    if (facts.code === "unsupported") {
      return fail("unsupported", facts.message, facts.code);
    }
    if (
      facts.code === "inconsistent_ledger" ||
      facts.code === "currency_mismatch"
    ) {
      return fail("inconsistent_accounting", facts.message, facts.code);
    }
    return fail("validation_failed", facts.message, facts.code);
  }

  let snapshot = null as Awaited<
    ReturnType<PartialRefundLedgerRepository["getCaptureAccounting"]>
  >;
  try {
    snapshot = await deps.repository.getCaptureAccounting(
      facts.capture.captureEventId
    );
  } catch {
    return fail(
      "unsupported",
      "Unable to load capture accounting.",
      "malformed_repository_response"
    );
  }

  if (snapshot) {
    if (snapshot.storeId !== input.storeId) {
      return fail(
        "unauthorized",
        "Capture accounting does not belong to the requested store.",
        "unauthorized"
      );
    }
    if (snapshot.orderId !== facts.capture.orderId) {
      return fail(
        "inconsistent_accounting",
        "Capture accounting order mismatch.",
        "order_mismatch"
      );
    }
    if (snapshot.captureEventId !== facts.capture.captureEventId) {
      return fail(
        "inconsistent_accounting",
        "Capture accounting id mismatch.",
        "capture_mismatch"
      );
    }
    if (snapshot.currency !== facts.capture.currency) {
      return fail(
        "inconsistent_accounting",
        "Capture accounting currency mismatch.",
        "currency_mismatch"
      );
    }
    if (snapshot.captureAmountMinor !== facts.capture.captureAmountMinor) {
      return fail(
        "inconsistent_accounting",
        "Capture amount mismatch between trusted capture and accounting.",
        "amount_mismatch"
      );
    }
    if (
      !Number.isInteger(snapshot.committedRefundAmountMinor) ||
      snapshot.committedRefundAmountMinor < 0 ||
      snapshot.committedRefundAmountMinor > snapshot.captureAmountMinor
    ) {
      return fail(
        "inconsistent_accounting",
        "Committed reservation amount is inconsistent with capture.",
        "committed_amount_inconsistent"
      );
    }
    if (
      !Number.isInteger(snapshot.accountingVersion) ||
      snapshot.accountingVersion < 0
    ) {
      return fail(
        "inconsistent_accounting",
        "Accounting version is invalid.",
        "invalid_accounting_version"
      );
    }
  }

  const committedAmount = snapshot?.committedRefundAmountMinor ?? 0;
  const remainingAmount = facts.capture.captureAmountMinor - committedAmount;
  if (remainingAmount < 0) {
    return fail(
      "inconsistent_accounting",
      "Remaining reservable amount would be negative.",
      "negative_remaining_amount"
    );
  }

  const qtyMap = snapshot?.committedQuantityByLineId ?? {};
  const lines: PartialRefundAccountingLineReview[] = [];
  for (const sel of facts.selectableLines) {
    const fact = facts.lines.find((l) => l.orderItemId === sel.orderItemId);
    if (!fact) {
      return fail(
        "inconsistent_accounting",
        "Order line facts incomplete.",
        "missing_line_fact"
      );
    }
    const committedQty = Math.trunc(Number(qtyMap[sel.orderItemId] ?? 0));
    if (
      !Number.isInteger(committedQty) ||
      committedQty < 0 ||
      committedQty > fact.purchasedQuantity
    ) {
      return fail(
        "inconsistent_accounting",
        "Committed reserved quantity is inconsistent with purchased quantity.",
        "committed_qty_inconsistent"
      );
    }
    lines.push({
      orderItemId: sel.orderItemId,
      titleSnapshot: sel.titleSnapshot,
      purchasedQuantity: fact.purchasedQuantity,
      committedReservedQuantity: committedQty,
      remainingReservableQuantity: fact.purchasedQuantity - committedQty,
    });
  }

  let commits: readonly PartialRefundLedgerCommitRecord[] = [];
  try {
    commits = await deps.repository.listCommittedForCapture(
      facts.capture.captureEventId
    );
  } catch {
    return fail(
      "unsupported",
      "Unable to list committed reservations.",
      "malformed_repository_response"
    );
  }

  const scoped = commits.filter((c) => c.storeId === input.storeId);
  if (commits.length > 0 && scoped.length === 0) {
    return fail(
      "unauthorized",
      "Committed reservations do not belong to the requested store.",
      "unauthorized"
    );
  }

  const review: PartialRefundAccountingReviewModel = {
    storeId: facts.capture.storeId,
    orderId: facts.capture.orderId,
    paymentAttemptId: facts.capture.paymentAttemptId,
    captureEventId: facts.capture.captureEventId,
    currency: facts.capture.currency,
    captureAmountMinor: facts.capture.captureAmountMinor,
    committedReservationAmountMinor: committedAmount,
    remainingReservableAmountMinor: remainingAmount,
    accountingVersion: snapshot?.accountingVersion ?? 0,
    captureAccountingPresent: snapshot != null,
    lines,
    committedReservations: scoped.map(toCommittedView),
    warning: "ledger_reservation_only_no_provider_refund_or_money_movement",
  };

  return {
    ok: true,
    status: "ok",
    review,
    ...baseMeta(),
  };
}

/**
 * Optional committed reservation detail by ledger id (read-only getCommit).
 */
export async function getPartialRefundCommittedReservationDetail(
  deps: { repository: PartialRefundLedgerRepository },
  input: { ledgerId: string; expectedStoreId: string }
): Promise<PartialRefundAccountingDetailResult> {
  if (
    !isPartialRefundUuid(input.ledgerId) ||
    !isPartialRefundUuid(input.expectedStoreId)
  ) {
    return fail(
      "validation_failed",
      "ledgerId and storeId must be valid UUIDs.",
      "malformed_id"
    );
  }
  let commit: PartialRefundLedgerCommitRecord | null = null;
  try {
    commit = await deps.repository.getByLedgerId(input.ledgerId);
  } catch {
    return fail(
      "unsupported",
      "Unable to load reservation detail.",
      "malformed_repository_response"
    );
  }
  if (!commit) {
    return fail("not_found", "Committed reservation not found.", "not_found");
  }
  if (commit.storeId !== input.expectedStoreId) {
    return fail(
      "unauthorized",
      "Reservation does not belong to the requested store.",
      "unauthorized"
    );
  }
  if (commit.status !== "committed") {
    return fail(
      "not_found",
      "Only committed reservations are shown in this review surface.",
      "not_committed"
    );
  }
  return {
    ok: true,
    status: "ok",
    reservation: toCommittedView(commit),
    ...baseMeta(),
  };
}

/** Alias matching preferred internal operation name. */
export const listPartialRefundCommittedReservations =
  loadPartialRefundCaptureAccountingReview;
