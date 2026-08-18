/**
 * MOCK / REAL separation for Store provider content.
 */

import type { DataClass } from "../../partners/types";
import { containsForbiddenBrandToken } from "./rights";
import type { StoreNormalizedCatalogItem, StoreProvider } from "./types";

export const MOCK_STORE_LABEL = "UMTUBA Mock Catalog — not a real partner product";

export function isMockStoreProvider(provider: StoreProvider): boolean {
  return provider.dataClass === "MOCK_DATA";
}

export function isMockStoreItem(item: StoreNormalizedCatalogItem): boolean {
  return item.dataClass === "MOCK_DATA";
}

export function canBecomeProductionPurchasable(input: {
  dataClass: DataClass;
}): boolean {
  if (input.dataClass === "MOCK_DATA" || input.dataClass === "REAL_PARTNER_DATA") {
    return false;
  }
  return false;
}

export function mockItemDisplaySafe(item: StoreNormalizedCatalogItem): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (item.dataClass !== "MOCK_DATA") {
    reasons.push("Expected MOCK_DATA.");
  }
  const fields = [item.title, item.description, item.sku, item.category, ...item.images.flatMap((i) => [i.url, i.alt])];
  for (const field of fields) {
    if (containsForbiddenBrandToken(field)) {
      reasons.push("Forbidden third-party brand token.");
      break;
    }
  }
  return { ok: reasons.length === 0, reasons };
}
