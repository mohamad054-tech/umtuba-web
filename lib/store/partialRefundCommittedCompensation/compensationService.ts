/**
 * Accounting-only committed reservation compensation orchestration.
 * Never calls payment providers, moves money, restocks, or mutates settlement.
 */

import {
  compensatePartialRefundLedgerCommit,
  isPartialRefundLedgerUuid,
  type PartialRefundLedgerRepository,
} from "../partialRefundLedger";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger/types";
import {
  PARTIAL_REFUND_COMMITTED_COMPENSATION_ID,
  PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION,
  partialRefundCommittedCompensationOwnership,
  type PartialRefundCommittedCompensationOwnership,
} from "./capability";
import {
  COMPENSATION_BASE_NON_EVENTS,
  type PartialRefundCommittedCompensationNonEvents,
  type PartialRefundCommittedCompensationStatus,
  type PartialRefundCommittedCompensationView,
} from "./types";

const REASON_MIN = 3;
const REASON_MAX = 500;

export type CompensateCommittedReservationSuccess = {
  ok: true;
  status: "compensated" | "already_compensated";
  capability: typeof PARTIAL_REFUND_COMMITTED_COMPENSATION_ID;
  version: typeof PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION;
  ownership: PartialRefundCommittedCompensationOwnership;
  commit: PartialRefundCommittedCompensationView;
  restoredRefundAmountMinor: number;
} & PartialRefundCommittedCompensationNonEvents;

export type CompensateCommittedReservationFailure = {
  ok: false;
  status: Exclude<
    PartialRefundCommittedCompensationStatus,
    "compensated" | "already_compensated"
  >;
  capability: typeof PARTIAL_REFUND_COMMITTED_COMPENSATION_ID;
  version: typeof PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION;
  ownership: PartialRefundCommittedCompensationOwnership;
  message: string;
  code?: string;
  commit?: PartialRefundCommittedCompensationView;
} & PartialRefundCommittedCompensationNonEvents;

export type CompensateCommittedReservationResult =
  | CompensateCommittedReservationSuccess
  | CompensateCommittedReservationFailure;

export type CompensateCommittedReservationDeps = {
  repository: PartialRefundLedgerRepository;
  /** Optional override for tests. */
  compensateCommit?: typeof compensatePartialRefundLedgerCommit;
};

function baseMeta() {
  return {
    capability: PARTIAL_REFUND_COMMITTED_COMPENSATION_ID,
    version: PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION,
    ownership: partialRefundCommittedCompensationOwnership(),
    ...COMPENSATION_BASE_NON_EVENTS,
  } as const;
}

function toView(
  commit: PartialRefundLedgerCommitRecord
): PartialRefundCommittedCompensationView {
  return {
    ledgerId: commit.ledgerId,
    storeId: commit.storeId,
    orderId: commit.orderId,
    captureEventId: commit.captureEventId,
    status: commit.status,
    refundAmountMinor: commit.refundAmountMinor,
    compensationReasonSafe: commit.compensationReasonSafe,
    compensatedAtIso: commit.compensatedAtIso,
    accountingVersion: commit.accountingVersion,
    updatedAtIso: commit.updatedAtIso,
  };
}

function fail(
  status: CompensateCommittedReservationFailure["status"],
  message: string,
  extra?: { code?: string; commit?: PartialRefundCommittedCompensationView }
): CompensateCommittedReservationFailure {
  return {
    ok: false,
    status,
    message,
    compensationPerformed: false,
    ...baseMeta(),
    ...extra,
  };
}

/**
 * Sanitize required operator reason for compensation RPC (3..500).
 */
export function sanitizeCompensationOperatorReason(
  raw: string | null | undefined
): { ok: true; reason: string } | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return {
      ok: false,
      message: `Operator reason is required (${REASON_MIN}–${REASON_MAX} characters).`,
    };
  }
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < REASON_MIN || t.length > REASON_MAX) {
    return {
      ok: false,
      message: `Operator reason must be ${REASON_MIN}–${REASON_MAX} characters.`,
    };
  }
  return { ok: true, reason: t.slice(0, REASON_MAX) };
}

