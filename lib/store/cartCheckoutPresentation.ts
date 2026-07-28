/**
 * Pure presentation / integrity helpers for premium cart & checkout UX.
 * Does not invent money — only labels and structures trusted server values.
 */

import type { CartSummary, CartSummaryLine } from "./cartRules";
import { validateCartQuantity } from "./cartRules";
import {
  CHECKOUT_MULTI_STORE_POLICY,
  isCheckoutQuoteExpired,
  validateCheckoutAddress,
  type CheckoutAddressInput,
} from "./checkoutRules";
import { isSafeStoreBrandingUrl } from "./storeBranding";

export type CheckoutMoneyRow = {
  key: "subtotal" | "discount" | "shipping" | "tax" | "grand";
  label: string;
  amountMinor: number | null;
  /** When false, amount is not yet calculated by the server. */
  known: boolean;
  emphasize?: boolean;
};

export function cartMediaDisplayUrl(
  mediaSnapshot: string | null | undefined
): string | null {
  if (!mediaSnapshot) return null;
  return isSafeStoreBrandingUrl(mediaSnapshot) ? mediaSnapshot.trim() : null;
}

export function deriveCartLineBlockingIssue(input: {
  liveUnitPriceMinor: number | null;
  snapshotUnitPriceMinor: number;
  available: number | null;
  quantity: number;
  allowBackorder: boolean;
  productAvailable: boolean;
  variantAvailable: boolean;
  storeActive: boolean;
}): string | null {
  if (!input.storeActive) return "Seller is unavailable.";
  if (!input.productAvailable) return "Product is no longer available.";
  if (!input.variantAvailable) return "Selected variant is unavailable.";
  if (input.liveUnitPriceMinor == null) {
    return "Current price is unavailable. Remove this item or try again later.";
  }
  if (input.liveUnitPriceMinor !== input.snapshotUnitPriceMinor) {
    return "Price changed. Update quantity or refresh before checkout.";
  }
  if (
    !input.allowBackorder &&
    input.available != null &&
    input.quantity > input.available
  ) {
    return input.available <= 0
      ? "Out of stock."
      : `Only ${input.available} available.`;
  }
  return null;
}

export function cartHasBlockingIssues(summary: CartSummary): boolean {
  if (summary.hasBlockingIssues) return true;
  return summary.groups.some((g) =>
    g.items.some((item) => Boolean(item.blockingIssue))
  );
}

export function canProceedFromCart(summary: CartSummary): {
  ok: boolean;
  message: string | null;
} {
  if (summary.itemCount === 0 || summary.groups.length === 0) {
    return { ok: false, message: "Your cart is empty." };
  }
  if (cartHasBlockingIssues(summary)) {
    return {
      ok: false,
      message:
        "Resolve unavailable items or price changes before checkout. Totals must stay server-trusted.",
    };
  }
  return { ok: true, message: null };
}

export function multiSellerCheckoutNotice(storeCount: number): string | null {
  if (storeCount <= 1) return null;
  return `${CHECKOUT_MULTI_STORE_POLICY.description} Items from ${storeCount} sellers will become ${storeCount} orders — not one shared shipment.`;
}

export function clampDisplayedQuantity(
  value: unknown,
  max?: number | null
): { ok: true; quantity: number } | { ok: false; message: string } {
  const parsed = validateCartQuantity(value);
  if (!parsed.ok) return parsed;
  if (max != null && Number.isFinite(max) && max >= 1 && parsed.quantity > max) {
    return {
      ok: false,
      message: `Only ${Math.floor(max)} available.`,
    };
  }
  return parsed;
}

