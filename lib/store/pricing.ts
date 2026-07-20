/**
 * Store pricing engine — single source of truth for money math.
 * Reused by cart, checkout, order confirmation, and future payment providers.
 * All amounts are integer minor units (no floating point).
 */

export type PricingDiscountType = "percent" | "fixed";

export type StorePricingInput = {
  /** Merchandise subtotal before discount (sum of unit × qty). */
  subtotalMinor: number;
  discount?: {
    discountType: PricingDiscountType;
    percentBps?: number | null;
    fixedAmountMinor?: number | null;
    maxDiscountMinor?: number | null;
  } | null;
  /** Pre-computed discount when already validated server-side. */
  discountTotalMinor?: number | null;
  shipping?: {
    feeMinor: number;
    freeAboveSubtotalMinor?: number | null;
    /** When true, free-shipping threshold uses post-discount merchandise. */
    applyFreeThresholdToPostDiscount?: boolean;
  } | null;
  /** Pre-computed shipping fee when already validated. */
  shippingTotalMinor?: number | null;
  tax?: {
    enabled: boolean;
    rateBps: number;
    inclusive: boolean;
  } | null;
  /** Pre-computed tax when already validated. */
  taxTotalMinor?: number | null;
};

export type StorePricingBreakdown = {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxableMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
  grandTotalMinor: number;
  taxInclusive: boolean;
};

export function computeLineTotalMinor(
  unitPriceMinor: number,
  quantity: number
): number {
  if (
    !Number.isInteger(unitPriceMinor) ||
    !Number.isInteger(quantity) ||
    unitPriceMinor < 0 ||
    quantity < 0
  ) {
    return 0;
  }
  return unitPriceMinor * quantity;
}

export function computeShippingFeeMinor(input: {
  feeMinor: number;
  freeAboveSubtotalMinor: number | null | undefined;
  subtotalMinor: number;
}): number {
  const fee = Number.isFinite(input.feeMinor) ? Math.trunc(input.feeMinor) : 0;
  const sub = Number.isFinite(input.subtotalMinor)
    ? Math.trunc(input.subtotalMinor)
    : 0;
  if (
    input.freeAboveSubtotalMinor != null &&
    Number.isFinite(input.freeAboveSubtotalMinor) &&
    sub >= Math.trunc(input.freeAboveSubtotalMinor)
  ) {
    return 0;
  }
  return Math.max(0, fee);
}

/** Exclusive: add tax on top. Inclusive: extract embedded tax portion. */
export function computeTaxMinor(input: {
  taxableMinor: number;
  rateBps: number;
  inclusive: boolean;
  enabled: boolean;
}): { taxMinor: number; grandMerchandiseMinor: number } {
  const taxable = Math.max(0, Math.trunc(input.taxableMinor || 0));
  const rateBps = Math.max(0, Math.trunc(input.rateBps || 0));
  if (!input.enabled || rateBps <= 0 || taxable <= 0) {
    return { taxMinor: 0, grandMerchandiseMinor: taxable };
  }
  if (input.inclusive) {
    const taxMinor =
      taxable - Math.floor((taxable * 10000) / (10000 + rateBps));
    return {
      taxMinor: Math.max(0, taxMinor),
      grandMerchandiseMinor: taxable,
    };
  }
  const taxMinor = Math.floor((taxable * rateBps) / 10000);
  return {
    taxMinor: Math.max(0, taxMinor),
    grandMerchandiseMinor: taxable + taxMinor,
  };
}

export function computeCouponDiscountMinor(input: {
  discountType: PricingDiscountType;
  percentBps?: number | null;
  fixedAmountMinor?: number | null;
  subtotalMinor: number;
  maxDiscountMinor?: number | null;
}): number {
  const subtotal = Math.max(0, Math.trunc(input.subtotalMinor || 0));
  let discount = 0;
  if (input.discountType === "percent") {
    discount = Math.floor((subtotal * (input.percentBps ?? 0)) / 10000);
  } else {
    discount = Math.trunc(input.fixedAmountMinor ?? 0);
  }
  if (input.maxDiscountMinor != null) {
    discount = Math.min(discount, Math.trunc(input.maxDiscountMinor));
  }
  discount = Math.min(discount, subtotal);
  return Math.max(0, discount);
}

