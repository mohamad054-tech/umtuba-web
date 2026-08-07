/**
 * Capability — Partial Refund Committed Reservation Compensation V1.
 * Accounting-only committed → compensated ceiling restore.
 */

export const PARTIAL_REFUND_COMMITTED_COMPENSATION_ID =
  "commerce.payments.partial_refund_committed_reservation_compensation_v1" as const;

export const PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION =
  "commerce-partial-refund-committed-reservation-compensation-v1" as const;

export type PartialRefundCommittedCompensationOwnership = {
  ownsCommittedReservationCompensation: true;
  ownsCommittedToCompensatedTransition: true;
  ownsAccountingCeilingRestore: true;
  ownsCompensationAuditResult: true;
  ownsAdminCompensationAction: true;
  ownsAdminCompensationUi: true;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsSellerCompensationUi: false;
  ownsBuyerPublicCompensation: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPayoutInteraction: false;
  ownsCommerceConfirmActivation: false;
  ownsCommittedCancellation: false;
  note: string;
};

export function partialRefundCommittedCompensationOwnership(): PartialRefundCommittedCompensationOwnership {
  return {
    ownsCommittedReservationCompensation: true,
    ownsCommittedToCompensatedTransition: true,
    ownsAccountingCeilingRestore: true,
    ownsCompensationAuditResult: true,
    ownsAdminCompensationAction: true,
    ownsAdminCompensationUi: true,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsSellerCompensationUi: false,
    ownsBuyerPublicCompensation: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPayoutInteraction: false,
    ownsCommerceConfirmActivation: false,
    ownsCommittedCancellation: false,
    note:
      `${PARTIAL_REFUND_COMMITTED_COMPENSATION_ID}@${PARTIAL_REFUND_COMMITTED_COMPENSATION_VERSION}: ` +
      "Accounting-only committed→compensated ceiling restore + admin action/UI. " +
      "Not money refund, provider call, restock, entitlement, settlement, or seller/buyer access.",
  };
}
