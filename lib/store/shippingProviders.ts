/**
 * Shipping provider abstraction — future carrier integrations.
 * No external APIs in this foundation.
 */

import {
  SHIPPING_PROVIDER_KEYS,
  SHIPPING_SERVICE_TYPES,
  type ShippingProviderKey,
  type ShippingServiceType,
  isShippingProviderKey,
  isShippingServiceType,
  quoteShippingMethod,
  type ShippingMethodQuote,
  type ShippingMethodQuoteInput,
} from "./shipping";

export { SHIPPING_PROVIDER_KEYS, SHIPPING_SERVICE_TYPES };
export type { ShippingProviderKey, ShippingServiceType };

export const SHIPPING_PROVIDER_LABELS: Record<ShippingProviderKey, string> = {
  manual: "Manual / in-house",
  local_courier: "Local courier",
  ups: "UPS",
  fedex: "FedEx",
  dhl: "DHL",
  aramex: "Aramex",
  custom: "Custom provider",
};

export type ShippingProviderConfig = {
  providerKey: ShippingProviderKey;
  displayName: string;
  enabled: boolean;
  supportsTracking: boolean;
  supportsPickup: boolean;
  supportsInternational: boolean;
};

export type ShippingZoneInput = {
  name: string;
  countryCodes: readonly string[];
  regionCodes?: readonly string[];
  enabled: boolean;
};

export type ShippingRateInput = {
  zoneId: string;
  providerKey: ShippingProviderKey;
  serviceType: ShippingServiceType;
  feeMinor: number;
  currency: string;
  minSubtotalMinor?: number | null;
  maxSubtotalMinor?: number | null;
  freeAboveSubtotalMinor?: number | null;
  enabled: boolean;
};

export const DEFAULT_SHIPPING_PROVIDER_CATALOG: ShippingProviderConfig[] =
  SHIPPING_PROVIDER_KEYS.map((key) => ({
    providerKey: key,
    displayName: SHIPPING_PROVIDER_LABELS[key],
    enabled: key === "manual" || key === "local_courier",
    supportsTracking: !["manual"].includes(key),
    supportsPickup: key === "manual" || key === "local_courier",
    supportsInternational: ["dhl", "fedex", "ups", "aramex"].includes(key),
  }));

export function validateShippingZone(
  input: ShippingZoneInput
): { ok: true } | { ok: false; message: string } {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return { ok: false, message: "Zone name must be 2–80 characters." };
  }
  if (input.countryCodes.length === 0) {
    return { ok: false, message: "At least one country code is required." };
  }
  for (const cc of input.countryCodes) {
    if (!/^[A-Z]{2}$/.test(cc.trim().toUpperCase())) {
      return { ok: false, message: "Country codes must be 2-letter ISO codes." };
    }
  }
  return { ok: true };
}

export function validateShippingRate(
  input: ShippingRateInput
): { ok: true } | { ok: false; message: string } {
  if (!isShippingProviderKey(input.providerKey)) {
    return { ok: false, message: "Invalid shipping provider." };
  }
  if (!isShippingServiceType(input.serviceType)) {
    return { ok: false, message: "Invalid shipping service type." };
  }
  if (!Number.isInteger(input.feeMinor) || input.feeMinor < 0) {
    return { ok: false, message: "Shipping fee must be a non-negative integer." };
  }
  if (!/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) {
    return { ok: false, message: "Shipping rate currency is invalid." };
  }
  return { ok: true };
}

export function quoteRateForSubtotal(input: {
  rate: ShippingRateInput;
  subtotalMinor: number;
}): ShippingMethodQuote | { ok: false; message: string } {
  const subtotal = Math.max(0, Math.trunc(input.subtotalMinor));
  const min = input.rate.minSubtotalMinor ?? 0;
  const max = input.rate.maxSubtotalMinor;
  if (subtotal < min) {
    return { ok: false, message: "Subtotal below shipping rate minimum." };
  }
  if (max != null && subtotal > max) {
    return { ok: false, message: "Subtotal above shipping rate maximum." };
  }
  return quoteShippingMethod({
    serviceType: input.rate.serviceType,
    providerKey: input.rate.providerKey,
    feeMinor: input.rate.feeMinor,
    currency: input.rate.currency,
    freeAboveSubtotalMinor: input.rate.freeAboveSubtotalMinor ?? null,
    eligibleSubtotalMinor: subtotal,
  });
}

export function resolveProviderForService(
  providerKey: ShippingProviderKey,
  serviceType: ShippingServiceType
): { ok: true } | { ok: false; message: string } {
  if (serviceType === "pickup" && providerKey !== "manual" && providerKey !== "local_courier") {
    return { ok: false, message: "Pickup is only supported for manual/local providers." };
  }
  return { ok: true };
}

export function mapShippingAdminRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not authorized")) return "You cannot manage shipping for this store.";
  if (m.includes("zone not found")) return "Shipping zone not found.";
  if (m.includes("provider not found")) return "Shipping provider not found.";
  return message || "Shipping configuration request failed.";
}
