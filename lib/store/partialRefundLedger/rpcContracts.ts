/**
 * Privileged RPC contracts for Partial Refund Ledger — readiness only.
 * Not publicly exposed. Money / provider execution remains unsupported.
 */

export const PARTIAL_REFUND_RPC_READINESS_ID =
  "commerce.payments.partial_refund_ledger_rpc_remote_apply_readiness_v1" as const;

export const PARTIAL_REFUND_RPC_READINESS_VERSION =
  "commerce-partial-refund-rpc-remote-apply-readiness-v1" as const;

/** Local draft migration that must follow 20260899 on remote apply (separate GO). */
export const PARTIAL_REFUND_LEDGER_RPC_MIGRATION_VERSION = "20260900" as const;

export const PARTIAL_REFUND_LEDGER_RPC_MIGRATION_FILE =
  "20260900_store_partial_refund_ledger_rpc_v1.sql" as const;

/**
 * Privileged ledger RPCs (service_role execute only; SECURITY DEFINER).
 * Reservation accounting only — never Stripe/Sync/provider refund.
 */
export const PARTIAL_REFUND_LEDGER_RPCS = {
  ensureCaptureAccounting: "ensure_store_partial_refund_capture_accounting",
  plan: "plan_store_partial_refund_ledger",
  begin: "begin_store_partial_refund_ledger_commit",
  complete: "complete_store_partial_refund_ledger_commit",
  fail: "fail_store_partial_refund_ledger_commit",
  getCaptureAccounting: "get_store_partial_refund_capture_accounting",
  getCommit: "get_store_partial_refund_ledger_commit",
  listCommitted: "list_store_partial_refund_ledger_committed",
} as const;

export type PartialRefundLedgerRpcName =
  (typeof PARTIAL_REFUND_LEDGER_RPCS)[keyof typeof PARTIAL_REFUND_LEDGER_RPCS];

export const PARTIAL_REFUND_LEDGER_RPC_NAME_LIST: readonly PartialRefundLedgerRpcName[] =
  Object.values(PARTIAL_REFUND_LEDGER_RPCS);

export type PartialRefundRpcReadinessOwnership = {
  ownsPartialRefundLedgerRpcContracts: true;
  ownsPartialRefundLedgerRpcSqlDraft: true;
  /** Remote apply of 20260899 (+ 20260900) requires a separate explicit GO. */
  ownsPartialRefundRemoteMigrationApply: false;
  ownsPartialRefundMoneyExecution: false;
  ownsPartialRefundProviderRefund: false;
  ownsPartialRefundRestock: false;
  ownsPartialEntitlementAdjustment: false;
  ownsPartialSettlementUnwind: false;
  ownsPartialCommissionUnwind: false;
  /** Must not grant execute to anon/authenticated. */
  publicRpcExposure: false;
  note: string;
};

export function partialRefundRpcReadinessOwnership(): PartialRefundRpcReadinessOwnership {
  return {
    ownsPartialRefundLedgerRpcContracts: true,
    ownsPartialRefundLedgerRpcSqlDraft: true,
    ownsPartialRefundRemoteMigrationApply: false,
    ownsPartialRefundMoneyExecution: false,
    ownsPartialRefundProviderRefund: false,
    ownsPartialRefundRestock: false,
    ownsPartialEntitlementAdjustment: false,
    ownsPartialSettlementUnwind: false,
    ownsPartialCommissionUnwind: false,
    publicRpcExposure: false,
    note:
      `${PARTIAL_REFUND_RPC_READINESS_ID}@${PARTIAL_REFUND_RPC_READINESS_VERSION}: ` +
      "Privileged ledger RPC contracts + local SQL draft only. " +
      "Apply order: 20260899 then 20260900. service_role execute only. " +
      "No public exposure. No money/provider execution.",
  };
}

/** Trusted server args for plan RPC — amounts already computed server-side. */
export type PlanStorePartialRefundLedgerRpcArgs = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  currency: string;
  captureAmountMinor: number;
  refundAmountMinor: number;
  calculationFingerprint: string;
  idempotencyKey: string;
  expectedAccountingVersion: number;
  /** JSON array of { order_item_id, requested_quantity, refund_amount_minor }. */
  lines: readonly {
    orderItemId: string;
    requestedQuantity: number;
    refundAmountMinor: number;
  }[];
};

export type BeginStorePartialRefundLedgerRpcArgs = {
  ledgerId: string;
  /** Trusted purchased qty map: order_item_id → purchased_quantity. */
  purchasedQuantityByLineId: Readonly<Record<string, number>>;
};

export type FailStorePartialRefundLedgerRpcArgs = {
  ledgerId: string;
  failureCode: string;
  failureMessageSafe: string;
};

export type PartialRefundLedgerRpcPort = {
  ensureCaptureAccounting(args: {
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    currency: string;
    captureAmountMinor: number;
  }): Promise<unknown>;
  plan(args: PlanStorePartialRefundLedgerRpcArgs): Promise<unknown>;
  begin(args: BeginStorePartialRefundLedgerRpcArgs): Promise<unknown>;
  complete(ledgerId: string): Promise<unknown>;
  fail(args: FailStorePartialRefundLedgerRpcArgs): Promise<unknown>;
  getCaptureAccounting(captureEventId: string): Promise<unknown>;
  getCommit(ledgerId: string): Promise<unknown>;
  listCommitted(captureEventId: string): Promise<unknown>;
};
