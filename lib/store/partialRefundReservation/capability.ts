/**
 * Capability ownership — Partial Refund Reservation Actions & Wiring V1.
 */

export const PARTIAL_REFUND_RESERVATION_ACTIONS_ID =
  "commerce.payments.partial_refund_reservation_actions_wiring_v1" as const;

export const PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION =
  "commerce-partial-refund-reservation-actions-wiring-v1" as const;

export type PartialRefundReservationActionsOwnership = {
  ownsTrustedFactLoading: true;
  ownsAdminReservationAction: true;
  ownsSellerReservationRead: true;
  /** Seller initiation not proven by existing refund-ops policy (seller is read-only). */
  ownsSellerReservationRequest: false;
  ownsReservationStatusUi: true;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsFullOrderRefundExecution: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPartialRefundCompensation: false;
  ownsBuyerPublicExecution: false;
  note: string;
};

export function partialRefundReservationActionsOwnership(): PartialRefundReservationActionsOwnership {
  return {
    ownsTrustedFactLoading: true,
    ownsAdminReservationAction: true,
    ownsSellerReservationRead: true,
    ownsSellerReservationRequest: false,
    ownsReservationStatusUi: true,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsFullOrderRefundExecution: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPartialRefundCompensation: false,
    ownsBuyerPublicExecution: false,
    note:
      `${PARTIAL_REFUND_RESERVATION_ACTIONS_ID}@${PARTIAL_REFUND_RESERVATION_ACTIONS_VERSION}: ` +
      "Admin reservation request + seller/admin reservation read UI. " +
      "Durable ledger reservation only — never money/provider/restock/unwind.",
  };
}
