import { UMTUBA_DEMO_PRODUCTS } from "../../store/demo/catalog";
import type { DemoProduct } from "../../store/demo/types";
import type { SandboxStoreActor, StoreCommerceMode } from "./types";

export const UMTUBA_DEMO_PLATFORM_ACTOR_ID = "umtuba-demo-platform" as const;

export const SANDBOX_STORE_ACTORS: readonly SandboxStoreActor[] = [
  { id: "umtuba-owned", displayName: "UMTUBA", kind: "platform", synthetic: true },
  { id: "demo-supplier-a", displayName: "Demo Supplier A", kind: "supplier", synthetic: true },
  { id: "demo-supplier-b", displayName: "Demo Supplier B", kind: "supplier", synthetic: true },
  {
    id: "demo-marketplace-seller-c",
    displayName: "Demo Marketplace Seller C",
    kind: "marketplace_seller",
    synthetic: true,
  },
];

const SYNTHETIC_MODE_ROTATION: readonly StoreCommerceMode[] = [
  "AFFILIATE",
  "CATALOG_API",
  "DROPSHIP",
  "WHOLESALE",
  "RESELLER",
  "MARKETPLACE_SELLER",
];

export type SandboxProviderOwnership = {
  productOwnerActorId: string;
  paymentOwner: "SANDBOX_MOCK";
  fulfillmentOwnerActorId: string;
  returnsOwnerActorId: string;
  customerSupportOwnerActorId: string;
  note: string;
};

export type SandboxStoreListing = {
  product: DemoProduct;
  commerceMode: StoreCommerceMode;
  actorId: string;
  ownership: SandboxProviderOwnership;
  purchasableInProduction: false;
  realInventory: false;
  label: "DEMO";
};

function actorForMode(mode: StoreCommerceMode): string {
  if (mode === "UMTUBA_OWNED") return "umtuba-owned";
  if (mode === "MARKETPLACE_SELLER") return "demo-marketplace-seller-c";
  if (mode === "DROPSHIP" || mode === "WHOLESALE") return "demo-supplier-b";
  if (mode === "AFFILIATE" || mode === "CATALOG_API" || mode === "RESELLER") {
    return "demo-supplier-a";
  }
  return "demo-supplier-a";
}

function ownershipFor(mode: StoreCommerceMode, actorId: string): SandboxProviderOwnership {
  if (mode === "UMTUBA_OWNED") {
    return {
      productOwnerActorId: UMTUBA_DEMO_PLATFORM_ACTOR_ID,
      paymentOwner: "SANDBOX_MOCK",
      fulfillmentOwnerActorId: UMTUBA_DEMO_PLATFORM_ACTOR_ID,
      returnsOwnerActorId: UMTUBA_DEMO_PLATFORM_ACTOR_ID,
      customerSupportOwnerActorId: UMTUBA_DEMO_PLATFORM_ACTOR_ID,
      note: "DEMO ownership map for UMTUBA_OWNED. Not a live operating model.",
    };
  }
  return {
    productOwnerActorId: actorId,
    paymentOwner: "SANDBOX_MOCK",
    fulfillmentOwnerActorId: actorId,
    returnsOwnerActorId: actorId,
    customerSupportOwnerActorId: actorId,
    note: "DEMO ownership map for a synthetic supplier/seller. Not a live operating model.",
  };
}

function listingFor(product: DemoProduct, commerceMode: StoreCommerceMode): SandboxStoreListing {
  const actorId = actorForMode(commerceMode);
  return {
    product,
    commerceMode,
    actorId,
    ownership: ownershipFor(commerceMode, actorId),
    purchasableInProduction: false,
    realInventory: false,
    label: "DEMO",
  };
}

export const SANDBOX_STORE_LISTINGS: readonly SandboxStoreListing[] = (() => {
  let syntheticCursor = 0;
  return UMTUBA_DEMO_PRODUCTS.map((product) => {
    if (product.conceptKind === "UMTUBA_OWNED_FUTURE") {
      return listingFor(product, "UMTUBA_OWNED");
    }
    const commerceMode = SYNTHETIC_MODE_ROTATION[syntheticCursor % SYNTHETIC_MODE_ROTATION.length]!;
    syntheticCursor += 1;
    return listingFor(product, commerceMode);
  });
})();

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
