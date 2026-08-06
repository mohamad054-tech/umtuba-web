/**
 * Admin-only stuck-committing recovery: committing → failed.
 * Releases in-flight capture lock only — not compensation or money refund.
 */

import {
  failPartialRefundLedgerCommit,
  isPartialRefundLedgerUuid,
  type PartialRefundLedgerRepository,
} from "../partialRefundLedger";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger/types";
import {
  PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID,
  PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION,
  partialRefundStuckCommittingRecoveryOwnership,
  type PartialRefundStuckCommittingRecoveryOwnership,
} from "./capability";
import {
  RECOVERY_BASE_NON_EVENTS,
  type PartialRefundStuckCommittingRecoveryNonEvents,
  type PartialRefundStuckCommittingRecoveryStatus,
  type PartialRefundStuckCommittingRecoveryView,
} from "./types";

const FAILURE_CODE = "admin_stuck_committing_recovery";
const DEFAULT_REASON =
  "Admin recovered stuck in-flight reservation (committing lock released).";
const REASON_MIN = 3;
const REASON_MAX = 500;

export type RecoverStuckCommittingSuccess = {
  ok: true;
  status: "recovered";
  capability: typeof PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID;
  version: typeof PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION;
  ownership: PartialRefundStuckCommittingRecoveryOwnership;
  commit: PartialRefundStuckCommittingRecoveryView;
} & PartialRefundStuckCommittingRecoveryNonEvents;

export type RecoverStuckCommittingFailure = {
  ok: false;
  status: Exclude<PartialRefundStuckCommittingRecoveryStatus, "recovered">;
  capability: typeof PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID;
  version: typeof PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION;
  ownership: PartialRefundStuckCommittingRecoveryOwnership;
  message: string;
  code?: string;
  commit?: PartialRefundStuckCommittingRecoveryView;
} & PartialRefundStuckCommittingRecoveryNonEvents;

export type RecoverStuckCommittingResult =
  | RecoverStuckCommittingSuccess
  | RecoverStuckCommittingFailure;

export type RecoverStuckCommittingDeps = {
  repository: PartialRefundLedgerRepository;
  /** Optional override for tests. */
  failCommit?: typeof failPartialRefundLedgerCommit;
};

function baseMeta() {
  return {
    capability: PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID,
    version: PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION,
    ownership: partialRefundStuckCommittingRecoveryOwnership(),
    ...RECOVERY_BASE_NON_EVENTS,
  } as const;
}

function toView(
  commit: PartialRefundLedgerCommitRecord
): PartialRefundStuckCommittingRecoveryView {
  return {
    ledgerId: commit.ledgerId,
    storeId: commit.storeId,
    orderId: commit.orderId,
    captureEventId: commit.captureEventId,
    status: commit.status,
    failureCode: commit.failureCode,
    failureMessageSafe: commit.failureMessageSafe,
    updatedAtIso: commit.updatedAtIso,
  };
}

function fail(
  status: RecoverStuckCommittingFailure["status"],
  message: string,
  extra?: { code?: string; commit?: PartialRefundStuckCommittingRecoveryView }
): RecoverStuckCommittingFailure {
  return {
    ok: false,
    status,
    message,
    committingLockReleased: false,
    ...baseMeta(),
    ...extra,
  };
}

/**
 * Sanitize optional operator reason for fail RPC (1..500 after defaulting).
 */
export function sanitizeRecoveryOperatorReason(
  raw: string | null | undefined
): { ok: true; reason: string } | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, reason: DEFAULT_REASON };
  }
  const t = raw.trim().replace(/\s+/g, " ");
  if (t.length < REASON_MIN || t.length > REASON_MAX) {
    return {
      ok: false,
      message: `Operator reason must be ${REASON_MIN}–${REASON_MAX} characters when provided.`,
    };
  }
  // Reject language that implies money cancel/compensation.
  const lower = t.toLowerCase();
  if (
    lower.includes("refund money") ||
    lower.includes("money refund") ||
    lower.includes("compensate") ||
    lower.includes("cancel committed")
  ) {
    return {
      ok: false,
      message:
        "Operator reason must not claim money refund, compensation, or committed cancellation.",
    };
  }
  return { ok: true, reason: t.slice(0, 500) };
}

/**
 * Recover a stuck committing ledger row: committing → failed.
 * Does not touch committed accounting ceilings.
 */
export async function recoverStuckCommittingPartialRefundReservation(
  deps: RecoverStuckCommittingDeps,
  input: {
    ledgerId: string;
    /** Optional trusted store scope check (platform admin may omit). */
    expectedStoreId?: string | null;
    operatorReason?: string | null;
  }
): Promise<RecoverStuckCommittingResult> {
  if (!isPartialRefundLedgerUuid(input.ledgerId)) {
    return fail(
      "validation_failed",
      "Ledger id must be a valid UUID.",
      { code: "malformed_id" }
    );
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

  const reason = sanitizeRecoveryOperatorReason(input.operatorReason);
  if (!reason.ok) {
    return fail("validation_failed", reason.message, {
      code: "malformed_reason",
    });
  }

  let commit: PartialRefundLedgerCommitRecord | null = null;
  try {
    commit = await deps.repository.getByLedgerId(input.ledgerId);
  } catch {
    return fail(
      "unsupported",
      "Unable to load ledger commit.",
      { code: "malformed_repository_response" }
    );
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

  if (commit.status === "failed") {
    return fail(
      "already_failed",
      "Ledger commit is already failed — in-flight lock is not held.",
      { code: "already_failed", commit: toView(commit) }
    );
  }
  if (commit.status === "committed") {
    return fail(
      "invalid_state",
      "Committed reservations cannot be cancelled or compensated by this recovery.",
      { code: "invalid_state", commit: toView(commit) }
    );
  }
  if (commit.status === "planned") {
    return fail(
      "invalid_state",
      "Only committing in-flight reservations can be recovered.",
      { code: "invalid_state", commit: toView(commit) }
    );
  }
  if (commit.status !== "committing") {
    return fail(
      "unsupported",
      "Unsupported ledger status for stuck-committing recovery.",
      { code: "unsupported_transition", commit: toView(commit) }
    );
  }

  const failFn = deps.failCommit ?? failPartialRefundLedgerCommit;
  const failed = await failFn(
    deps.repository,
    input.ledgerId,
    FAILURE_CODE,
    reason.reason
  );

  if (!failed.ok) {
    if (failed.code === "stale_version" || failed.code === "concurrent_conflict") {
      return fail(
        failed.code === "stale_version" ? "stale_version" : "concurrent_conflict",
        failed.message,
        { code: failed.code }
      );
    }
    if (failed.code === "invalid_state") {
      return fail("invalid_state", failed.message, { code: failed.code });
    }
    if (failed.code === "unknown_refund") {
      return fail("not_found", failed.message, { code: failed.code });
    }
    if (failed.code === "unsupported_transition") {
      return fail("unsupported", failed.message, { code: failed.code });
    }
    return fail("unsupported", failed.message, { code: failed.code });
  }

  if (failed.value.status !== "failed") {
    return fail(
      "unsupported",
      "Fail transition did not result in failed status.",
      { code: "unexpected_status", commit: toView(failed.value) }
    );
  }

  return {
    ok: true,
    status: "recovered",
    committingLockReleased: true,
    commit: toView(failed.value),
    ...baseMeta(),
  };
}
