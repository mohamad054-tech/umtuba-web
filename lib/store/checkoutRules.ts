/**
 * Checkout Foundation V1 — pure domain rules (no payment gateways).
 * Money uses integer minor units only.
 */

import { availableUnits } from "./inventory";
import { normalizeCurrencyCode, validateAmountMinor } from "./money";
import { isPubliclyVisibleProduct } from "./permissions";

export const CHECKOUT_QUOTE_TTL_MINUTES = 15;

export type CheckoutAddressInput = {
  full_name: unknown;
  phone: unknown;
  email?: unknown;
  country_code: unknown;
  region?: unknown;
  city: unknown;
  postal_code?: unknown;
  address_line1: unknown;
  address_line2?: unknown;
  delivery_instructions?: unknown;
};

export type CheckoutAddress = {
  full_name: string;
  phone: string;
  email: string | null;
  country_code: string;
  region: string | null;
  city: string;
  postal_code: string | null;
  address_line1: string;
  address_line2: string | null;
  delivery_instructions: string | null;
};

export function validateCheckoutAddress(
  input: CheckoutAddressInput
): { ok: true; address: CheckoutAddress } | { ok: false; message: string } {
  const full_name = asTrimmed(input.full_name);
  const phone = asTrimmed(input.phone);
  const emailRaw = asTrimmed(input.email ?? "");
  const country_code = asTrimmed(input.country_code).toUpperCase();
  const region = emptyToNull(asTrimmed(input.region ?? ""));
  const city = asTrimmed(input.city);
  const postal_code = emptyToNull(asTrimmed(input.postal_code ?? ""));
  const address_line1 = asTrimmed(input.address_line1);
  const address_line2 = emptyToNull(asTrimmed(input.address_line2 ?? ""));
  const delivery_instructions = emptyToNull(
    asTrimmed(input.delivery_instructions ?? "")
  );

  if (full_name.length < 2 || full_name.length > 120) {
    return { ok: false, message: "Full name is invalid." };
  }
  if (!phone || !/^[0-9+()\s.-]+$/.test(phone)) {
    return { ok: false, message: "Phone is invalid." };
  }
  if (!/^[A-Z]{2}$/.test(country_code)) {
    return { ok: false, message: "Country code must be a 2-letter ISO code." };
  }
  if (!city || city.length > 80) {
    return { ok: false, message: "City is invalid." };
  }
  if (!address_line1 || address_line1.length > 160) {
    return { ok: false, message: "Address line 1 is invalid." };
  }
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return { ok: false, message: "Email is invalid." };
  }
  if (delivery_instructions && delivery_instructions.length > 500) {
    return { ok: false, message: "Delivery instructions are too long." };
  }

  return {
    ok: true,
    address: {
      full_name,
      phone,
      email: emailRaw || null,
      country_code,
      region,
      city,
      postal_code,
      address_line1,
      address_line2,
      delivery_instructions,
    },
  };
}

export function computeShippingFeeMinor(input: {
  feeMinor: number;
  freeAboveSubtotalMinor: number | null;
  subtotalMinor: number;
}): number {
  if (
    input.freeAboveSubtotalMinor != null &&
    input.subtotalMinor >= input.freeAboveSubtotalMinor
  ) {
    return 0;
  }
  return Math.max(0, input.feeMinor);
}

/** Exclusive: add tax on top. Inclusive: extract embedded tax portion. */
export function computeTaxMinor(input: {
  taxableMinor: number;
  rateBps: number;
  inclusive: boolean;
  enabled: boolean;
}): { taxMinor: number; grandMerchandiseMinor: number } {
  if (!input.enabled || input.rateBps <= 0 || input.taxableMinor <= 0) {
    return { taxMinor: 0, grandMerchandiseMinor: input.taxableMinor };
  }
  if (input.inclusive) {
    const taxMinor =
      input.taxableMinor -
      Math.floor((input.taxableMinor * 10000) / (10000 + input.rateBps));
    return {
      taxMinor: Math.max(0, taxMinor),
      grandMerchandiseMinor: input.taxableMinor,
    };
  }
  const taxMinor = Math.floor((input.taxableMinor * input.rateBps) / 10000);
  return {
    taxMinor: Math.max(0, taxMinor),
    grandMerchandiseMinor: input.taxableMinor + taxMinor,
  };
}

