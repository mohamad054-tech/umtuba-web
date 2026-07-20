/**
 * Payment abstraction — interfaces for future gateway integrations.
 * No live Stripe/PayPal/HyperPay/etc. calls in this foundation.
 */

export const PAYMENT_PROVIDERS = [
  "none",
  "stripe",
  "paypal",
  "apple_pay",
  "google_pay",
  "hyperpay",
  "paytabs",
  "tap",
  "paymob",
  "cash_on_delivery",
  "bank_transfer",
] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_METHOD_KINDS = [
  "deferred",
  "card",
  "wallet",
  "cash_on_delivery",
  "bank_transfer",
] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  "deferred",
  "pending",
  "authorized",
  "captured",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export type PaymentMoney = {
  amountMinor: number;
  currency: string;
};

export type CreatePaymentIntentInput = {
  orderId: string;
  buyerId: string;
  money: PaymentMoney;
  provider: PaymentProvider;
  methodKind: PaymentMethodKind;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  cancelUrl?: string;
};

export type PaymentIntentResult =
  | {
      ok: true;
      attemptId: string;
      status: PaymentAttemptStatus;
      /** Client secret / redirect URL when a real provider is wired. */
      clientAction?: {
        type: "redirect" | "client_secret" | "none";
        value?: string;
      };
      providerReference?: string | null;
    }
  | { ok: false; message: string };

export type CapturePaymentInput = {
  attemptId: string;
  providerReference?: string;
};

export type RefundPaymentInput = {
  attemptId: string;
  amountMinor?: number;
  reason?: string;
};

/**
 * Provider adapter contract. Implementations must never trust client money
 * fields — amount/currency come from the order row server-side.
 */
export interface PaymentProviderAdapter {
  readonly provider: PaymentProvider;
  createIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  capture?(input: CapturePaymentInput): Promise<PaymentIntentResult>;
  refund?(input: RefundPaymentInput): Promise<PaymentIntentResult>;
}

/** Placeholder adapter used until a real gateway is enabled. */
export class DeferredPaymentAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "none";

  async createIntent(
    input: CreatePaymentIntentInput
  ): Promise<PaymentIntentResult> {
    // Fail closed: this adapter never starts a live charge.
    if (input.provider !== "none" && input.provider !== this.provider) {
      return {
        ok: false,
        message: "Live payment providers are not enabled in this foundation.",
      };
    }
    if (!input.orderId || !input.buyerId) {
      return { ok: false, message: "Order and buyer are required." };
    }
    if (
      !Number.isInteger(input.money.amountMinor) ||
      input.money.amountMinor < 0
    ) {
      return { ok: false, message: "Invalid payment amount." };
    }
    if (!/^[A-Z]{3}$/.test(input.money.currency.toUpperCase())) {
      return { ok: false, message: "Invalid currency." };
    }
    if (input.idempotencyKey.trim().length < 8) {
      return { ok: false, message: "Idempotency key is required." };
    }
    return {
      ok: true,
      attemptId: "deferred-local",
      status: "deferred",
      clientAction: { type: "none" },
      providerReference: null,
    };
  }
}

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return (
    typeof value === "string" &&
    (PAYMENT_PROVIDERS as readonly string[]).includes(value)
  );
}

export function isPaymentAttemptStatus(
  value: unknown
): value is PaymentAttemptStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_ATTEMPT_STATUSES as readonly string[]).includes(value)
  );
}

/** UI catalog for the checkout payment placeholder (all disabled except deferred). */
export const CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS: ReadonlyArray<{
  provider: PaymentProvider;
  label: string;
  enabled: boolean;
}> = [
  { provider: "none", label: "Record order without charging (deferred)", enabled: true },
  { provider: "stripe", label: "Stripe", enabled: false },
  { provider: "paypal", label: "PayPal", enabled: false },
  { provider: "apple_pay", label: "Apple Pay", enabled: false },
  { provider: "google_pay", label: "Google Pay", enabled: false },
  { provider: "hyperpay", label: "HyperPay", enabled: false },
  { provider: "paytabs", label: "PayTabs", enabled: false },
  { provider: "tap", label: "Tap Payments", enabled: false },
  { provider: "paymob", label: "Paymob", enabled: false },
  { provider: "cash_on_delivery", label: "Cash on Delivery", enabled: false },
  { provider: "bank_transfer", label: "Bank Transfer", enabled: false },
];

export function mapPaymentRpcError(message: string | undefined): string {
  const raw = (message || "").toLowerCase();
  if (raw.includes("authentication")) return "Please sign in.";
  if (raw.includes("not found")) return "Order not found.";
  if (raw.includes("not authorized")) return "You cannot pay for this order.";
  if (raw.includes("already")) return "A payment attempt already exists.";
  return message?.trim() || "Payment request failed.";
}
