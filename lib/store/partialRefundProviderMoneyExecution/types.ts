/**
 * Types — Partial Refund Provider Money Execution V1.
 */

import type { PartialRefundProviderMoneyOwnership } from "./capability";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
} from "./capability";

export {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
};

export const PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES = [
  "planned",
  "executing",
  "succeeded",
  "failed",
  "uncertain",
] as const;

export type PartialRefundProviderExecutionStatus =
  (typeof PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES)[number];

export const PARTIAL_REFUND_PROVIDER_KINDS = ["stripe"] as const;
export type PartialRefundProviderKind =
  (typeof PARTIAL_REFUND_PROVIDER_KINDS)[number];

export type PartialRefundProviderExecutionRecord = {
  executionId: string;
  storeId: string;
  ledgerId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  providerKind: PartialRefundProviderKind;
  providerPaymentRef: string | null;
  trustedAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  status: PartialRefundProviderExecutionStatus;
  providerRefundId: string | null;
  providerStatusSafe: string | null;
  failureCode: string | null;
  failureMessageSafe: string | null;
  operatorUserId: string | null;
  operatorReasonSafe: string | null;
  startedAtIso: string | null;
  completedAtIso: string | null;
  lastLookupAtIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type PartialRefundProviderMoneyFailureCode =
  | "gate_disabled"
  | "stripe_config_unavailable"
  | "malformed_id"
  | "malformed_idempotency_key"
  | "invalid_state"
  | "missing_ownership"
  | "currency_mismatch"
  | "amount_mismatch"
  | "zero_amount"
  | "missing_provider_payment_ref"
  | "provider_not_allowed"
  | "duplicate_idempotency_key"
  | "uncertain_requires_recovery"
  | "unsupported_transition"
  | "unknown_execution"
  | "unknown_refund"
  | "provider_rejected"
  | "client_money_rejected"
  | "unauthorized"
  | "rpc_failed";

export type PartialRefundProviderMoneyResult<T> =
  | {
      ok: true;
      capability: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID;
      version: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION;
      ownership: PartialRefundProviderMoneyOwnership;
      value: T;
    }
  | {
      ok: false;
      capability: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID;
      version: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION;
      ownership: PartialRefundProviderMoneyOwnership;
      code: PartialRefundProviderMoneyFailureCode | string;
      message: string;
    };

/** Explicit non-events — provider money never implies these side effects. */
export type PartialRefundProviderMoneyNonEvents = {
  ledgerCompensated: false;
  stockRestocked: false;
  entitlementAdjusted: false;
  settlementUnwound: false;
  commissionUnwound: false;
  payoutReversed: false;
  syncPartialRefundApplied: false;
  commerceConfirmTouched: false;
};

export const PROVIDER_MONEY_NON_EVENTS: PartialRefundProviderMoneyNonEvents = {
  ledgerCompensated: false,
  stockRestocked: false,
  entitlementAdjusted: false,
  settlementUnwound: false,
  commissionUnwound: false,
  payoutReversed: false,
  syncPartialRefundApplied: false,
  commerceConfirmTouched: false,
};
