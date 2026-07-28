import { availableUnits } from "./inventory";
import { isPubliclyVisibleProduct } from "./permissions";
import { normalizeCurrencyCode, validateAmountMinor } from "./money";
import { clientSuppliedMoneyFieldPresent } from "./tradingContracts";

export type CartEligibilityInput = {
  productStatus: string;
  moderationStatus: string;
  storeStatus: string;
  variantStatus: string;
  priceStatus: string;
  priceAmountMinor: unknown;
  priceCurrency: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  allowBackorder: boolean;
  requestedQuantity: number;
  existingQuantity?: number;
};

export type CartLineSnapshot = {
  unitPriceMinor: number;
  currency: string;
  quantity: number;
  storeId: string;
  productTitle: string;
  variantTitle: string;
  mediaSnapshot: string | null;
};

export type CartSummaryLine = {
  id: string;
  storeId: string;
  storeName?: string;
  /** Present when cart summary enrichment includes store slug. */
  storeSlug?: string | null;
  variantId?: string | null;
  quantity: number;
  unitPriceMinor: number;
  currency: string;
  productTitle: string;
  variantTitle: string;
  mediaSnapshot: string | null;
  lineTotalMinor: number;
  /** Live active unit price when enrichment ran; null if unavailable. */
  liveUnitPriceMinor?: number | null;
  /** Live available units when enrichment ran; null if unknown. */
  available?: number | null;
  /** True when live price differs from cart snapshot. */
  priceChanged?: boolean;
  /** Buyer-facing issue that should block silent checkout progression. */
  blockingIssue?: string | null;
};

export type CartSummary = {
  currency: string | null;
  itemCount: number;
  subtotalMinor: number;
  groups: Array<{
    storeId: string;
    storeName: string;
    storeSlug?: string | null;
    items: CartSummaryLine[];
    storeSubtotalMinor: number;
  }>;
  /** True when any line has a blockingIssue (stale price, unavailable, etc.). */
  hasBlockingIssues?: boolean;
};

export function validateCartQuantity(
  value: unknown
): { ok: true; quantity: number } | { ok: false; message: string } {
  if (typeof value === "string" && value.trim() !== "") {
    if (!/^\d+$/.test(value.trim())) {
      return { ok: false, message: "Quantity must be a whole number." };
    }
    value = Number(value.trim());
  }
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, message: "Quantity must be a whole number." };
  }
  if (value < 1) {
    return { ok: false, message: "Quantity must be at least 1." };
  }
  if (value > 9999) {
    return { ok: false, message: "Quantity is too large." };
  }
  return { ok: true, quantity: value };
}

/** Idempotent merge: existing + delta (add) or absolute set. */
export function mergeCartQuantity(input: {
  existingQuantity: number;
  addQuantity?: number;
  setQuantity?: number;
}): { ok: true; quantity: number } | { ok: false; message: string } {
  let next: number;
  if (input.setQuantity !== undefined) {
    const parsed = validateCartQuantity(input.setQuantity);
    if (!parsed.ok) return parsed;
    next = parsed.quantity;
  } else {
    const add = validateCartQuantity(input.addQuantity ?? 1);
    if (!add.ok) return add;
    next = input.existingQuantity + add.quantity;
  }
  return validateCartQuantity(next);
}

export function assertCurrenciesCompatible(
  cartCurrency: string | null | undefined,
  itemCurrency: string
): { ok: true; currency: string } | { ok: false; message: string } {
  const item = normalizeCurrencyCode(itemCurrency);
  if (!/^[A-Z]{3}$/.test(item)) {
    return { ok: false, message: "Currency is invalid." };
  }
  if (!cartCurrency) {
    return { ok: true, currency: item };
  }
  const cart = normalizeCurrencyCode(cartCurrency);
  if (cart !== item) {
    return {
      ok: false,
      message: "Cross-currency cart mixing is not allowed. Clear your cart first.",
    };
  }
  return { ok: true, currency: item };
}

/**
 * Server-side eligibility + price snapshot. Client-supplied prices are ignored.
 */
