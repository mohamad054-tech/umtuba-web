import { UMTUBA_DEMO_PRODUCTS } from "../../store/demo/catalog";
import type { DemoProduct } from "../../store/demo/types";
import type { SandboxStoreActor, StoreCommerceMode } from "./types";

export const SANDBOX_STORE_ACTORS: readonly SandboxStoreActor[] = [
  { id: "demo-supplier-a", displayName: "Demo Supplier A", kind: "supplier", synthetic: true },
  { id: "demo-supplier-b", displayName: "Demo Supplier B", kind: "supplier", synthetic: true },
  {
    id: "demo-marketplace-seller-c",
    displayName: "Demo Marketplace Seller C",
    kind: "marketplace_seller",
    synthetic: true,
  },
];

const MODE_ROTATION: readonly StoreCommerceMode[] = [
  "UMTUBA_OWNED",
  "AFFILIATE",
  "CATALOG_API",
  "DROPSHIP",
  "WHOLESALE",
  "RESELLER",
  "MARKETPLACE_SELLER",
];

export type SandboxStoreListing = {
  product: DemoProduct;
  commerceMode: StoreCommerceMode;
  actorId: string;
  purchasableInProduction: false;
  realInventory: false;
  label: "DEMO";
};

function actorForMode(mode: StoreCommerceMode): string {
  if (mode === "MARKETPLACE_SELLER") return "demo-marketplace-seller-c";
  if (mode === "DROPSHIP" || mode === "WHOLESALE") return "demo-supplier-b";
  if (mode === "AFFILIATE" || mode === "CATALOG_API" || mode === "RESELLER") {
    return "demo-supplier-a";
  }
  return "demo-supplier-a";
}

export const SANDBOX_STORE_LISTINGS: readonly SandboxStoreListing[] =
  UMTUBA_DEMO_PRODUCTS.map((product, index) => {
    const commerceMode = MODE_ROTATION[index % MODE_ROTATION.length]!;
    return {
      product,
      commerceMode,
      actorId: actorForMode(commerceMode),
      purchasableInProduction: false,
      realInventory: false,
      label: "DEMO",
    };
  });

export function getSandboxListing(slug: string): SandboxStoreListing | undefined {
  return SANDBOX_STORE_LISTINGS.find(
    (listing) => listing.product.slug === slug || listing.product.id === slug
  );
}

export const SANDBOX_CART_LINES = SANDBOX_STORE_LISTINGS.slice(0, 3).map((listing) => ({
  productSlug: listing.product.slug,
  title: listing.product.title,
  quantity: 1,
  unitMinor: listing.product.variants[0]?.priceMinor ?? 0,
  currency: "USD" as const,
  variantTitle: listing.product.variants[0]?.title ?? "Default",
  commerceMode: listing.commerceMode,
}));

export const SANDBOX_SHIPPING_EXAMPLES = [
  { id: "sandbox-ship-standard", label: "Sandbox standard", amountMinor: 599, daysLabel: "DEMO · not a promise" },
  { id: "sandbox-ship-express", label: "Sandbox express", amountMinor: 1299, daysLabel: "DEMO · not a promise" },
] as const;

export const SANDBOX_DISCOUNT_EXAMPLES = [
  { id: "sandbox-save10", label: "SANDBOX-SAVE10", percent: 10, note: "Synthetic example. Not a live coupon." },
] as const;
