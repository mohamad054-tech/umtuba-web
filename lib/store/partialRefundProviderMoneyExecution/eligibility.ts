/**
 * First-time provider-money execute eligibility (UI + pre-submit classification).
 * Does not move money. Does not call provider.
 */

import type { PartialRefundProviderExecutionRecord } from "./types";
import {
  isRecoveryEligibleProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import { isStripePaymentIntentRef } from "./validate";

export type FirstTimeProviderMoneyEligibilityCode =
  | "eligible"
  | "gate_disabled"
  | "execution_mode_off"
  | "ledger_not_committed"
  | "already_succeeded"
  | "recovery_required"
  | "prior_failed_no_retry"
  | "missing_provider_payment_ref"
  | "zero_amount"
  | "unsupported_currency"
  | "unsupported_provider"
  | "missing_ownership";

export type FirstTimeProviderMoneyEligibility = {
  code: FirstTimeProviderMoneyEligibilityCode;
  eligibleToExecute: boolean;
  recoveryRequired: boolean;
  message: string;
};

export type FirstTimeProviderMoneyEligibilityInput = {
  ledgerStatus: string;
  refundAmountMinor: number;
  currency: string;
  storeId: string;
  expectedStoreId?: string | null;
  existingExecution: PartialRefundProviderExecutionRecord | null;
  trustedPaymentIntentId: string | null;
  /** Dual gate + execution mode already evaluated. */
  firstTimeSubmitAllowed: boolean;
  firstTimeSubmitBlockCode?: string | null;
  providerKind?: string | null;
  nowMs?: number;
  staleAfterMs?: number;
};

export function evaluateFirstTimeProviderMoneyExecuteEligibility(
  input: FirstTimeProviderMoneyEligibilityInput
): FirstTimeProviderMoneyEligibility {
  if (!input.firstTimeSubmitAllowed) {
    const code =
      input.firstTimeSubmitBlockCode === "execution_mode_off" ||
      input.firstTimeSubmitBlockCode === "execution_mode_invalid" ||
      input.firstTimeSubmitBlockCode?.startsWith("execution_mode_")
        ? "execution_mode_off"
        : "gate_disabled";
    return {
      code,
      eligibleToExecute: false,
      recoveryRequired: false,
      message:
        code === "execution_mode_off"
          ? "First-time execute disabled by execution-mode allowlist."
          : "First-time execute disabled by dual gate / Stripe readiness.",
    };
  }

  if (
    input.expectedStoreId != null &&
    input.expectedStoreId.trim() !== "" &&
    input.storeId !== input.expectedStoreId.trim()
  ) {
    return {
      code: "missing_ownership",
      eligibleToExecute: false,
      recoveryRequired: false,
      message: "Store ownership mismatch.",
    };
  }

  if (input.ledgerStatus !== "committed") {
    return {
      code: "ledger_not_committed",
      eligibleToExecute: false,
      recoveryRequired: false,
      message: "Ledger must be committed before provider money execute.",
    };
  }

  if (!Number.isInteger(input.refundAmountMinor) || input.refundAmountMinor <= 0) {
    return {
      code: "zero_amount",
      eligibleToExecute: false,
      recoveryRequired: false,
      message: "Refund amount must be a positive minor unit.",
    };
  }

  if (!/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) {
    return {
      code: "unsupported_currency",
      eligibleToExecute: false,
      recoveryRequired: false,
      message: "Unsupported currency.",
    };
  }

  if (
    input.providerKind != null &&
    input.providerKind.trim() !== "" &&
    input.providerKind !== "stripe"
  ) {
    return {
      code: "unsupported_provider",
      eligibleToExecute: false,
      recoveryRequired: false,
      message: "Only Stripe provider money execute is supported in V1.",
    };
  }

  const existing = input.existingExecution;
  if (existing) {
    if (existing.status === "succeeded") {
      return {
        code: "already_succeeded",
        eligibleToExecute: false,
        recoveryRequired: false,
        message: "Provider money already succeeded for this ledger.",
      };
    }
    if (existing.status === "uncertain" || existing.status === "executing") {
      const stale =
        existing.status === "executing"
          ? isRecoveryEligibleProviderExecution(
              existing,
              input.nowMs ?? Date.now(),
              input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS
            )
          : true;
      return {
        code: "recovery_required",
        eligibleToExecute: false,
        recoveryRequired: true,
        message: stale
          ? "Existing uncertain/executing execution requires recovery lookup (no submit)."
          : "Execution is in progress; do not submit again.",
      };
    }
    if (existing.status === "failed") {
      return {
        code: "prior_failed_no_retry",
        eligibleToExecute: false,
        recoveryRequired: false,
        message:
          "Prior provider execution failed; V1 does not allow first-time retry.",
      };
    }
    // planned — may proceed if PI resolvable
  }

  if (
    !input.trustedPaymentIntentId ||
    !isStripePaymentIntentRef(input.trustedPaymentIntentId)
  ) {
    return {
      code: "missing_provider_payment_ref",
      eligibleToExecute: false,
      recoveryRequired: false,
      message:
        "Trusted Stripe PaymentIntent reference is missing or unsupported.",
    };
  }

  return {
    code: "eligible",
    eligibleToExecute: true,
    recoveryRequired: false,
    message: "Eligible for first-time provider money execute when ACK confirmed.",
  };
}
