/**
 * Admin-only read-only visibility for in-flight committing ledger rows.
 */

import {
  isPartialRefundLedgerUuid,
  type PartialRefundLedgerRepository,
} from "../partialRefundLedger";
import {
  PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID,
  PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION,
  partialRefundInFlightCommittingVisibilityOwnership,
  type PartialRefundInFlightCommittingVisibilityOwnership,
} from "./capability";
import {
  DEFAULT_COMMITTING_LIST_LIMIT,
  MAX_COMMITTING_LIST_LIMIT,
  VISIBILITY_BASE_NON_EVENTS,
  type PartialRefundInFlightCommittingVisibilityNonEvents,
  type PartialRefundInFlightCommittingVisibilityRow,
  type PartialRefundInFlightCommittingVisibilityStatus,
} from "./types";

export type ListInFlightCommittingSuccess = {
  ok: true;
  status: "listed" | "empty";
  capability: typeof PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID;
  version: typeof PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION;
  ownership: PartialRefundInFlightCommittingVisibilityOwnership;
  rows: readonly PartialRefundInFlightCommittingVisibilityRow[];
  limit: number;
} & PartialRefundInFlightCommittingVisibilityNonEvents;

export type ListInFlightCommittingFailure = {
  ok: false;
  status: Exclude<
    PartialRefundInFlightCommittingVisibilityStatus,
    "listed" | "empty"
  >;
  capability: typeof PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID;
  version: typeof PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION;
  ownership: PartialRefundInFlightCommittingVisibilityOwnership;
  message: string;
  code?: string;
} & PartialRefundInFlightCommittingVisibilityNonEvents;

export type ListInFlightCommittingResult =
  | ListInFlightCommittingSuccess
  | ListInFlightCommittingFailure;

export type ListInFlightCommittingDeps = {
  repository: PartialRefundLedgerRepository;
};

function baseMeta() {
  return {
    capability: PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID,
    version: PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION,
    ownership: partialRefundInFlightCommittingVisibilityOwnership(),
    ...VISIBILITY_BASE_NON_EVENTS,
  } as const;
}

function fail(
  status: ListInFlightCommittingFailure["status"],
  message: string,
  code?: string
): ListInFlightCommittingFailure {
  return {
    ok: false,
    status,
    message,
    code,
    ...baseMeta(),
  };
}

function toRow(raw: {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: "committing";
  accountingVersion: number;
  createdAtIso: string;
  updatedAtIso: string;
}): PartialRefundInFlightCommittingVisibilityRow {
  return {
    ...raw,
    label: `ledger ${raw.ledgerId.slice(0, 8)}…`,
  };
}

/**
 * List in-flight committing ledger commits (read-only).
 */
export async function listInFlightCommittingPartialRefundReservations(
  deps: ListInFlightCommittingDeps,
  input: {
    storeId?: string | null;
    captureEventId?: string | null;
    limit?: number | null;
  } = {}
): Promise<ListInFlightCommittingResult> {
  const storeId = input.storeId?.trim() || null;
  const captureEventId = input.captureEventId?.trim() || null;

  if (storeId && !isPartialRefundLedgerUuid(storeId)) {
    return fail(
      "validation_failed",
      "storeId must be a valid UUID when provided.",
      "malformed_id"
    );
  }
  if (captureEventId && !isPartialRefundLedgerUuid(captureEventId)) {
    return fail(
      "validation_failed",
      "captureEventId must be a valid UUID when provided.",
      "malformed_id"
    );
  }

  let limit = DEFAULT_COMMITTING_LIST_LIMIT;
  if (input.limit != null && input.limit !== undefined) {
    if (
      typeof input.limit !== "number" ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > MAX_COMMITTING_LIST_LIMIT
    ) {
      return fail(
        "validation_failed",
        `limit must be an integer between 1 and ${MAX_COMMITTING_LIST_LIMIT}.`,
        "malformed_limit"
      );
    }
    limit = input.limit;
  }

  if (typeof deps.repository.listCommitting !== "function") {
    return fail(
      "unsupported",
      "Repository does not support committing visibility.",
      "unsupported_repository"
    );
  }

  let rowsRaw;
  try {
    rowsRaw = await deps.repository.listCommitting({
      storeId,
      captureEventId,
      limit,
    });
  } catch {
    return fail(
      "repository_error",
      "Unable to list in-flight committing ledger commits.",
      "repository_error"
    );
  }

  const rows: PartialRefundInFlightCommittingVisibilityRow[] = [];
  for (const r of rowsRaw) {
    if (r.status !== "committing") {
      return fail(
        "repository_error",
        "Repository returned a non-committing row.",
        "invalid_status"
      );
    }
    if (storeId && r.storeId !== storeId) {
      return fail(
        "unauthorized",
        "Listed row does not match requested store scope.",
        "cross_store"
      );
    }
    if (captureEventId && r.captureEventId !== captureEventId) {
      return fail(
        "unauthorized",
        "Listed row does not match requested capture scope.",
        "cross_capture"
      );
    }
    rows.push(toRow(r));
  }

  // Enforce oldest-first deterministic order defensively.
  rows.sort((a, b) => {
    const t = a.createdAtIso.localeCompare(b.createdAtIso);
    return t !== 0 ? t : a.ledgerId.localeCompare(b.ledgerId);
  });

  return {
    ok: true,
    status: rows.length === 0 ? "empty" : "listed",
    rows,
    limit,
    ...baseMeta(),
  };
}
