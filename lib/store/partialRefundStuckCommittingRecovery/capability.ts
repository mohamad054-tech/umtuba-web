/**
 * Capability — Partial Refund Reservation Stuck-Committing Recovery V1.
 * Admin-only committing → failed in-flight lock release.
 */

export const PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID =
  "commerce.payments.partial_refund_reservation_stuck_committing_recovery_v1" as const;

export const PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION =
  "commerce-partial-refund-reservation-stuck-committing-recovery-v1" as const;

export type PartialRefundStuckCommittingRecoveryOwnership = {
  ownsAdminStuckCommittingRecovery: true;
  ownsCommittingToFailedTransition: true;
  ownsInFlightLockRelease: true;
  ownsRecoveryAuditResult: true;
  ownsCommittedReservationCancellation: false;
  ownsCommittedReservationCompensation: false;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsSellerRecovery: false;
  ownsBuyerPublicRecovery: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPayoutInteraction: false;
  ownsCommerceConfirmActivation: false;
  note: string;
};

export function partialRefundStuckCommittingRecoveryOwnership(): PartialRefundStuckCommittingRecoveryOwnership {
  return {
    ownsAdminStuckCommittingRecovery: true,
    ownsCommittingToFailedTransition: true,
    ownsInFlightLockRelease: true,
    ownsRecoveryAuditResult: true,
    ownsCommittedReservationCancellation: false,
    ownsCommittedReservationCompensation: false,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsSellerRecovery: false,
    ownsBuyerPublicRecovery: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPayoutInteraction: false,
    ownsCommerceConfirmActivation: false,
    note:
      `${PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_ID}@${PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_VERSION}: ` +
      "Admin-only committing→failed in-flight lock release. " +
      "Not compensation, not money refund, not committed cancel.",
  };
}
