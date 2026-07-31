import type { RefundOpsSafeError } from "./types";

export type RefundOpsEligibilityInput = {
  storeId: string;
  orderStoreId: string;
  orderPaymentStatus: string;
  orderStatus: string;
  attemptStatus: string | null;
  hasCaptureOutcome: boolean;
  hasRefundOutcome: boolean;
  payoutState?: string | null;
};

export type RefundOpsEligibility = {
  eligible: boolean;
  reasons: string[];
  blockers: string[];
};

export function evaluateRefundOpsEligibility(
  input: RefundOpsEligibilityInput
): RefundOpsEligibility {
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (input.orderStoreId !== input.storeId) {
    blockers.push("unauthorized_store");
  }
  if (input.hasRefundOutcome || input.orderPaymentStatus === "refunded") {
    blockers.push("already_refunded");
  }
  if (input.orderStatus === "refunded") {
    blockers.push("already_refunded");
  }
  if (input.orderPaymentStatus !== "paid") {
    blockers.push("not_refundable");
  }
  if (input.attemptStatus !== "captured") {
    blockers.push("not_refundable");
  }
  if (!input.hasCaptureOutcome) {
    blockers.push("missing_capture");
  }
  if (input.payoutState === "IN_TRANSIT") {
    blockers.push("payout_in_transit");
  }
  if (input.payoutState === "COMPLETED") {
    blockers.push("payout_completed");
  }

  if (blockers.length === 0) {
    reasons.push("paid_captured_full_order");
  }

  return {
    eligible: blockers.length === 0,
    reasons,
    blockers,
  };
}

export function rejectClientRefundMoneyFields(
  input: Record<string, unknown>
): { ok: true } | RefundOpsSafeError {
  for (const key of Object.keys(input)) {
    if (
      key === "amountMinor" ||
      key === "amount_minor" ||
      key === "trustedAmountMinor" ||
      key === "trusted_amount_minor" ||
      /^(amount|total|balance|commission|net_|gross_|fee)/i.test(key) ||
      /_minor$/i.test(key)
    ) {
      if (
        key === "storeId" ||
        key === "store_id" ||
        key === "orderId" ||
        key === "order_id" ||
        key === "paymentAttemptId" ||
        key === "payment_attempt_id" ||
        key === "idempotencyKey" ||
        key === "executionIdempotencyKey"
      ) {
        continue;
      }
      return {
        code: "client_money_rejected",
        message:
          "Client must not supply money fields to refund operations.",
      };
    }
  }
  return { ok: true };
}
