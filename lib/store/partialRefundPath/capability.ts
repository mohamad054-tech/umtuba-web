/**
 * Capability metadata for Partial Refund Path V1 foundation.
 * Keeps unsupported ownership fail-closed until proven commit models exist.
 */

import type { PartialRefundCapabilityOwnership } from "./types";
import { PARTIAL_REFUND_PATH_ID, PARTIAL_REFUND_PATH_VERSION } from "./types";

export function partialRefundPathCapabilityOwnership(): PartialRefundCapabilityOwnership {
  return {
    ownsPartialRefundCalculation: true,
    ownsPartialRefundCommit: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    note:
      `${PARTIAL_REFUND_PATH_ID}@${PARTIAL_REFUND_PATH_VERSION}: ` +
      "Pure calculation only. Full-order applyFullOrderRefund remains the only money commit path. " +
      "Partial Sync refund, restock, entitlement, settlement, and commission unwind are deferred " +
      "until durable prior-refund accounting and non-invented unwind semantics exist.",
  };
}
