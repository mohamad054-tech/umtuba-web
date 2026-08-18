/**
 * Synthetic catalog state fixtures for Store QA.
 * Overlays — not live warehouse or pricing events.
 */

import { getUmtubaDemoProduct } from "./catalog";
import type { DemoProduct, DemoStockState, DemoVariant } from "./types";

export const DEMO_CATALOG_STATE_IDS = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "INVENTORY_CHANGED",
  "PRICE_CHANGED",
] as const;

export type DemoCatalogStateId = (typeof DEMO_CATALOG_STATE_IDS)[number];

export type DemoInventoryStateFixture = {
  id: Exclude<DemoCatalogStateId, "PRICE_CHANGED">;
  productSlug: string;
  variantId: string;
  variantSku: string;
  stockState: DemoStockState;
  onHand: number | null;
  previousOnHand?: number;
  currentOnHand?: number;
  note: string;
};

export type DemoPriceChangeFixture = {
  id: "PRICE_CHANGED";
  productSlug: string;
  previousPriceMinor: number;
  currentPriceMinor: number;
  currency: "USD";
  note: string;
};

function requireProduct(slug: string): DemoProduct {
  const product = getUmtubaDemoProduct(slug);
  if (!product) {
    throw new Error(`Demo catalog state fixture missing product ${slug}.`);
  }
  return product;
}

function requireVariant(product: DemoProduct, suffix: string): DemoVariant {
  const variant = product.variants.find((row) => row.id === `${product.slug}-${suffix}`);
  if (!variant) {
    throw new Error(`Demo catalog state fixture missing variant ${product.slug}-${suffix}.`);
  }
  return variant;
}

const mug = requireProduct("umtuba-demo-ceramic-mug");
const mugClay = requireVariant(mug, "clay");
const overshirt = requireProduct("umtuba-demo-canvas-overshirt");
const overshirtL = requireVariant(overshirt, "l");
const seatHook = requireProduct("umtuba-demo-seat-hook");
const seatHookChrome = requireVariant(seatHook, "chrome");
const earbuds = requireProduct("umtuba-demo-studio-earbuds");
const earbudsGraphite = requireVariant(earbuds, "graphite");
const bottle = requireProduct("umtuba-demo-water-bottle");

export const DEMO_INVENTORY_STATE_FIXTURES: readonly DemoInventoryStateFixture[] = [
  {
    id: "IN_STOCK",
    productSlug: mug.slug,
    variantId: mugClay.id,
    variantSku: mugClay.sku,
    stockState: "IN_STOCK",
    onHand: mugClay.onHand,
    note: "Synthetic in-stock example. Not a warehouse snapshot.",
  },
  {
    id: "LOW_STOCK",
    productSlug: overshirt.slug,
    variantId: overshirtL.id,
    variantSku: overshirtL.sku,
    stockState: "LOW_STOCK",
    onHand: overshirtL.onHand,
    note: "Synthetic low-stock example. Not a replenishment promise.",
  },
  {
    id: "OUT_OF_STOCK",
    productSlug: seatHook.slug,
    variantId: seatHookChrome.id,
    variantSku: seatHookChrome.sku,
    stockState: "OUT_OF_STOCK",
    onHand: seatHookChrome.onHand,
    note: "Synthetic out-of-stock example. Not a supplier delay claim.",
  },
  {
    id: "INVENTORY_CHANGED",
    productSlug: earbuds.slug,
    variantId: earbudsGraphite.id,
    variantSku: earbudsGraphite.sku,
    stockState: earbudsGraphite.stockState,
    onHand: earbudsGraphite.onHand,
    previousOnHand: 12,
    currentOnHand: earbudsGraphite.onHand ?? 0,
    note: "Synthetic inventory delta for QA. Not a live warehouse event.",
  },
];

export const DEMO_PRICE_CHANGE_FIXTURES: readonly DemoPriceChangeFixture[] = [
  {
    id: "PRICE_CHANGED",
    productSlug: bottle.slug,
    previousPriceMinor: 2499,
    currentPriceMinor: bottle.variants[0]?.priceMinor ?? 2199,
    currency: "USD",
    note: "Synthetic list-price correction. Not a promotion or discount.",
  },
];

export const DEMO_CATALOG_STATE_FIXTURES = {
  IN_STOCK: DEMO_INVENTORY_STATE_FIXTURES.find((row) => row.id === "IN_STOCK")!,
  LOW_STOCK: DEMO_INVENTORY_STATE_FIXTURES.find((row) => row.id === "LOW_STOCK")!,
  OUT_OF_STOCK: DEMO_INVENTORY_STATE_FIXTURES.find((row) => row.id === "OUT_OF_STOCK")!,
  INVENTORY_CHANGED: DEMO_INVENTORY_STATE_FIXTURES.find((row) => row.id === "INVENTORY_CHANGED")!,
  PRICE_CHANGED: DEMO_PRICE_CHANGE_FIXTURES[0]!,
} as const;