export function computeCouponDiscountMinor(input: {
  discountType: "percent" | "fixed";
  percentBps?: number | null;
  fixedAmountMinor?: number | null;
  subtotalMinor: number;
  maxDiscountMinor?: number | null;
}): number {
  let discount = 0;
  if (input.discountType === "percent") {
    discount = Math.floor(
      (input.subtotalMinor * (input.percentBps ?? 0)) / 10000
    );
  } else {
    discount = input.fixedAmountMinor ?? 0;
  }
  if (input.maxDiscountMinor != null) {
    discount = Math.min(discount, input.maxDiscountMinor);
  }
  discount = Math.min(discount, input.subtotalMinor);
  return Math.max(0, discount);
}

export function computeStoreCheckoutGrandTotalMinor(input: {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
  taxInclusive: boolean;
}): number {
  const afterDiscount = input.subtotalMinor - input.discountTotalMinor;
  if (input.taxInclusive) {
    return afterDiscount + input.shippingTotalMinor;
  }
  return afterDiscount + input.taxTotalMinor + input.shippingTotalMinor;
}

export function assertCheckoutGrandNonNegative(
  grandTotalMinor: number
): { ok: true } | { ok: false; message: string } {
  if (grandTotalMinor < 0) {
    return { ok: false, message: "Grand total cannot be negative." };
  }
  return { ok: true };
}

export function groupCartItemsByStore<T extends { storeId: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.storeId) ?? [];
    list.push(item);
    map.set(item.storeId, list);
  }
  return map;
}

export function evaluateCheckoutLineEligibility(input: {
  storeStatus: string;
  productStatus: string;
  moderationStatus: string;
  variantStatus: string;
  priceStatus: string;
  priceAmountMinor: unknown;
  priceCurrency: string;
  cartCurrency: string;
  quantity: number;
  onHand: number;
  reserved: number;
  safetyStock: number;
  allowBackorder: boolean;
}): { ok: true; unitPriceMinor: number } | { ok: false; message: string } {
  if (input.storeStatus !== "active") {
    return { ok: false, message: "Store is not active." };
  }
  if (
    !isPubliclyVisibleProduct({
      productStatus: input.productStatus,
      moderationStatus: input.moderationStatus,
      storeStatus: input.storeStatus,
    })
  ) {
    return { ok: false, message: "Product is not available for checkout." };
  }
  if (input.variantStatus !== "active") {
    return { ok: false, message: "Variant is not available for checkout." };
  }
  if (input.priceStatus !== "active") {
    return { ok: false, message: "Price is not active." };
  }
  const currency = normalizeCurrencyCode(input.cartCurrency);
  if (normalizeCurrencyCode(input.priceCurrency) !== currency) {
    return { ok: false, message: "Currency mismatch." };
  }
  const price = validateAmountMinor(input.priceAmountMinor, currency);
  if (!price.ok) return price;

  if (!input.allowBackorder) {
    const available = availableUnits({
      onHand: input.onHand,
      reserved: input.reserved,
      safetyStock: input.safetyStock,
    });
    if (input.quantity > available) {
      return { ok: false, message: "Insufficient inventory for checkout." };
    }
  }
  if (input.quantity < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }
  return { ok: true, unitPriceMinor: price.amountMinor };
}

export function isCheckoutQuoteExpired(
  expiresAtIso: string,
  nowMs: number = Date.now()
): boolean {
  const expires = Date.parse(expiresAtIso);
  if (!Number.isFinite(expires)) return true;
  return expires <= nowMs;
}

export function assertNoClientMoneyFields(
  payload: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  const forbidden = [
    "unit_price_minor",
    "total_price_minor",
    "subtotal_minor",
    "grand_total_minor",
    "tax_total_minor",
    "shipping_total_minor",
    "discount_total_minor",
    "product_snapshot",
    "sku_snapshot",
    "title_snapshot",
  ];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return {
        ok: false,
        message: `Client must not supply ${key}.`,
      };
    }
  }
  return { ok: true };
}

export function mapCheckoutRpcError(message: string | undefined): string {
  const raw = (message || "").toLowerCase();
  if (raw.includes("empty")) return "Your cart is empty.";
  if (raw.includes("expired")) return "Your checkout quote expired. Please review again.";
  if (raw.includes("inventory")) return "An item is out of stock.";
  if (raw.includes("coupon")) return "That coupon cannot be applied.";
  if (raw.includes("shipping")) return "Please choose a valid shipping method.";
  if (raw.includes("authentication")) return "Please sign in to checkout.";
  return message?.trim() || "Checkout failed.";
}

/** Multi-store policy documented for UI/tests. */
export const CHECKOUT_MULTI_STORE_POLICY = {
  mode: "atomic_across_stores" as const,
  description:
    "One order is created per store. confirm_store_checkout_quote is a single transaction: all store orders succeed or none are created.",
};

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function emptyToNull(value: string): string | null {
  return value ? value : null;
}
