/**
 * Result types for committed-reservation accounting compensation.
 */

export type PartialRefundCommittedCompensationStatus =
  | "compensated"
  | "already_compensated"
  | "invalid_state"
  | "unauthorized"
  | "not_found"
  | "stale_version"
  | "concurrent_conflict"
  | "validation_failed"
  | "unsupported"
  | "repository_error";

export type PartialRefundCommittedCompensationNonEvents = {
  /** True only when this call restored ceilings (not idempotent replay). */
  compensationPerformed: boolean;
  providerRefundExecuted: false;
  moneyMoved: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
  payoutMutated: false;
  commerceConfirmActivated: false;
  committedReservationCancelled: false;
};

export const COMPENSATION_BASE_NON_EVENTS = {
  providerRefundExecuted: false,
  moneyMoved: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
  payoutMutated: false,
  commerceConfirmActivated: false,
  committedReservationCancelled: false,
} as const;

export type PartialRefundCommittedCompensationView = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  captureEventId: string;
  status: string;
  refundAmountMinor: number;
  compensationReasonSafe: string | null;
  compensatedAtIso: string | null;
  accountingVersion: number;
  updatedAtIso: string;
};
