/**
 * Capability ownership — Partial Refund Reservation Accounting Audit & Review V1.
 * Read-only capture accounting + committed reservation review.
 */

export const PARTIAL_REFUND_ACCOUNTING_AUDIT_ID =
  "commerce.payments.partial_refund_reservation_accounting_audit_review_v1" as const;

export const PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION =
  "commerce-partial-refund-reservation-accounting-audit-review-v1" as const;

export type PartialRefundAccountingAuditOwnership = {
  ownsCaptureAccountingRead: true;
  ownsCommittedReservationRead: true;
  ownsAdminAccountingReviewUi: true;
  ownsSellerAccountingReviewRead: true;
  ownsCommitDetailRead: true;
  ownsReservationCreateInThisMilestone: false;
  ownsReservationCancel: false;
  ownsReservationCompensation: false;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsSellerReservationRequest: false;
  ownsBuyerPublicRead: false;
  ownsBuyerPublicExecution: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPayoutInteraction: false;
  ownsCommerceConfirmActivation: false;
  note: string;
};

export function partialRefundAccountingAuditOwnership(): PartialRefundAccountingAuditOwnership {
  return {
    ownsCaptureAccountingRead: true,
    ownsCommittedReservationRead: true,
    ownsAdminAccountingReviewUi: true,
    ownsSellerAccountingReviewRead: true,
    ownsCommitDetailRead: true,
    ownsReservationCreateInThisMilestone: false,
    ownsReservationCancel: false,
    ownsReservationCompensation: false,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsSellerReservationRequest: false,
    ownsBuyerPublicRead: false,
    ownsBuyerPublicExecution: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPayoutInteraction: false,
    ownsCommerceConfirmActivation: false,
    note:
      `${PARTIAL_REFUND_ACCOUNTING_AUDIT_ID}@${PARTIAL_REFUND_ACCOUNTING_AUDIT_VERSION}: ` +
      "Read-only capture accounting + committed reservation review. " +
      "Never create/cancel/compensate/money/provider.",
  };
}
