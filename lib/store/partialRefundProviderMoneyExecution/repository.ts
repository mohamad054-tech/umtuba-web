/**
 * Repository port for provider execution persistence.
 */

import type { PartialRefundProviderExecutionRecord } from "./types";

export type ClaimPartialRefundProviderExecutionInput = {
  storeId: string;
  ledgerId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  providerKind: "stripe";
  providerPaymentRef: string | null;
  trustedAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  operatorUserId?: string | null;
  operatorReasonSafe?: string | null;
  /** Ledger must be committed with matching amount/currency (enforced by repo). */
  ledgerStatus: "committed";
  ledgerRefundAmountMinor: number;
  ledgerCurrency: string;
};

export type UpdatePartialRefundProviderExecutionInput = {
  executionId: string;
  toStatus: PartialRefundProviderExecutionRecord["status"];
  /** Optional current status for fail-closed client-side transition guard. */
  fromStatus?: PartialRefundProviderExecutionRecord["status"];
  providerRefundId?: string | null;
  providerStatusSafe?: string | null;
  failureCode?: string | null;
  failureMessageSafe?: string | null;
  providerPaymentRef?: string | null;
  touchLookup?: boolean;
};

export type PartialRefundProviderExecutionRepository = {
  claim(
    input: ClaimPartialRefundProviderExecutionInput
  ): Promise<
    | { ok: true; execution: PartialRefundProviderExecutionRecord; replayed: boolean }
    | { ok: false; code: string; message: string }
  >;
  update(
    input: UpdatePartialRefundProviderExecutionInput
  ): Promise<
    | { ok: true; execution: PartialRefundProviderExecutionRecord }
    | { ok: false; code: string; message: string }
  >;
  getByLedger(
    ledgerId: string
  ): Promise<PartialRefundProviderExecutionRecord | null>;
  getByIdempotency(
    storeId: string,
    idempotencyKey: string
  ): Promise<PartialRefundProviderExecutionRecord | null>;
  getById?(
    executionId: string
  ): Promise<PartialRefundProviderExecutionRecord | null>;
  list?(input?: {
    storeId?: string | null;
    status?: string | null;
    limit?: number;
  }): Promise<
    | { ok: true; executions: PartialRefundProviderExecutionRecord[] }
    | { ok: false; code: string; message: string }
  >;
};
