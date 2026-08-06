/**
 * Commit boundary orchestration — ledger reservation only.
 * Never calls Stripe, Sync refund, restock, entitlement, or settlement unwind.
 */

import type { TrustedPartialRefundLineFact } from "../partialRefundPath/types";
import type { PartialRefundLedgerRepository } from "./repository";
import {
  assertPartialRefundLedgerTransition,
  isPartialRefundLedgerRetryAllowed,
} from "./stateMachine";
import type {
  PartialRefundLedgerCommitRecord,
  PartialRefundLedgerPlanInput,
  PartialRefundLedgerResult,
} from "./types";
import {
  assertPartialRefundMoneyExecutionAllowed,
  failLedger,
  okLedger,
  validateLedgerPlanInput,
} from "./validate";

function nowIso(): string {
  return new Date().toISOString();
}

export type BeginCommitQuantityGuard = {
  /** Trusted purchased quantities for lines on the ledger entry. */
  purchasedQuantityByLineId: Readonly<Record<string, number>>;
};

/**
 * Create a planned ledger entry from a trusted calculation plan.
 * Idempotent: same store + idempotencyKey returns existing record when fingerprint matches.
 */
export async function planPartialRefundLedgerCommit(
  repo: PartialRefundLedgerRepository,
  input: PartialRefundLedgerPlanInput
): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
  const validated = validateLedgerPlanInput(input);
  if (!validated.ok) return validated;

  const existing = await repo.getByIdempotencyKey(
    validated.value.storeId,
    validated.value.idempotencyKey
  );
  if (existing) {
    if (
      existing.calculationFingerprint === validated.value.calculationFingerprint &&
      existing.refundAmountMinor === validated.value.refundAmountMinor &&
      existing.captureEventId === validated.value.captureEventId
    ) {
      return okLedger(existing);
    }
    return failLedger(
      "duplicate_idempotency_key",
      "Idempotency key reuse with different plan payload."
    );
  }

  const byId = await repo.getByLedgerId(validated.value.ledgerId);
  if (byId) {
    return failLedger("duplicate_ledger_id", "Ledger id already exists.");
  }

  return repo.insertPlanned(validated.value, nowIso());
}

/**
 * planned|failed → committing, with quantity ceiling re-check against committed qty.
 */
export async function beginPartialRefundLedgerCommit(
  repo: PartialRefundLedgerRepository,
  ledgerId: string,
  quantityGuard: BeginCommitQuantityGuard
): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
  const row = await repo.getByLedgerId(ledgerId);
  if (!row) {
    return failLedger("unknown_refund", "Ledger commit not found.");
  }
  if (row.status === "committed") {
    return failLedger("duplicate_commit", "Ledger already committed.");
  }
  if (row.status === "committing") {
    return failLedger(
      "concurrent_conflict",
      "Ledger commit already in committing state."
    );
  }
  if (row.status === "failed" && !isPartialRefundLedgerRetryAllowed(row.status)) {
    return failLedger("unsupported_transition", "Retry not allowed.");
  }

  const capture = await repo.getCaptureAccounting(row.captureEventId);
  if (!capture) {
    return failLedger("missing_capture", "Capture accounting missing.");
  }

  for (const line of row.lines) {
    const purchased = quantityGuard.purchasedQuantityByLineId[line.orderItemId];
    if (purchased === undefined) {
      return failLedger(
        "missing_order_item",
        "Trusted purchased quantity missing for ledger line."
      );
    }
    if (!Number.isInteger(purchased) || purchased <= 0) {
      return failLedger(
        "missing_order_item",
        "Purchased quantity must be a positive integer."
      );
    }
    const committedQty =
      capture.committedQuantityByLineId[line.orderItemId] ?? 0;
    if (committedQty + line.requestedQuantity > purchased) {
      return failLedger(
        "over_quantity",
        "Begin commit would exceed purchased quantity for a line."
      );
    }
  }

  const from = row.status as "planned" | "failed";
  const transition = assertPartialRefundLedgerTransition(from, "committing");
  if (!transition.ok) {
    return failLedger(transition.code, transition.message);
  }

  return repo.transitionToCommitting(
    ledgerId,
    from,
    capture.accountingVersion,
    nowIso(),
    quantityGuard.purchasedQuantityByLineId
  );
}

/**
 * committing → committed (durable reservation). Does not execute money.
 */
export async function completePartialRefundLedgerCommit(
  repo: PartialRefundLedgerRepository,
  ledgerId: string
): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
  // Ledger "committed" = durable reservation only. Provider money path stays unsupported.
  const moneyGate = assertPartialRefundMoneyExecutionAllowed();
  if (moneyGate.ok) {
    return failLedger(
      "unsupported_runtime",
      "Money execution must remain unsupported at ledger boundary."
    );
  }

  const row = await repo.getByLedgerId(ledgerId);
  if (!row) {
    return failLedger("unknown_refund", "Ledger commit not found.");
  }
  if (row.status === "committed") {
    return failLedger("duplicate_commit", "Ledger already committed.");
  }
  if (row.status !== "committing") {
    return failLedger(
      "invalid_state",
      "Ledger must be committing before complete."
    );
  }

  const capture = await repo.getCaptureAccounting(row.captureEventId);
  if (!capture) {
    return failLedger("missing_capture", "Capture accounting missing.");
  }

  return repo.completeCommitted(
    ledgerId,
    capture.accountingVersion,
    nowIso()
  );
}

/**
 * committing → failed. Releases in-flight reservation without durable money impact.
 * Committed entries are immutable (no rollback of committed reservations in V1).
 */
export async function failPartialRefundLedgerCommit(
  repo: PartialRefundLedgerRepository,
  ledgerId: string,
  code: string,
  messageSafe: string
): Promise<PartialRefundLedgerResult<PartialRefundLedgerCommitRecord>> {
  const row = await repo.getByLedgerId(ledgerId);
  if (!row) {
    return failLedger("unknown_refund", "Ledger commit not found.");
  }
  if (row.status === "committed") {
    return failLedger(
      "invalid_state",
      "Committed ledger entries have no rollback in V1 — compensation requires a new GO."
    );
  }
  return repo.markFailed(ledgerId, code, messageSafe, nowIso());
}

/**
 * Derive prior accounting for calculatePartialRefundPlan from committed ledger rows.
 */
export function priorAccountingFromCommittedLedger(
  committed: readonly PartialRefundLedgerCommitRecord[]
): {
  priorRefundedAmountMinor: number;
  priorRefundedQuantityByLineId: Record<string, number>;
} {
  let priorRefundedAmountMinor = 0;
  const priorRefundedQuantityByLineId: Record<string, number> = {};
  for (const entry of committed) {
    if (entry.status !== "committed") continue;
    priorRefundedAmountMinor += entry.refundAmountMinor;
    for (const line of entry.lines) {
      priorRefundedQuantityByLineId[line.orderItemId] =
        (priorRefundedQuantityByLineId[line.orderItemId] ?? 0) +
        line.requestedQuantity;
    }
  }
  return { priorRefundedAmountMinor, priorRefundedQuantityByLineId };
}

export function purchasedQuantityGuardFromLineFacts(
  lines: readonly TrustedPartialRefundLineFact[]
): BeginCommitQuantityGuard {
  const purchasedQuantityByLineId: Record<string, number> = {};
  for (const line of lines) {
    purchasedQuantityByLineId[line.orderItemId] = line.purchasedQuantity;
  }
  return { purchasedQuantityByLineId };
}
