/**
 * Runtime rechecks before publish, checkout, and provider disable.
 * Revocation hides content without deleting import audit.
 */

import { describeStorePdp, routeStoreCheckout } from "./checkoutRouting";
import { evaluateStoreCheckoutGate, evaluateStoreImagePublishGate, evaluateStorePublishGate } from "./rights";
import type { StoreImportRun, StoreNormalizedCatalogItem, StoreProvider } from "./types";

export type StoreCatalogSurface = {
  items: StoreNormalizedCatalogItem[];
  pdp: ReturnType<typeof describeStorePdp>[];
};

export function buildMockCatalogSurface(
  items: readonly StoreNormalizedCatalogItem[]
): StoreCatalogSurface {
  return {
    items: [...items],
    pdp: items.map(describeStorePdp),
  };
}

export function recheckStorePublish(
  provider: StoreProvider,
  item: StoreNormalizedCatalogItem
) {
  return evaluateStorePublishGate({ provider, item });
}

export function recheckStoreImages(
  provider: StoreProvider,
  item: StoreNormalizedCatalogItem
) {
  return evaluateStoreImagePublishGate({ provider, item });
}

export function recheckStoreCheckout(
  provider: StoreProvider,
  item: StoreNormalizedCatalogItem
) {
  return {
    rights: evaluateStoreCheckoutGate({ provider, item }),
    route: routeStoreCheckout({ provider, item }),
  };
}

export function retainImportAuditAfterTakedown(run: StoreImportRun): StoreImportRun {
  return {
    ...run,
    accepted: run.accepted.map((item) => ({ ...item, boundStoreProductId: null })),
  };
}
