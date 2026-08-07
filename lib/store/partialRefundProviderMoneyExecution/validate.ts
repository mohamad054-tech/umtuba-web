/**
 * Pure validation helpers for provider money execution.
 */

import { partialRefundProviderMoneyOwnership } from "./capability";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
  type PartialRefundProviderMoneyFailureCode,
  type PartialRefundProviderMoneyResult,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLIENT_MONEY_KEYS = [
  "amountMinor",
  "amount_minor",
  "trustedAmountMinor",
  "refundAmountMinor",
  "currency",
  "clientAmountMinor",
] as const;

export function isProviderMoneyUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function failProviderMoney<T>(
  code: PartialRefundProviderMoneyFailureCode | string,
  message: string
): PartialRefundProviderMoneyResult<T> {
  return {
    ok: false,
    capability: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
    version: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
    ownership: partialRefundProviderMoneyOwnership(),
    code,
    message,
  };
}

export function okProviderMoney<T>(
  value: T
): PartialRefundProviderMoneyResult<T> {
  return {
    ok: true,
    capability: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
    version: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
    ownership: partialRefundProviderMoneyOwnership(),
    value,
  };
}

export function normalizeCurrency(currency: string): string | null {
  const c = currency.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : null;
}

export function assertPositiveMinorAmount(
  amountMinor: number
): { ok: true } | { ok: false; message: string } {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return {
      ok: false,
      message: "Amount must be a positive integer minor unit.",
    };
  }
  return { ok: true };
}

export function rejectClientProviderMoneyFields(
  bag: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of CLIENT_MONEY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(bag, key)) {
      // trustedAmountMinor / currency may be passed only by server orchestrator
      // from ledger facts — reject when bag is labeled as client intent.
      if (key === "trustedAmountMinor" || key === "currency") {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply monetary provider-refund fields.",
      };
    }
  }
  for (const key of Object.keys(bag)) {
    if (
      key === "amountMinor" ||
      key === "amount_minor" ||
      key === "clientAmountMinor" ||
      key === "refundAmountMinor"
    ) {
      return {
        ok: false,
        message:
          "Client must not supply monetary provider-refund fields.",
      };
    }
  }
  return { ok: true };
}

/** Stripe PaymentIntent id shape (pi_…). */
export function isStripePaymentIntentRef(value: string): boolean {
  const t = value.trim();
  return /^pi_[A-Za-z0-9]+$/.test(t) && t.length <= 128;
}
