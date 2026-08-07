/**
 * Capability — Partial Refund Provider Money Execution V1.
 * Owns gated provider refund execution against committed ledger reservations.
 * Does NOT own Sync partial, restock, entitlement, settlement, commission, payout.
 */

export const PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID =
  "commerce.payments.partial_refund_provider_money_execution_v1" as const;

export const PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION =
  "commerce-partial-refund-provider-money-execution-v1" as const;

export type PartialRefundProviderMoneyOwnership = {
  ownsPartialRefundProviderRefundExecution: true;
  ownsPartialRefundProviderMoneyGate: true;
  ownsPartialRefundProviderExecutionPersistence: true;
  ownsPartialRefundProviderOrchestration: true;
  ownsLedgerCommittedMeaning: false;
  ownsAutomaticCompensationOnUncertain: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  ownsPayoutInteraction: false;
  ownsSyncPartialRefundOutcome: false;
  ownsCommerceConfirmActivation: false;
  note: string;
};

export function partialRefundProviderMoneyOwnership(): PartialRefundProviderMoneyOwnership {
  return {
    ownsPartialRefundProviderRefundExecution: true,
    ownsPartialRefundProviderMoneyGate: true,
    ownsPartialRefundProviderExecutionPersistence: true,
    ownsPartialRefundProviderOrchestration: true,
    ownsLedgerCommittedMeaning: false,
    ownsAutomaticCompensationOnUncertain: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    ownsPayoutInteraction: false,
    ownsSyncPartialRefundOutcome: false,
    ownsCommerceConfirmActivation: false,
    note:
      `${PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID}@${PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION}: ` +
      "Gated Stripe partial refund execution after committed ledger reservation. " +
      "Not Sync/restock/entitlement/settlement/commission/payout/commerce_confirm.",
  };
}
