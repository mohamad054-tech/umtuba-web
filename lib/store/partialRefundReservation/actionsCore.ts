/**
 * Testable reservation action core (admin request + actor-scoped read).
 * Reservation-only: never calls applyFullOrderRefund or providers.
 */

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartialRefundLedgerRepository } from "../partialRefundLedger/repository";
import {
  reservePartialRefundLedgerCommit,
  type ReservePartialRefundResult,
} from "../partialRefundLedger/reservationOrchestrator";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger/types";
import type { PartialRefundLineIntent } from "../partialRefundPath/types";
import {
  PARTIAL_REFUND_RESERVATION_ACTIONS_ID,
  PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION,
  partialRefundReservationActionsOwnership,
  type PartialRefundReservationActionsOwnership,
} from "./capability";
import {
  deriveReservationIdempotencyKey,
  validateOptionalIdempotencyKey,
} from "./idempotency";
import { loadTrustedPartialRefundReservationFacts } from "./trustedFactLoader";
import {
  RESERVATION_NON_EVENTS,
  type PartialRefundReservationActionStatus,
  type PartialRefundReservationNonEvents,
  type PartialRefundReservationSafeCommitView,
} from "./types";

type AnyClient = SupabaseClient;

export type PartialRefundReservationActionSuccess = {
  ok: true;
  status: "reservation_committed" | "reservation_replayed";
  capability: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_ID;
  version: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION;
  ownership: PartialRefundReservationActionsOwnership;
  reservationCommitted: true;
  reservation: PartialRefundReservationSafeCommitView;
} & PartialRefundReservationNonEvents;

export type PartialRefundReservationActionFailure = {
  ok: false;
  status: Exclude<
    PartialRefundReservationActionStatus,
    "reservation_committed" | "reservation_replayed"
  >;
  capability: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_ID;
  version: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION;
  ownership: PartialRefundReservationActionsOwnership;
  reservationCommitted: false;
  message: string;
  code?: string;
} & PartialRefundReservationNonEvents;

export type PartialRefundReservationActionResult =
  | PartialRefundReservationActionSuccess
  | PartialRefundReservationActionFailure;

export type PartialRefundReservationListSuccess = {
  ok: true;
  status: "ok";
  capability: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_ID;
  version: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION;
  ownership: PartialRefundReservationActionsOwnership;
  reservations: readonly PartialRefundReservationSafeCommitView[];
} & PartialRefundReservationNonEvents;

export type PartialRefundReservationListFailure = {
  ok: false;
  status: Exclude<
    PartialRefundReservationActionStatus,
    "reservation_committed" | "reservation_replayed"
  >;
  capability: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_ID;
  version: typeof PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION;
  ownership: PartialRefundReservationActionsOwnership;
  message: string;
  code?: string;
} & PartialRefundReservationNonEvents;

export type PartialRefundReservationListResult =
  | PartialRefundReservationListSuccess
  | PartialRefundReservationListFailure;

function baseMeta() {
  return {
    capability: PARTIAL_REFUND_RESERVATION_ACTIONS_ID,
    version: PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION,
    ownership: partialRefundReservationActionsOwnership(),
    ...RESERVATION_NON_EVENTS,
  } as const;
}

function failAction(
  status: PartialRefundReservationActionFailure["status"],
  message: string,
  code?: string
): PartialRefundReservationActionFailure {
  return {
    ok: false,
    status,
    reservationCommitted: false,
    message,
    code,
    ...baseMeta(),
  };
}

function failList(
  status: PartialRefundReservationListFailure["status"],
  message: string,
  code?: string
): PartialRefundReservationListFailure {
  return {
    ok: false,
    status,
    message,
    code,
    ...baseMeta(),
  };
}