export function buildCheckoutQuoteMoneyRows(input: {
  cartSubtotalMinor: number;
  quoteGroup?: {
    discount_total_minor?: unknown;
    shipping_total_minor?: unknown;
    tax_total_minor?: unknown;
    grand_total_minor?: unknown;
    subtotal_minor?: unknown;
  } | null;
  quoted: boolean;
}): CheckoutMoneyRow[] {
  const group = input.quoteGroup;
  const asMinor = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v)) {
      return v;
    }
    if (typeof v === "string" && /^-?\d+$/.test(v.trim())) {
      return Number(v.trim());
    }
    return null;
  };

  if (!input.quoted || !group) {
    return [
      {
        key: "subtotal",
        label: "Item subtotal",
        amountMinor: input.cartSubtotalMinor,
        known: true,
      },
      { key: "discount", label: "Discount", amountMinor: null, known: false },
      {
        key: "shipping",
        label: "Delivery",
        amountMinor: null,
        known: false,
      },
      { key: "tax", label: "Tax", amountMinor: null, known: false },
      {
        key: "grand",
        label: "Grand total",
        amountMinor: null,
        known: false,
        emphasize: true,
      },
    ];
  }

  const subtotal =
    asMinor(group.subtotal_minor) ?? input.cartSubtotalMinor;
  const discount = asMinor(group.discount_total_minor);
  const shipping = asMinor(group.shipping_total_minor);
  const tax = asMinor(group.tax_total_minor);
  const grand = asMinor(group.grand_total_minor);

  return [
    {
      key: "subtotal",
      label: "Item subtotal",
      amountMinor: subtotal,
      known: true,
    },
    {
      key: "discount",
      label: "Discount",
      amountMinor: discount,
      known: discount != null,
    },
    {
      key: "shipping",
      label: "Delivery",
      amountMinor: shipping,
      known: shipping != null,
    },
    {
      key: "tax",
      label: "Tax",
      amountMinor: tax,
      known: tax != null,
    },
    {
      key: "grand",
      label: "Grand total",
      amountMinor: grand,
      known: grand != null,
      emphasize: true,
    },
  ];
}

export function aggregateQuoteTotals(
  groups: Array<Record<string, unknown>>
): {
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  grandMinor: number;
  subtotalMinor: number;
} {
  let discountMinor = 0;
  let shippingMinor = 0;
  let taxMinor = 0;
  let grandMinor = 0;
  let subtotalMinor = 0;
  for (const g of groups) {
    discountMinor += Number(g.discount_total_minor ?? 0) || 0;
    shippingMinor += Number(g.shipping_total_minor ?? 0) || 0;
    taxMinor += Number(g.tax_total_minor ?? 0) || 0;
    grandMinor += Number(g.grand_total_minor ?? 0) || 0;
    subtotalMinor += Number(g.subtotal_minor ?? 0) || 0;
  }
  return { discountMinor, shippingMinor, taxMinor, grandMinor, subtotalMinor };
}

export function evaluateCheckoutStepReadiness(input: {
  hasItems: boolean;
  hasAddress: boolean;
  shippingSelectionsComplete: boolean;
  hasQuote: boolean;
  quoteExpiresAt?: string | null;
  purchasesAvailable: boolean;
  nowMs?: number;
}): {
  step: "cart" | "address" | "delivery" | "quote" | "submit";
  canQuote: boolean;
  canSubmit: boolean;
  message: string | null;
} {
  if (!input.hasItems) {
    return {
      step: "cart",
      canQuote: false,
      canSubmit: false,
      message: "Your cart is empty.",
    };
  }
  if (!input.hasAddress) {
    return {
      step: "address",
      canQuote: false,
      canSubmit: false,
      message: "Add or select a delivery address.",
    };
  }
  if (!input.shippingSelectionsComplete) {
    return {
      step: "delivery",
      canQuote: false,
      canSubmit: false,
      message: "Choose a delivery method for each seller.",
    };
  }
  if (!input.hasQuote) {
    return {
      step: "quote",
      canQuote: true,
      canSubmit: false,
      message: "Calculate a server quote before placing the order.",
    };
  }
  if (
    input.quoteExpiresAt &&
    isCheckoutQuoteExpired(input.quoteExpiresAt, input.nowMs)
  ) {
    return {
      step: "quote",
      canQuote: true,
      canSubmit: false,
      message: "Your checkout quote expired. Refresh the quote.",
    };
  }
  if (!input.purchasesAvailable) {
    return {
      step: "submit",
      canQuote: true,
      canSubmit: false,
      message: "Purchases are not currently available.",
    };
  }
  return {
    step: "submit",
    canQuote: true,
    canSubmit: true,
    message: null,
  };
}

export function validateCheckoutAddressForm(
  input: CheckoutAddressInput
): { ok: true } | { ok: false; message: string } {
  const result = validateCheckoutAddress(input);
  if (!result.ok) return result;
  return { ok: true };
}

export function lineIssueTone(
  line: CartSummaryLine
): "ok" | "warn" | "danger" {
  if (line.blockingIssue) return "danger";
  if (line.priceChanged) return "warn";
  if (line.available != null && line.available <= 3) return "warn";
  return "ok";
}
