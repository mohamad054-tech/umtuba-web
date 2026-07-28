/**
 * Commerce Trading Domain Alignment & Integrity V1
 *
 * Canonical map (read this before adding money helpers):
 *   Catalog Offer (active product_prices)
 *     → Cart line snapshot (server unit_price_minor_snapshot)
 *     → Checkout Quote (create_store_checkout_quote RPC)
 *     → Order / order_item money snapshots (confirm_store_checkout_quote)
 *     → Payment state (orders.payment_status + payment_attempts)
 *
 * Dashboard / UI presentation MUST consume these layers — never invent totals.
 * Gross order value ≠ revenue ≠ profit ≠ settlement.
 */

import { formatMinorUnits, normalizeCurrencyCode } from "./money";
import { computeStoreCheckoutGrandTotalMinor } from "./pricing";
import {
  isRealizedPaidOrder,
  isRefundedOrder,
  isUnpaidPendingOrder,
} from "./analyticsFinance";
import type { OrderStatus, PaymentStatus } from "./types";

/** Catalog Offer → display compare-at only when strictly greater than selling price. */
export function isLegitimateCompareAt(
  sellingPriceMinor: number | null | undefined,
  compareAtMinor: number | null | undefined
): boolean {
  return (
    typeof sellingPriceMinor === "number" &&
    Number.isFinite(sellingPriceMinor) &&
    typeof compareAtMinor === "number" &&
    Number.isFinite(compareAtMinor) &&
    compareAtMinor > sellingPriceMinor
  );
}

/**
 * Normalize compare-at for persistence/display.
 * Equal-to-price compare-at is treated as absent (not shown, not stored as a “deal”).
 */
export function normalizeCompareAtMinor(
  sellingPriceMinor: number,
  compareAtMinor: number | null | undefined
): number | null {
  if (
    compareAtMinor == null ||
    !Number.isFinite(compareAtMinor) ||
    !Number.isInteger(compareAtMinor)
  ) {
    return null;
  }
  return isLegitimateCompareAt(sellingPriceMinor, compareAtMinor)
    ? compareAtMinor
    : null;
}

/** Presentation helper — null/unknown money stays unavailable, never coerced to $0.00. */
export function formatTrustedMoney(
  amountMinor: number | null | undefined,
  currency: string | null | undefined
): string {
  if (
    amountMinor == null ||
    !Number.isFinite(amountMinor) ||
    !currency ||
    !normalizeCurrencyCode(currency)
  ) {
    return "Unavailable";
  }
  try {
    return formatMinorUnits(amountMinor, currency);
  } catch {
    return "Unavailable";
  }
}

/**
 * Order-header grand total for exclusive-tax order snapshots.
 * Delegates to pricing engine (taxInclusive: false) so checkout and order VO stay aligned.
 */
export function computeExclusiveTaxOrderGrandTotalMinor(input: {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
}): number {
  return computeStoreCheckoutGrandTotalMinor({
    ...input,
    taxInclusive: false,
  });
}

export type TradingPaymentClassification = {
  realizedPaid: boolean;
  unpaidPendingOrAuthorized: boolean;
  refunded: boolean;
  /** Ship/deliver blocked while payment is pending or failed (authorized may proceed). */
  blocksFulfillmentProgress: boolean;
  /** Buyer may cancel unpaid pending (not authorized/paid). */
  buyerCancellableUnpaid: boolean;
};

/**
 * Single payment-state matrix for Trading consumers.
 * Finance unpaid includes `authorized`; fulfillment may still advance on `authorized`.
 */
export function classifyTradingPaymentState(input: {
  paymentStatus: PaymentStatus | string;
  status: OrderStatus | string;
}): TradingPaymentClassification {
  const paymentStatus = String(input.paymentStatus);
  const status = String(input.status);
  const refunded = isRefundedOrder({ paymentStatus, status });
  const realizedPaid = isRealizedPaidOrder({ paymentStatus, status });
  const unpaidPendingOrAuthorized = isUnpaidPendingOrder({
    paymentStatus,
    status,
  });
  const blocksFulfillmentProgress =
    !refunded &&
    status !== "cancelled" &&
    (paymentStatus === "pending" ||
      paymentStatus === "failed" ||
      !["pending", "authorized", "paid", "refunded", "cancelled"].includes(
        paymentStatus
      ));
  const buyerCancellableUnpaid =
    paymentStatus === "pending" &&
    status !== "cancelled" &&
    status !== "refunded" &&
    status !== "delivered" &&
    status !== "shipped";

  return {
    realizedPaid,
    unpaidPendingOrAuthorized,
    refunded,
    blocksFulfillmentProgress,
    buyerCancellableUnpaid,
  };
}

