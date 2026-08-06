/**
 * Capability — Partial Refund In-Flight Committing Visibility V1.
 * Admin-only read-only discovery of committing ledger rows.
 */

export const PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID =
  "commerce.payments.partial_refund_in_flight_committing_visibility_v1" as const;

export const PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION =
  "commerce-partial-refund-in-flight-committing-visibility-v1" as const;

export type PartialRefundInFlightCommittingVisibilityOwnership = {
  ownsAdminInFlightCommittingVisibility: true;
  ownsReadOnlyCommittingDiscovery: true;
  ownsStoreScopedVisibility: true;
  ownsCaptureScopedVisibility: true;
  ownsVisibilityAuditResult: true;
  ownsRecoveryExecution: false;
  ownsStateTransition: false;
  ownsCommittingLockRelease: false;
  ownsCommittedCancellation: false;
  ownsCompensation: false;
  ownsPartialRefundProviderRefundExecution: false;
  ownsPartialRefundMoneyMovement: false;
  ownsSellerVisibility: false;
  ownsBuyerPublicVisibility: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPayoutInteraction: false;
  ownsCommerceConfirmActivation: false;
  note: string;
};

export function partialRefundInFlightCommittingVisibilityOwnership(): PartialRefundInFlightCommittingVisibilityOwnership {
  return {
    ownsAdminInFlightCommittingVisibility: true,
    ownsReadOnlyCommittingDiscovery: true,
    ownsStoreScopedVisibility: true,
    ownsCaptureScopedVisibility: true,
    ownsVisibilityAuditResult: true,
    ownsRecoveryExecution: false,
    ownsStateTransition: false,
    ownsCommittingLockRelease: false,
    ownsCommittedCancellation: false,
    ownsCompensation: false,
    ownsPartialRefundProviderRefundExecution: false,
    ownsPartialRefundMoneyMovement: false,
    ownsSellerVisibility: false,
    ownsBuyerPublicVisibility: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPayoutInteraction: false,
    ownsCommerceConfirmActivation: false,
    note:
      `${PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_ID}@${PARTIAL_REFUND_IN_FLIGHT_COMMITTING_VISIBILITY_VERSION}: ` +
      "Admin read-only committing discovery via privileged list RPC. " +
      "Not recovery, not lock release, not money/provider.",
  };
}
