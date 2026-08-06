/**
 * Result types — in-flight committing visibility (read-only).
 */

export type PartialRefundInFlightCommittingVisibilityStatus =
  | "listed"
  | "empty"
  | "unauthorized"
  | "validation_failed"
  | "unsupported"
  | "repository_error";

export type PartialRefundInFlightCommittingVisibilityNonEvents = {
  readOnly: true;
  stateChanged: false;
  committingLockReleased: false;
  recoveryPerformed: false;
  reservationCommitted: false;
  committedReservationCancelled: false;
  compensationPerformed: false;
  providerRefundExecuted: false;
  moneyMoved: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
};

export const VISIBILITY_BASE_NON_EVENTS = {
  readOnly: true,
  stateChanged: false,
  committingLockReleased: false,
  recoveryPerformed: false,
  reservationCommitted: false,
  committedReservationCancelled: false,
  compensationPerformed: false,
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
} as const satisfies PartialRefundInFlightCommittingVisibilityNonEvents;

export type PartialRefundInFlightCommittingVisibilityRow = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: "committing";
  accountingVersion: number;
  createdAtIso: string;
  updatedAtIso: string;
  /** Short safe label for operators (ledger id prefix). */
  label: string;
};

export const DEFAULT_COMMITTING_LIST_LIMIT = 50;
export const MAX_COMMITTING_LIST_LIMIT = 100;
