/**
 * Build admin execute candidates from committed ledger + execution + PI facts.
 */

import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger";
import {
  evaluateFirstTimeProviderMoneyExecuteEligibility,
  type FirstTimeProviderMoneyEligibilityCode,
} from "./eligibility";
import { assertPartialRefundProviderMoneyExecutionGates } from "./orchestrator";
import type { PartialRefundProviderExecutionRecord } from "./types";

export type ProviderMoneyExecuteCandidateModel = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  refundAmountMinor: number;
  currency: string;
  ledgerStatus: string;
  eligibilityCode: FirstTimeProviderMoneyEligibilityCode;
  eligibleToExecute: boolean;
  recoveryRequired: boolean;
  eligibilityMessage: string;
  trustedPaymentIntentPresent: boolean;
};

export function buildProviderMoneyExecuteCandidate(input: {
  ledger: Pick<
    PartialRefundLedgerCommitRecord,
    | "ledgerId"
    | "storeId"
    | "orderId"
    | "paymentAttemptId"
    | "refundAmountMinor"
    | "currency"
    | "status"
  >;
  existingExecution: PartialRefundProviderExecutionRecord | null;
  trustedPaymentIntentId: string | null;
  env?: Record<string, string | undefined>;
  nowMs?: number;
}): ProviderMoneyExecuteCandidateModel {
  const gates = assertPartialRefundProviderMoneyExecutionGates(
    input.env ?? process.env
  );
  const eligibility = evaluateFirstTimeProviderMoneyExecuteEligibility({
    ledgerStatus: input.ledger.status,
    refundAmountMinor: input.ledger.refundAmountMinor,
    currency: input.ledger.currency,
    storeId: input.ledger.storeId,
    existingExecution: input.existingExecution,
    trustedPaymentIntentId: input.trustedPaymentIntentId,
    firstTimeSubmitAllowed: gates.ok,
    firstTimeSubmitBlockCode: gates.ok ? null : gates.code,
    providerKind: "stripe",
    nowMs: input.nowMs,
  });

  return {
    ledgerId: input.ledger.ledgerId,
    storeId: input.ledger.storeId,
    orderId: input.ledger.orderId,
    paymentAttemptId: input.ledger.paymentAttemptId,
    refundAmountMinor: input.ledger.refundAmountMinor,
    currency: input.ledger.currency,
    ledgerStatus: input.ledger.status,
    eligibilityCode: eligibility.code,
    eligibleToExecute: eligibility.eligibleToExecute,
    recoveryRequired: eligibility.recoveryRequired,
    eligibilityMessage: eligibility.message,
    trustedPaymentIntentPresent: Boolean(input.trustedPaymentIntentId),
  };
}