export function evaluateCartAdd(input: CartEligibilityInput):
  | {
      ok: true;
      quantity: number;
      unitPriceMinor: number;
      currency: string;
      available: number;
    }
  | { ok: false; message: string } {
  if (
    !isPubliclyVisibleProduct({
      productStatus: input.productStatus,
      moderationStatus: input.moderationStatus,
      storeStatus: input.storeStatus,
    })
  ) {
    return { ok: false, message: "This product is not available." };
  }

  if (input.variantStatus !== "active") {
    return { ok: false, message: "This variant is not available." };
  }

  if (input.priceStatus !== "active") {
    return { ok: false, message: "This variant has no active price." };
  }

  const price = validateAmountMinor(input.priceAmountMinor, input.priceCurrency);
  if (!price.ok) {
    return { ok: false, message: "Unable to resolve a valid price." };
  }

  const qty = validateCartQuantity(input.requestedQuantity);
  if (!qty.ok) return qty;

  const existing = input.existingQuantity ?? 0;
  if (existing < 0 || !Number.isInteger(existing)) {
    return { ok: false, message: "Existing cart quantity is invalid." };
  }

  const addMerged = mergeCartQuantity({
    existingQuantity: existing,
    addQuantity: qty.quantity,
  });
  if (!addMerged.ok) return addMerged;

  const available = availableUnits({
    onHand: input.onHand,
    reserved: input.reserved,
    safetyStock: input.safetyStock,
  });

  if (!input.allowBackorder && addMerged.quantity > available) {
    return {
      ok: false,
      message:
        available <= 0
          ? "This item is out of stock."
          : `Only ${available} available in stock.`,
    };
  }

  return {
    ok: true,
    quantity: addMerged.quantity,
    unitPriceMinor: price.amountMinor,
    currency: price.currency,
    available,
  };
}

export function evaluateCartSetQuantity(input: {
  eligibility: Omit<CartEligibilityInput, "requestedQuantity" | "existingQuantity">;
  setQuantity: number;
}):
  | { ok: true; quantity: number; unitPriceMinor: number; currency: string }
  | { ok: false; message: string } {
  const result = evaluateCartAdd({
    ...input.eligibility,
    requestedQuantity: input.setQuantity,
    existingQuantity: 0,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    quantity: result.quantity,
    unitPriceMinor: result.unitPriceMinor,
    currency: result.currency,
  };
}

/** Buyers only — store roles never grant cart access. */
export function canAccessBuyerCart(input: {
  cartUserId: string;
  requesterUserId: string;
}): boolean {
  return (
    Boolean(input.cartUserId) &&
    Boolean(input.requesterUserId) &&
    input.cartUserId === input.requesterUserId
  );
}

export function computeCartSummary(
  lines: Array<
    Omit<CartSummaryLine, "lineTotalMinor"> & { storeName?: string }
  >
): CartSummary {
  if (lines.length === 0) {
    return {
      currency: null,
      itemCount: 0,
      subtotalMinor: 0,
      groups: [],
      hasBlockingIssues: false,
    };
  }

  const currency = normalizeCurrencyCode(lines[0]!.currency);
  const enriched: CartSummaryLine[] = [];
  let subtotalMinor = 0;
  let itemCount = 0;

  for (const line of lines) {
    if (normalizeCurrencyCode(line.currency) !== currency) {
      // Defensive: skip illegal lines rather than trusting mixed totals
      continue;
    }
    const lineTotalMinor = line.unitPriceMinor * line.quantity;
    subtotalMinor += lineTotalMinor;
    itemCount += line.quantity;
    enriched.push({ ...line, lineTotalMinor, storeName: line.storeName });
  }

  const byStore = new Map<string, CartSummaryLine[]>();
  for (const line of enriched) {
    const list = byStore.get(line.storeId) ?? [];
    list.push(line);
    byStore.set(line.storeId, list);
  }

  const groups = Array.from(byStore.entries()).map(([storeId, items]) => ({
    storeId,
    storeName: items[0]?.storeName || "Store",
    storeSlug: items[0]?.storeSlug ?? null,
    items,
    storeSubtotalMinor: items.reduce((sum, i) => sum + i.lineTotalMinor, 0),
  }));

  const hasBlockingIssues = enriched.some((line) => Boolean(line.blockingIssue));

  return { currency, itemCount, subtotalMinor, groups, hasBlockingIssues };
}

/** Reject client-provided price snapshots — server must supply. */
export function rejectClientPriceSnapshot(clientPrice: unknown): boolean {
  return clientSuppliedMoneyFieldPresent(clientPrice);
}
