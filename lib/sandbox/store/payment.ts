import type { PaymentOutcome } from "../fixtures/types";
import { MOCK_PAYMENT_ADAPTER } from "../fixtures/types";

export const CHECKOUT_PAYMENT_OUTCOMES = [
  "SUCCESS",
  "DECLINED",
  "PROCESSING",
  "CANCELLED",
] as const;

export const AFTER_SALE_PAYMENT_OUTCOMES = ["REFUND_PENDING", "REFUNDED_DEMO"] as const;

export const ALL_MOCK_PAYMENT_OUTCOMES = [
  ...CHECKOUT_PAYMENT_OUTCOMES,
  ...AFTER_SALE_PAYMENT_OUTCOMES,
] as const;

export type CheckoutPaymentOutcome = (typeof CHECKOUT_PAYMENT_OUTCOMES)[number];
export type AfterSalePaymentOutcome = (typeof AFTER_SALE_PAYMENT_OUTCOMES)[number];

export type MockPaymentResult = {
  outcome: PaymentOutcome;
  paymentMode: "SANDBOX";
  realPayment: false;
  realProviderCall: false;
  realChargePossible: false;
  storesCardNumbers: false;
  adapterId: typeof MOCK_PAYMENT_ADAPTER.id;
};

export function runSandboxMockPayment(outcome: PaymentOutcome): MockPaymentResult {
  return {
    outcome,
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    realChargePossible: false,
    storesCardNumbers: false,
    adapterId: MOCK_PAYMENT_ADAPTER.id,
  };
}

export function checkoutCreatesOrder(outcome: CheckoutPaymentOutcome): boolean {
  return outcome === "SUCCESS" || outcome === "PROCESSING";
}
