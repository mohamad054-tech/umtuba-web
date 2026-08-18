import { DEMO_CATEGORY_SLUGS, type DemoCategorySlug, type DemoProduct } from "../../store/demo/types";
import { SANDBOX_STORE_ACTORS, SANDBOX_STORE_LISTINGS, type SandboxStoreListing } from "../fixtures/store";
import type { SandboxStoreActor, StoreCommerceMode } from "../fixtures/types";
import { artForProduct } from "./art";

export type StockKind = "digital" | "physical";

export type StoreListingView = SandboxStoreListing & {
  actor: SandboxStoreActor;
  stockKind: StockKind;
  shopperDescription: string;
  art: ReturnType<typeof artForProduct>;
};

export const STORE_CATEGORY_SLUGS = DEMO_CATEGORY_SLUGS;

export function stockKindFor(product: DemoProduct): StockKind {
  return product.productType === "digital" ? "digital" : "physical";
}

export function shopperDescriptionFor(product: DemoProduct): string {
  return product.shortDescription;
}

export function actorById(actorId: string): SandboxStoreActor | undefined {
  return SANDBOX_STORE_ACTORS.find((actor) => actor.id === actorId);
}

export function toListingView(listing: SandboxStoreListing): StoreListingView {
  const actor = actorById(listing.actorId);
  if (!actor) {
    throw new Error(`Sandbox listing ${listing.product.slug} has unknown actor ${listing.actorId}`);
  }
  return {
    ...listing,
    actor,
    stockKind: stockKindFor(listing.product),
    shopperDescription: shopperDescriptionFor(listing.product),
    art: artForProduct(listing.product),
  };
}

export const STORE_LISTING_VIEWS: readonly StoreListingView[] =
  SANDBOX_STORE_LISTINGS.map(toListingView);

export function getStoreListingView(slug: string): StoreListingView | undefined {
  return STORE_LISTING_VIEWS.find(
    (listing) => listing.product.slug === slug || listing.product.id === slug
  );
}

export function listingsForActor(actorId: string): readonly StoreListingView[] {
  return STORE_LISTING_VIEWS.filter((listing) => listing.actorId === actorId);
}

export function listingsForMode(mode: StoreCommerceMode): readonly StoreListingView[] {
  return STORE_LISTING_VIEWS.filter((listing) => listing.commerceMode === mode);
}

export function displayOnHand(listing: StoreListingView, variantId?: string): number | null {
  if (listing.stockKind === "digital") return null;
  const variant =
    listing.product.variants.find((row) => row.id === variantId) ?? listing.product.variants[0];
  return variant?.onHand ?? 0;
}

export function categoryLabel(slug: DemoCategorySlug): string {
  return slug.replaceAll("-", " ");
}

export const PROVIDER_MODEL_NOTES: Record<
  StoreCommerceMode,
  { owner: string; rights: string; fulfillment: string }
> = {
  UMTUBA_OWNED: {
    owner: "UMTUBA first-party concept",
    rights: "DEMO_ONLY · owned concept · still non-purchasable in production",
    fulfillment: "Sandbox fulfillment preview only",
  },
  AFFILIATE: {
    owner: "Demo Supplier A (synthetic)",
    rights: "UNKNOWN third-party rights = DENY · prospective brands stay PROSPECTIVE",
    fulfillment: "Referral preview · no outbound partner call",
  },
  CATALOG_API: {
    owner: "Demo Supplier A (synthetic)",
    rights: "Catalog display is a sandbox label · no imported partner feed",
    fulfillment: "No live catalog API",
  },
  DROPSHIP: {
    owner: "Demo Supplier B (synthetic)",
    rights: "DEMO_ONLY · no real supplier purchase order",
    fulfillment: "Split preview only · no warehouse mutation",
  },
  WHOLESALE: {
    owner: "Demo Supplier B (synthetic)",
    rights: "DEMO_ONLY · no wholesale contract",
    fulfillment: "Case-pack preview · no real inventory",
  },
  RESELLER: {
    owner: "Demo Supplier A (synthetic)",
    rights: "RESELL_ALLOWED is UNKNOWN → DENY for prospective names",
    fulfillment: "Reseller label only",
  },
  MARKETPLACE_SELLER: {
    owner: "Demo Marketplace Seller C (synthetic)",
    rights: "Seller workspace is sandbox-only · payout OFF",
    fulfillment: "Seller ships in preview copy only",
  },
};
