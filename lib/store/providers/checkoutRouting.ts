/**
 * Checkout-mode routing — rights rechecked before any checkout action.
 * MOCK never becomes production-purchasable.
 */

import { evaluateStoreCheckoutGate, evaluateStoreRight } from "./rights";
import type { StoreCheckoutRoute, StoreNormalizedCatalogItem, StoreProvider } from "./types";

export function routeStoreCheckout(input: {
  provider: StoreProvider;
  item: StoreNormalizedCatalogItem;
}): StoreCheckoutRoute {
  const checkout = evaluateStoreCheckoutGate(input);
  const allowed = checkout.allowed;
  const reason = checkout.allowed
    ? "Checkout allowed after live rights recheck."
    : checkout.reason;

  switch (input.provider.mode) {
    case "AFFILIATE":
      return { mode: "AFFILIATE", action: "REDIRECT_EXTERNAL", allowed, reason };
    case "CATALOG_API":
      return { mode: "CATALOG_API", action: "SYNC_THEN_CHECKOUT", allowed, reason };
    case "DROPSHIP":
      return { mode: "DROPSHIP", action: "UMTUBA_CHECKOUT_PROVIDER_FULFILL", allowed, reason };
    case "WHOLESALE":
      return { mode: "WHOLESALE", action: "B2B_QUOTE", allowed, reason };
    case "RESELLER": {
      const resell = evaluateStoreRight(input.provider, "RESELL_ALLOWED");
      return {
        mode: "RESELLER",
        action: "UMTUBA_CHECKOUT_RESELL",
        allowed: allowed && resell.allowed,
        reason: !resell.allowed ? resell.reason : reason,
      };
    }
    case "MARKETPLACE":
      return { mode: "MARKETPLACE", action: "SELLER_LISTING_CHECKOUT", allowed, reason };
  }
}

export function describeStorePdp(item: StoreNormalizedCatalogItem): {
  title: string;
  purchasable: false | true;
  mockLabel: string | null;
  images: { url: string; alt: string }[];
} {
  const mock = item.dataClass === "MOCK_DATA";
  return {
    title: item.title,
    purchasable: false,
    mockLabel: mock ? "UMTUBA Mock Catalog — not a real partner product" : null,
    images: item.images.filter((img) => img.publishable).map((img) => ({ url: img.url, alt: img.alt })),
  };
}
