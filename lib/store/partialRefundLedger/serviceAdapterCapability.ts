/**
 * Capability ownership for Partial Refund Ledger Service-Role Adapter
 * & Reservation Orchestration V1.
 */

export const PARTIAL_REFUND_SERVICE_ADAPTER_ID =
  "commerce.payments.partial_refund_ledger_service_adapter_v1" as const;

export const PARTIAL_REFUND_SERVICE_ADAPTER_VERSION =
  "commerce-partial-refund-ledger-service-adapter-v1" as const;

export type PartialRefundServiceAdapterOwnership = {
  ownsPartialRefundLedgerRepository: true;
  ownsPartialRefundReservationOrchestration: true;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPartialRefundCompensation: false;
  /** Admin/seller/buyer execution UI wiring remains deferred. */
  ownsPublicOrAdminExecutionWiring: false;
  note: string;
};

export function partialRefundServiceAdapterOwnership(): PartialRefundServiceAdapterOwnership {
  return {
    ownsPartialRefundLedgerRepository: true,
    ownsPartialRefundReservationOrchestration: true,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPartialRefundCompensation: false,
    ownsPublicOrAdminExecutionWiring: false,
    note:
      `${PARTIAL_REFUND_SERVICE_ADAPTER_ID}@${PARTIAL_REFUND_SERVICE_ADAPTER_VERSION}: ` +
      "Service-role repository + reservation-only orchestration. " +
      "committed = durable reservation only. No provider refund, money movement, " +
      "restock, entitlement, settlement/commission unwind, or compensation.",
  };
}
