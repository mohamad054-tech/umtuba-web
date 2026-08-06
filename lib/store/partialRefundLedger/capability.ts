import type { PartialRefundLedgerCapabilityOwnership } from "./types";
import {
  PARTIAL_REFUND_LEDGER_ID,
  PARTIAL_REFUND_LEDGER_VERSION,
} from "./types";

export function partialRefundLedgerCapabilityOwnership(): PartialRefundLedgerCapabilityOwnership {
  return {
    ownsPartialRefundLedgerDomain: true,
    ownsPartialRefundCommitBoundary: true,
    ownsPartialRefundMoneyExecution: false,
    ownsPartialRefundProviderRefund: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    note:
      `${PARTIAL_REFUND_LEDGER_ID}@${PARTIAL_REFUND_LEDGER_VERSION}: ` +
      "Durable ledger reservation + commit boundary only. " +
      "Does not execute Stripe/Sync refunds, restock, entitlement revoke, " +
      "or settlement/commission unwind. Money execution requires a separate GO.",
  };
}