/**
 * Compensate a committed ledger reservation: restore amount + line qty ceilings once.
 * Accounting-only — no provider refund, money, restock, entitlement, or settlement.
 */
export async function compensateCommittedPartialRefundReservation(
  deps: CompensateCommittedReservationDeps,
  input: {
    ledgerId: string;
    operatorReason: string;
    /** Optional trusted store scope check. */
    expectedStoreId?: string | null;
  }
): Promise<CompensateCommittedReservationResult> {
  if (!isPartialRefundLedgerUuid(input.ledgerId)) {
    return fail("validation_failed", "Ledger id must be a valid UUID.", {
      code: "malformed_id",
    });
  }
  if (
    input.expectedStoreId != null &&
    input.expectedStoreId.trim() !== "" &&
    !isPartialRefundLedgerUuid(input.expectedStoreId)
  ) {
    return fail(
      "validation_failed",
      "expectedStoreId must be a valid UUID when provided.",
      { code: "malformed_id" }
    );
  }

  const reason = sanitizeCompensationOperatorReason(input.operatorReason);
  if (!reason.ok) {
    return fail("validation_failed", reason.message, {
      code: "malformed_reason",
    });
  }

  let commit: PartialRefundLedgerCommitRecord | null = null;
  try {
    commit = await deps.repository.getByLedgerId(input.ledgerId);
  } catch {
    return fail("repository_error", "Unable to load ledger commit.", {
      code: "malformed_repository_response",
    });
  }

  if (!commit) {
    return fail("not_found", "Ledger commit not found.", {
      code: "unknown_refund",
    });
  }

  if (
    input.expectedStoreId != null &&
    input.expectedStoreId.trim() !== "" &&
    commit.storeId !== input.expectedStoreId.trim()
  ) {
    return fail(
      "unauthorized",
      "Ledger commit does not belong to the requested store.",
      { code: "unauthorized", commit: toView(commit) }
    );
  }

  if (commit.status !== "committed" && commit.status !== "compensated") {
    return fail(
      "invalid_state",
      "Only committed (or already compensated) ledger reservations can be compensated.",
      { code: "invalid_state", commit: toView(commit) }
    );
  }

  const compensateFn =
    deps.compensateCommit ?? compensatePartialRefundLedgerCommit;
  const compensated = await compensateFn(
    deps.repository,
    input.ledgerId,
    reason.reason,
    input.expectedStoreId
  );

  if (!compensated.ok) {
    if (
      compensated.code === "stale_version" ||
      compensated.code === "concurrent_conflict"
    ) {
      return fail(
        compensated.code === "stale_version"
          ? "stale_version"
          : "concurrent_conflict",
        compensated.message,
        { code: compensated.code }
      );
    }
    if (compensated.code === "invalid_state") {
      return fail("invalid_state", compensated.message, {
        code: compensated.code,
      });
    }
    if (compensated.code === "unknown_refund") {
      return fail("not_found", compensated.message, {
        code: compensated.code,
      });
    }
    if (compensated.code === "missing_ownership") {
      return fail("unauthorized", compensated.message, {
        code: compensated.code,
      });
    }
    if (
      compensated.code === "malformed_id" ||
      compensated.code === "malformed_idempotency_key"
    ) {
      return fail("validation_failed", compensated.message, {
        code: compensated.code,
      });
    }
    return fail("unsupported", compensated.message, {
      code: compensated.code,
    });
  }

  if (compensated.value.commit.status !== "compensated") {
    return fail(
      "unsupported",
      "Compensate transition did not result in compensated status.",
      {
        code: "unexpected_status",
        commit: toView(compensated.value.commit),
      }
    );
  }

  const already = compensated.value.alreadyCompensated;
  return {
    ok: true,
    status: already ? "already_compensated" : "compensated",
    compensationPerformed: !already,
    commit: toView(compensated.value.commit),
    restoredRefundAmountMinor: compensated.value.restoredRefundAmountMinor,
    ...baseMeta(),
  };
}