/** Form / request keys that must never authoritatively set money. */
export const CLIENT_MONEY_FIELD_KEYS = [
  "subtotal_minor",
  "grand_total_minor",
  "tax_total_minor",
  "shipping_total_minor",
  "discount_total_minor",
  "unit_price_minor",
  "amount_minor",
  "client_price_minor",
  "clientPriceMinor",
] as const;

/** Client must never authoritatively set cart/checkout money. */
export function clientSuppliedMoneyFieldPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

export function rejectClientMoneyFormFields(
  hasKey: (key: string) => boolean
): { ok: true } | { ok: false; message: string } {
  for (const key of CLIENT_MONEY_FIELD_KEYS) {
    if (hasKey(key)) {
      return {
        ok: false,
        message: "Client must not supply money fields.",
      };
    }
  }
  return { ok: true };
}

export function rejectClientCartPrice(
  clientPriceMinor: unknown
): { ok: true } | { ok: false; message: string } {
  if (clientSuppliedMoneyFieldPresent(clientPriceMinor)) {
    return {
      ok: false,
      message:
        "Client price snapshots are rejected. The server loads the active catalog price.",
    };
  }
  return { ok: true };
}

/**
 * Aggregate trusted quote group money for display only.
 * Missing fields are tracked — never silently treated as paid-ready zeros for unknown keys.
 */
export function aggregateTrustedQuoteGroupTotals(
  groups: Array<Record<string, unknown>>
): {
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  grandMinor: number;
  subtotalMinor: number;
  complete: boolean;
  currencies: string[];
  mixedCurrency: boolean;
} {
  let discountMinor = 0;
  let shippingMinor = 0;
  let taxMinor = 0;
  let grandMinor = 0;
  let subtotalMinor = 0;
  let complete = groups.length > 0;
  const currencies = new Set<string>();

  for (const g of groups) {
    const currency =
      typeof g.currency === "string" ? normalizeCurrencyCode(g.currency) : null;
    if (currency) currencies.add(currency);

    const read = (key: string): number | null => {
      const v = g[key];
      if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v)) {
        return v;
      }
      if (typeof v === "string" && /^-?\d+$/.test(v.trim())) {
        return Number(v.trim());
      }
      return null;
    };

    const discount = read("discount_total_minor");
    const shipping = read("shipping_total_minor");
    const tax = read("tax_total_minor");
    const grand = read("grand_total_minor");
    const subtotal = read("subtotal_minor");
    if (
      discount == null ||
      shipping == null ||
      tax == null ||
      grand == null ||
      subtotal == null
    ) {
      complete = false;
    }
    discountMinor += discount ?? 0;
    shippingMinor += shipping ?? 0;
    taxMinor += tax ?? 0;
    grandMinor += grand ?? 0;
    subtotalMinor += subtotal ?? 0;
  }

  const mixedCurrency = currencies.size > 1;
  if (mixedCurrency) {
    complete = false;
    return {
      discountMinor: 0,
      shippingMinor: 0,
      taxMinor: 0,
      grandMinor: 0,
      subtotalMinor: 0,
      complete: false,
      currencies: [...currencies],
      mixedCurrency: true,
    };
  }

  return {
    discountMinor,
    shippingMinor,
    taxMinor,
    grandMinor,
    subtotalMinor,
    complete,
    currencies: [...currencies],
    mixedCurrency,
  };
}

export const TRADING_PATH_SUMMARY = [
  "Catalog Offer: active product_prices (amount_minor, compare_at when legitimate)",
  "Cart Snapshot: cart_items.unit_price_minor_snapshot + currency (server only)",
  "Checkout Quote: create_store_checkout_quote (TTL 15m; recreate to refresh)",
  "Order Snapshot: confirm_store_checkout_quote freezes order/order_item money",
  "Payment State: orders.payment_status (existence ≠ paid)",
] as const;