export function computeStoreCheckoutGrandTotalMinor(input: {
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
  taxInclusive: boolean;
}): number {
  const subtotal = Math.max(0, Math.trunc(input.subtotalMinor || 0));
  const discount = Math.min(
    subtotal,
    Math.max(0, Math.trunc(input.discountTotalMinor || 0))
  );
  const tax = Math.max(0, Math.trunc(input.taxTotalMinor || 0));
  const shipping = Math.max(0, Math.trunc(input.shippingTotalMinor || 0));
  const afterDiscount = subtotal - discount;
  if (input.taxInclusive) {
    return afterDiscount + shipping;
  }
  return afterDiscount + tax + shipping;
}

export function assertPricingGrandNonNegative(
  grandTotalMinor: number
): { ok: true } | { ok: false; message: string } {
  if (!Number.isInteger(grandTotalMinor) || grandTotalMinor < 0) {
    return { ok: false, message: "Grand total cannot be negative." };
  }
  return { ok: true };
}

/**
 * Canonical store-level pricing breakdown.
 * Prefer pre-computed totals from trusted DB RPCs when provided;
 * otherwise derive discount/shipping/tax from the nested configs.
 */
export function computeStorePricingBreakdown(
  input: StorePricingInput
): StorePricingBreakdown {
  const subtotalMinor = Math.max(0, Math.trunc(input.subtotalMinor || 0));

  let discountTotalMinor =
    input.discountTotalMinor != null
      ? Math.max(0, Math.trunc(input.discountTotalMinor))
      : 0;
  if (input.discountTotalMinor == null && input.discount) {
    discountTotalMinor = computeCouponDiscountMinor({
      ...input.discount,
      subtotalMinor,
    });
  }
  discountTotalMinor = Math.min(discountTotalMinor, subtotalMinor);

  const taxableMinor = Math.max(0, subtotalMinor - discountTotalMinor);

  let shippingTotalMinor =
    input.shippingTotalMinor != null
      ? Math.max(0, Math.trunc(input.shippingTotalMinor))
      : 0;
  if (input.shippingTotalMinor == null && input.shipping) {
    const thresholdBase = input.shipping.applyFreeThresholdToPostDiscount
      ? taxableMinor
      : subtotalMinor;
    shippingTotalMinor = computeShippingFeeMinor({
      feeMinor: input.shipping.feeMinor,
      freeAboveSubtotalMinor: input.shipping.freeAboveSubtotalMinor ?? null,
      subtotalMinor: thresholdBase,
    });
  }

  const taxInclusive = Boolean(input.tax?.inclusive);
  let taxTotalMinor =
    input.taxTotalMinor != null ? Math.max(0, Math.trunc(input.taxTotalMinor)) : 0;
  if (input.taxTotalMinor == null && input.tax) {
    taxTotalMinor = computeTaxMinor({
      taxableMinor,
      rateBps: input.tax.rateBps,
      inclusive: input.tax.inclusive,
      enabled: input.tax.enabled,
    }).taxMinor;
  }

  const grandTotalMinor = computeStoreCheckoutGrandTotalMinor({
    subtotalMinor,
    discountTotalMinor,
    taxTotalMinor,
    shippingTotalMinor,
    taxInclusive,
  });

  return {
    subtotalMinor,
    discountTotalMinor,
    taxableMinor,
    taxTotalMinor,
    shippingTotalMinor,
    grandTotalMinor,
    taxInclusive,
  };
}

/** Sum per-store breakdowns for multi-store checkout quote display. */
export function sumPricingBreakdowns(
  parts: StorePricingBreakdown[]
): Omit<StorePricingBreakdown, "taxInclusive"> & {
  taxInclusive: boolean | "mixed";
} {
  const taxFlags = new Set(parts.map((p) => p.taxInclusive));
  return {
    subtotalMinor: parts.reduce((s, p) => s + p.subtotalMinor, 0),
    discountTotalMinor: parts.reduce((s, p) => s + p.discountTotalMinor, 0),
    taxableMinor: parts.reduce((s, p) => s + p.taxableMinor, 0),
    taxTotalMinor: parts.reduce((s, p) => s + p.taxTotalMinor, 0),
    shippingTotalMinor: parts.reduce((s, p) => s + p.shippingTotalMinor, 0),
    grandTotalMinor: parts.reduce((s, p) => s + p.grandTotalMinor, 0),
    taxInclusive:
      taxFlags.size === 1 ? ([...taxFlags][0] ?? false) : "mixed",
  };
}
