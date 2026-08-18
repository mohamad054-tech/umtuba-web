import { SANDBOX_STORE_LISTINGS } from "./store";
import {
  MOCK_PAYMENT_ADAPTER,
  type PaymentOutcome,
  type SandboxOrder,
} from "./types";

export type { PaymentOutcome };

function listing(index: number) {
  return SANDBOX_STORE_LISTINGS[index]!;
}

export const SANDBOX_ORDERS: readonly SandboxOrder[] = [
  {
    id: "sandbox-ord-1001",
    productSlug: listing(0).product.slug,
    productTitle: listing(0).product.title,
    quantity: 1,
    amountMinor: listing(0).product.variants[0]?.priceMinor ?? 0,
    currency: "USD",
    status: "CAPTURED",
    paymentOutcome: "SUCCESS",
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    shippingLabel: "Sandbox standard · not a promise",
    customerName: "Demo Student 01",
  },
  {
    id: "sandbox-ord-1002",
    productSlug: listing(1).product.slug,
    productTitle: listing(1).product.title,
    quantity: 1,
    amountMinor: listing(1).product.variants[0]?.priceMinor ?? 0,
    currency: "USD",
    status: "FAILED",
    paymentOutcome: "DECLINED",
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    shippingLabel: "Sandbox standard · not a promise",
    customerName: "Demo Student 02",
  },
  {
    id: "sandbox-ord-1003",
    productSlug: listing(2).product.slug,
    productTitle: listing(2).product.title,
    quantity: 2,
    amountMinor: (listing(2).product.variants[0]?.priceMinor ?? 0) * 2,
    currency: "USD",
    status: "REFUNDED",
    paymentOutcome: "REFUNDED_DEMO",
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    shippingLabel: "Sandbox express · not a promise",
    customerName: "Demo Student 03",
  },
  {
    id: "sandbox-ord-1004",
    productSlug: listing(3).product.slug,
    productTitle: listing(3).product.title,
    quantity: 1,
    amountMinor: listing(3).product.variants[0]?.priceMinor ?? 0,
    currency: "USD",
    status: "PROCESSING",
    paymentOutcome: "PROCESSING",
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    shippingLabel: "Sandbox standard · not a promise",
    customerName: "Demo Student 04",
  },
  {
    id: "sandbox-ord-1005",
    productSlug: listing(4).product.slug,
    productTitle: listing(4).product.title,
    quantity: 1,
    amountMinor: listing(4).product.variants[0]?.priceMinor ?? 0,
    currency: "USD",
    status: "CANCELLED",
    paymentOutcome: "CANCELLED",
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    shippingLabel: "Sandbox standard · not a promise",
    customerName: "Demo Student 05",
  },
];

export const SANDBOX_PAYMENT_FLOWS: readonly {
  id: string;
  outcome: PaymentOutcome;
  orderId: string;
  label: string;
}[] = [
  { id: "flow-success", outcome: "SUCCESS", orderId: "sandbox-ord-1001", label: "Payment success (mock)" },
  { id: "flow-declined", outcome: "DECLINED", orderId: "sandbox-ord-1002", label: "Payment declined (mock)" },
  { id: "flow-refund", outcome: "REFUNDED_DEMO", orderId: "sandbox-ord-1003", label: "Refund demo (mock)" },
  { id: "flow-processing", outcome: "PROCESSING", orderId: "sandbox-ord-1004", label: "Payment processing (mock)" },
  { id: "flow-cancelled", outcome: "CANCELLED", orderId: "sandbox-ord-1005", label: "Payment cancelled (mock)" },
];

export { MOCK_PAYMENT_ADAPTER };

export function simulateSandboxPayment(
  outcome: PaymentOutcome
): {
  paymentMode: "SANDBOX";
  realPayment: false;
  realProviderCall: false;
  storesCardNumbers: false;
  outcome: PaymentOutcome;
  adapter: typeof MOCK_PAYMENT_ADAPTER;
} {
  return {
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    storesCardNumbers: false,
    outcome,
    adapter: MOCK_PAYMENT_ADAPTER,
  };
}