function toSafeView(
  commit: PartialRefundLedgerCommitRecord
): PartialRefundReservationSafeCommitView {
  return {
    ledgerId: commit.ledgerId,
    storeId: commit.storeId,
    orderId: commit.orderId,
    captureEventId: commit.captureEventId,
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

function mapOrchestratorFailure(
  result: Extract<ReservePartialRefundResult, { ok: false }>
): PartialRefundReservationActionFailure {
  const code = result.code;
  if (code === "client_money_rejected") {
    return failAction("validation_failed", result.message, code);
  }
  if (
    code === "stale_version" ||
    code === "concurrent_conflict"
  ) {
    return failAction("stale_version", result.message, code);
  }
  if (
    code === "duplicate_idempotency_key" ||
    code === "duplicate_commit"
  ) {
    return failAction("idempotency_conflict", result.message, code);
  }
  if (
    code === "missing_capture" ||
    code === "missing_order_item" ||
    code === "unknown_refund" ||
    code === "unknown_line"
  ) {
    return failAction("not_found", result.message, code);
  }
  if (
    code === "missing_ownership" ||
    code === "unauthorized_store"
  ) {
    return failAction("unauthorized", result.message, code);
  }
  if (
    typeof code === "string" &&
    (code.startsWith("unsupported") || code === "unsupported_runtime")
  ) {
    return failAction("unsupported", result.message, code);
  }
  if (
    code === "malformed_id" ||
    code === "malformed_idempotency_key" ||
    code === "empty_selection" ||
    code === "empty_lines" ||
    code === "zero_quantity" ||
    code === "negative_quantity" ||
    code === "over_quantity" ||
    code === "over_refund" ||
    code === "duplicate_line" ||
    code === "currency_mismatch" ||
    code === "inconsistent_line_math" ||
    code === "inconsistent_prior_accounting" ||
    code === "zero_amount" ||
    code === "negative_amount"
  ) {
    return failAction("validation_failed", result.message, code);
  }
  return failAction("validation_failed", result.message, code);
}

function mapFactLoadFailure(
  code: string,
  message: string
): PartialRefundReservationActionFailure {
  if (code === "client_money_rejected" || code === "validation_failed") {
    return failAction("validation_failed", message, code);
  }
  if (code === "unauthorized") {
    return failAction("unauthorized", message, code);
  }
  if (code === "not_found" || code === "malformed_id") {
    return failAction(
      code === "malformed_id" ? "validation_failed" : "not_found",
      message,
      code
    );
  }
  if (code === "unsupported") {
    return failAction("unsupported", message, code);
  }
  if (code === "empty_selection") {
    return failAction("validation_failed", message, code);
  }
  return failAction("validation_failed", message, code);
}

export type RequestPartialRefundReservationDeps = {
  /** Privileged reader for trusted facts (service-role). */
  factClient: AnyClient;
  repository: PartialRefundLedgerRepository;
  /** Optional override for tests. */
  reserve?: typeof reservePartialRefundLedgerCommit;
  /** Optional UUID factory for tests. */
  newLedgerId?: () => string;
};

/**
 * Admin (or privileged) reservation request: load trusted facts → reserve.
 * Does not authorize the actor — caller must assert platform admin first.
 */
export async function requestPartialRefundReservation(
  deps: RequestPartialRefundReservationDeps,
  input: {
    storeId: string;
    paymentAttemptId: string;
    intent: readonly PartialRefundLineIntent[];
    idempotencyKey?: string | null;
    clientBag?: Record<string, unknown>;
  }
): Promise<PartialRefundReservationActionResult> {
  const bag: Record<string, unknown> = {
    ...(input.clientBag ?? {}),
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
    intent: input.intent,
  };
  if (
    Object.prototype.hasOwnProperty.call(bag, "amountMinor") ||
    Object.prototype.hasOwnProperty.call(bag, "currency") ||
    Object.prototype.hasOwnProperty.call(bag, "unitPriceMinor")
  ) {
    // Explicit bag may still carry money keys — loader rejects too.
  }

  const idem = validateOptionalIdempotencyKey(input.idempotencyKey);
  if (!idem.ok) {
    return failAction("validation_failed", idem.message, "malformed_idempotency_key");
  }

  if (!input.intent || input.intent.length === 0) {
    return failAction(
      "validation_failed",
      "At least one order line quantity is required.",
      "empty_selection"
    );
  }

  const loaded = await loadTrustedPartialRefundReservationFacts(deps.factClient, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
    intent: input.intent,
    clientBag: bag,
  });
  if (!loaded.ok) {
    return mapFactLoadFailure(loaded.code, loaded.message);
  }

  const idempotencyKey =
    idem.key ??
    deriveReservationIdempotencyKey(
      loaded.capture.captureEventId,
      input.intent
    );

  const ledgerId = (deps.newLedgerId ?? randomUUID)();
  const reserve = deps.reserve ?? reservePartialRefundLedgerCommit;
  const result = await reserve(deps.repository, {
    capture: loaded.capture,
    lines: loaded.lines,
    intent: input.intent,
    intentBag: bag,
    ledgerId,
    idempotencyKey,
  });

  if (!result.ok) {
    return mapOrchestratorFailure(result);
  }

  return {
    ok: true,
    status: result.replayedPlan ? "reservation_replayed" : "reservation_committed",
    reservationCommitted: true,
    reservation: toSafeView(result.commit),
    ...baseMeta(),
  };
}

/**
 * Actor-scoped list of committed reservations for a capture.
 * Caller must already authorize store ownership / admin.
 */
export async function listPartialRefundReservationsForCapture(
  repository: PartialRefundLedgerRepository,
  input: { captureEventId: string; expectedStoreId: string }
): Promise<PartialRefundReservationListResult> {
  try {
    const rows = await repository.listCommittedForCapture(input.captureEventId);
    const filtered = rows.filter((r) => r.storeId === input.expectedStoreId);
    if (rows.length > 0 && filtered.length === 0) {
      return failList(
        "unauthorized",
        "Reservations do not belong to the requested store.",
        "unauthorized"
      );
    }
    return {
      ok: true,
      status: "ok",
      reservations: filtered.map(toSafeView),
      ...baseMeta(),
    };
  } catch {
    return failList(
      "unsupported",
      "Unable to list reservations.",
      "malformed_repository_response"
    );
  }
}

/**
 * Resolve capture for store+paymentAttempt then list reservations.
 */
export async function listPartialRefundReservationsForPaymentAttempt(
  deps: { factClient: AnyClient; repository: PartialRefundLedgerRepository },
  input: { storeId: string; paymentAttemptId: string; clientBag?: Record<string, unknown> }
): Promise<PartialRefundReservationListResult> {
  const loaded = await loadTrustedPartialRefundReservationFacts(deps.factClient, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
    clientBag: input.clientBag,
  });
  if (!loaded.ok) {
    const mapped = mapFactLoadFailure(loaded.code, loaded.message);
    return failList(mapped.status, mapped.message, mapped.code);
  }
  return listPartialRefundReservationsForCapture(deps.repository, {
    captureEventId: loaded.capture.captureEventId,
    expectedStoreId: input.storeId,
  });
}
