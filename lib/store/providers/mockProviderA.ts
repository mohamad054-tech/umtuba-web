/**
 * Mock provider A — CATALOG_API fixture for partner-ready import QA.
 * Extends the V2 Store provider stack. Synthetic products only.
 */

import { mapProviderCategoryToUmtuba } from "../categories/taxonomy";
import { emptyStoreRights, grantStoreRight } from "./rights";
import type { StoreNormalizedCatalogItem, StoreProvider, StoreRawCatalogRecord } from "./types";

const AT = "2026-08-18T12:00:00.000Z";

export const MOCK_PROVIDER_A_ID = "aaaa1111-1111-4111-8111-aaaaaaaaaaa1";

export function mockProviderA(): StoreProvider {
  let rights = emptyStoreRights(
    "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    MOCK_PROVIDER_A_ID,
    AT
  );
  rights = grantStoreRight(rights, "CATALOG_DISPLAY_ALLOWED", AT);
  rights = grantStoreRight(rights, "IMAGE_USAGE_ALLOWED", AT);
  rights = grantStoreRight(rights, "PRICE_SYNC_ALLOWED", AT);
  rights = grantStoreRight(rights, "INVENTORY_SYNC_ALLOWED", AT);
  return {
    id: MOCK_PROVIDER_A_ID,
    slug: "umtuba-mock-provider-a",
    displayName: "UMTUBA Mock Provider A",
    mode: "CATALOG_API",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "MOCK_PROVIDER",
    rights,
    ownership: {
      PAYMENT_OWNER: "UNKNOWN",
      FULFILLMENT_OWNER: "PROVIDER",
      RETURNS_OWNER: "PROVIDER",
      CUSTOMER_SUPPORT_OWNER: "UMTUBA",
    },
    maxStaleMs: 24 * 60 * 60 * 1000,
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

const PROVIDER_A_SEEDS: { externalId: string; title: string; category: string; priceMinor: number; variants?: 2 }[] = [
  { externalId: "mpa-01", title: "UMTUBA Mock A Compact Speaker", category: "consumer-electronics", priceMinor: 5499, variants: 2 },
  { externalId: "mpa-02", title: "UMTUBA Mock A USB Hub", category: "gadgets", priceMinor: 2199 },
  { externalId: "mpa-03", title: "UMTUBA Mock A Knit Beanie", category: "apparel", priceMinor: 1599, variants: 2 },
  { externalId: "mpa-04", title: "UMTUBA Mock A Canvas Slip-On", category: "footwear", priceMinor: 3899 },
  { externalId: "mpa-05", title: "UMTUBA Mock A Pour-Over Kettle", category: "kitchen", priceMinor: 4299 },
  { externalId: "mpa-06", title: "UMTUBA Mock A Side Table", category: "furniture", priceMinor: 8999 },
  { externalId: "mpa-07", title: "UMTUBA Mock A Hand Cream", category: "skincare", priceMinor: 1299 },
  { externalId: "mpa-08", title: "UMTUBA Mock A Comb Set", category: "grooming", priceMinor: 999 },
  { externalId: "mpa-09", title: "UMTUBA Mock A Jump Rope", category: "fitness", priceMinor: 1499 },
  { externalId: "mpa-10", title: "UMTUBA Mock A Trail Bottle", category: "outdoor", priceMinor: 1899 },
  { externalId: "mpa-11", title: "UMTUBA Mock A Pocket Reader", category: "books-media", priceMinor: 799 },
  { externalId: "mpa-12", title: "UMTUBA Mock A Staff Notebook", category: "publications", priceMinor: 1199 },
  { externalId: "mpa-13", title: "UMTUBA Mock A Belt Pouch", category: "bags", priceMinor: 2499, variants: 2 },
  { externalId: "mpa-14", title: "UMTUBA Mock A Wrist Band", category: "accessories", priceMinor: 899 },
  { externalId: "mpa-15", title: "UMTUBA Mock A Stacking Cups", category: "children", priceMinor: 1699 },
  { externalId: "mpa-16", title: "UMTUBA Mock A Quiet Puzzle", category: "toys", priceMinor: 1999 },
  { externalId: "mpa-17", title: "UMTUBA Mock A Mirror Clip", category: "car-accessories", priceMinor: 1399 },
  { externalId: "mpa-18", title: "UMTUBA Mock A Vent Tray", category: "automotive", priceMinor: 1599 },
  { externalId: "mpa-19", title: "UMTUBA Mock A Pen Cup", category: "stationery", priceMinor: 899 },
  { externalId: "mpa-20", title: "UMTUBA Mock A Desk Blotter", category: "office-supplies", priceMinor: 1799 },
  { externalId: "mpa-21", title: "UMTUBA Mock A Sticker Sheet", category: "digital-goods", priceMinor: 399 },
  { externalId: "mpa-22", title: "UMTUBA Mock A Wallpaper Pack", category: "software", priceMinor: 499 },
  { externalId: "mpa-23", title: "UMTUBA Mock A Cable Tie Card", category: "uncategorized", priceMinor: 599 },
  { externalId: "mpa-24", title: "UMTUBA Mock A Lens Cloth", category: "tech", priceMinor: 699 },
  { externalId: "mpa-25", title: "UMTUBA Mock A Studio Clip", category: "other", priceMinor: 799 },
];

export const MOCK_PROVIDER_A_CATALOG: StoreRawCatalogRecord[] = PROVIDER_A_SEEDS.map((seed) => ({
  externalId: seed.externalId,
  title: seed.title,
  description: `${seed.title} is a synthetic Mock Provider A record for import, normalize, rights, and catalog QA. Not a real partner SKU.`,
  sku: `MPA-${seed.externalId.toUpperCase()}`,
  productType: seed.category.includes("digital") || seed.category === "software" ? "digital" : "physical",
  category: seed.category,
  priceMinor: seed.priceMinor,
  currency: "USD",
  onHand: 5,
  images: [{ url: `/mock/store/provider-a/${seed.externalId}.png`, alt: `${seed.title} mock image`, role: "cover" }],
  variants: seed.variants
    ? [
        {
          externalId: `${seed.externalId}-a`,
          sku: `MPA-${seed.externalId.toUpperCase()}-A`,
          title: "Variant A",
          optionValues: { finish: "a" },
          priceMinor: seed.priceMinor,
          currency: "USD",
          onHand: 3,
        },
        {
          externalId: `${seed.externalId}-b`,
          sku: `MPA-${seed.externalId.toUpperCase()}-B`,
          title: "Variant B",
          optionValues: { finish: "b" },
          priceMinor: seed.priceMinor,
          currency: "USD",
          onHand: 2,
        },
      ]
    : undefined,
}));

export function applyUmtubaCategoryMapping(
  items: readonly StoreNormalizedCatalogItem[]
): StoreNormalizedCatalogItem[] {
  return items.map((item) => ({
    ...item,
    category: mapProviderCategoryToUmtuba(item.category).slug,
  }));
}

export function mockNoResellProvider(): StoreProvider {
  const base = mockProviderA();
  return {
    ...base,
    id: "aaaa1111-1111-4111-8111-aaaaaaaaaaa2",
    slug: "umtuba-mock-no-resell",
    displayName: "UMTUBA Mock No Resell Provider",
    mode: "RESELLER",
    rights: {
      ...base.rights,
      id: "aaaa1111-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
      providerId: "aaaa1111-1111-4111-8111-aaaaaaaaaaa2",
      grants: {
        CATALOG_DISPLAY_ALLOWED: true,
        IMAGE_USAGE_ALLOWED: true,
        RESELL_ALLOWED: false,
        CHECKOUT_ALLOWED: false,
      },
    },
  };
}
