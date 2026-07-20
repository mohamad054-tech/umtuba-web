/**
 * Shipping architecture — provider-neutral models for Store checkout.
 * No external carrier APIs in this foundation.
 */

export const SHIPPING_SERVICE_TYPES = [
  "local",
  "international",
  "pickup",
  "standard",
  "express",
] as const;
export type ShippingServiceType = (typeof SHIPPING_SERVICE_TYPES)[number];

/** Reserved provider keys for future carrier integrations. */
export const SHIPPING_PROVIDER_KEYS = [
  "manual",
  "local_courier",
  "ups",
  "fedex",
  "dhl",
  "aramex",
  "custom",
] as const;
export type ShippingProviderKey = (typeof SHIPPING_PROVIDER_KEYS)[number];

export type ShippingMethodQuoteInput = {
  serviceType: ShippingServiceType;
  providerKey?: ShippingProviderKey | null;
  feeMinor: number;
  currency: string;
  freeAboveSubtotalMinor?: number | null;
  /** Merchandise amount used for free-shipping threshold. */
  eligibleSubtotalMinor: number;
  estimateText?: string | null;
};

export type ShippingMethodQuote = {
  serviceType: ShippingServiceType;
  providerKey: ShippingProviderKey;
  feeMinor: number;
  currency: string;
  estimateText: string | null;
  freeShippingApplied: boolean;
};

export function isShippingServiceType(
  value: unknown
): value is ShippingServiceType {
  return (
    typeof value === "string" &&
    (SHIPPING_SERVICE_TYPES as readonly string[]).includes(value)
  );
}

export function isShippingProviderKey(
  value: unknown
): value is ShippingProviderKey {
  return (
    typeof value === "string" &&
    (SHIPPING_PROVIDER_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Quote a shipping fee from store configuration (no carrier API).
 * Free-shipping threshold uses integer minor units only.
 * Invalid currency fails closed (fee 0 with invalid currency marker rejected).
 */
export function quoteShippingMethod(
  input: ShippingMethodQuoteInput
): ShippingMethodQuote | { ok: false; message: string } {
  const currency = (input.currency || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, message: "Shipping currency must be a 3-letter ISO code." };
  }
  if (!isShippingServiceType(input.serviceType)) {
    return { ok: false, message: "Shipping service type is invalid." };
  }

  const providerKey = input.providerKey ?? "manual";
  if (input.providerKey != null && !isShippingProviderKey(input.providerKey)) {
    return { ok: false, message: "Shipping provider key is invalid." };
  }

  const feeConfigured = Math.max(0, Math.trunc(input.feeMinor || 0));
  const eligible = Math.max(0, Math.trunc(input.eligibleSubtotalMinor || 0));
  const freeAbove =
    input.freeAboveSubtotalMinor == null
      ? null
      : Math.max(0, Math.trunc(input.freeAboveSubtotalMinor));
  const freeShippingApplied = freeAbove != null && eligible >= freeAbove;

  return {
    serviceType: input.serviceType,
    providerKey: isShippingProviderKey(providerKey) ? providerKey : "manual",
    feeMinor: freeShippingApplied ? 0 : feeConfigured,
    currency,
    estimateText: input.estimateText?.trim() || null,
    freeShippingApplied,
  };
}

/** Default method when a store has not configured shipping methods. */
export function defaultManualShippingQuote(currency: string): ShippingMethodQuote {
  const code = currency.trim().toUpperCase();
  return {
    serviceType: "standard",
    providerKey: "manual",
    feeMinor: 0,
    currency: /^[A-Z]{3}$/.test(code) ? code : "USD",
    estimateText: "Estimated delivery shared after order review",
    freeShippingApplied: false,
  };
}

export function isShippingQuote(
  value: ShippingMethodQuote | { ok: false; message: string }
): value is ShippingMethodQuote {
  return !("ok" in value && value.ok === false);
}
