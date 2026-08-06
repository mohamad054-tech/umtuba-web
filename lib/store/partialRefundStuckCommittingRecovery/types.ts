/**
 * Result types for stuck-committing recovery (in-flight lock release only).
 */

export type PartialRefundStuckCommittingRecoveryStatus =
  | "recovered"
  | "already_failed"
  | "invalid_state"
  | "unauthorized"
  | "not_found"
  | "stale_version"
  | "concurrent_conflict"
  | "validation_failed"
  | "unsupported";

export type PartialRefundStuckCommittingRecoveryNonEvents = {
  committingLockReleased: boolean;
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

export const RECOVERY_BASE_NON_EVENTS = {
  reservationCommitted: false,
  committedReservationCancelled: false,
  compensationPerformed: false,
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
} as const;

export type PartialRefundStuckCommittingRecoveryView = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: string;
  failureCode: string | null;
  failureMessageSafe: string | null;
  updatedAtIso: string;
};
