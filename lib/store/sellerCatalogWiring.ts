/**
 * Seller Catalog Wiring V1 — load real catalog facts for Seller Experience.
 * No new domain system. No migrations. Does not mutate inventory/shipping engines.
 */

import { isFiniteInventoryProductType } from "./sellerInventoryAvailabilityFoundation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";
import type { SellerProductHealthFacts } from "./sellerExperienceFoundation";
import type { StoreProductRow, StoreRow } from "./types";

export const SELLER_CATALOG_WIRING_ID =
  "commerce.seller.catalog_wiring_v1" as const;

type AnyClient = {
  from: (table: string) => any;
};

function hasPhysicalMetadata(product: StoreProductRow): boolean {
  const weight = product.weight_grams;
  const dims =
    product.length_mm != null &&
    product.width_mm != null &&
    product.height_mm != null;
  const shippingFlag =
    product.shipping_required === true || product.shippable === true;
  const packageWeight = product.package_weight_grams != null;
  return (
    (typeof weight === "number" && weight >= 0) ||
    Boolean(dims) ||
    shippingFlag ||
    packageWeight
  );
}

/**
 * Batch-load media / price / digital-asset presence for seller products.
 * Inventory presence is derived from already-loaded seller inventory rows.
 */
export async function loadSellerCatalogHealthFacts(
  supabase: AnyClient,
  input: {
    storeId: string;
    products: StoreProductRow[];
    inventoryRows?: SellerInventoryRow[] | null;
  }
): Promise<SellerProductHealthFacts[]> {
  const products = input.products;
  if (!products.length) return [];

  const productIds = products.map((p) => p.id);

  const inventoryByProduct = new Map<string, boolean>();
  for (const row of input.inventoryRows ?? []) {
    const hasRow = !row.missingInventory && row.inventoryId != null;
    const prev = inventoryByProduct.get(row.productId);
    inventoryByProduct.set(row.productId, Boolean(prev) || hasRow);
  }

  const [{ data: mediaRows }, { data: variantRows }] = await Promise.all([
    supabase
      .from("product_media")
      .select("product_id, status")
      .in("product_id", productIds)
      .eq("status", "active"),
    supabase
      .from("product_variants")
      .select("id, product_id, status")
      .in("product_id", productIds),
  ]);

  const productsWithImages = new Set<string>();
  for (const row of (mediaRows ?? []) as Array<{ product_id: string }>) {
    if (row?.product_id) productsWithImages.add(String(row.product_id));
  }

  const variants = (variantRows ?? []) as Array<{
    id: string;
    product_id: string;
    status: string;
  }>;
  const variantIds = variants.map((v) => v.id);
  const variantToProduct = new Map(
    variants.map((v) => [v.id, v.product_id] as const)
  );

  const productsWithPricing = new Set<string>();
  if (variantIds.length) {
    const { data: priceRows } = await supabase
      .from("product_prices")
      .select("variant_id, status, amount_minor")
      .in("variant_id", variantIds)
      .eq("status", "active");
    for (const row of (priceRows ?? []) as Array<{
      variant_id: string;
      amount_minor: number;
    }>) {
      const productId = variantToProduct.get(String(row.variant_id));
      if (productId && Number(row.amount_minor) >= 0) {
        productsWithPricing.add(String(productId));
      }
    }
  }

  const digitalProductIds = products
    .filter((p) => p.product_type === "digital")
    .map((p) => p.id);
  const productsWithDigitalAsset = new Set<string>();
  if (digitalProductIds.length) {
    const { data: assetRows } = await supabase
      .from("store_digital_product_assets")
      .select("product_id, status")
      .eq("store_id", input.storeId)
      .in("product_id", digitalProductIds)
      .eq("status", "active");
    for (const row of (assetRows ?? []) as Array<{ product_id: string }>) {
      if (row?.product_id) productsWithDigitalAsset.add(String(row.product_id));
    }
  }

  return products.map((product) => {
    const facts: SellerProductHealthFacts = {
      product,
      hasImages: productsWithImages.has(product.id),
      hasPricing: productsWithPricing.has(product.id),
    };

    if (isFiniteInventoryProductType(product.product_type)) {
      facts.inventoryRequired = true;
      if (input.inventoryRows) {
        facts.hasInventoryRow = inventoryByProduct.get(product.id) === true;
      }
    }

    if (product.product_type === "digital") {
      facts.hasDigitalAsset = productsWithDigitalAsset.has(product.id);
    }

    if (product.product_type === "physical") {
      facts.hasPhysicalMetadata = hasPhysicalMetadata(product);
    }

    return facts;
  });
}

export function deriveSellerProfileComplete(store: Pick<
  StoreRow,
  "name" | "slug" | "status" | "verification_status"
>): boolean {
  return (
    Boolean(store.name?.trim()) &&
    Boolean(store.slug?.trim()) &&
    store.status === "active" &&
    store.verification_status === "verified"
  );
}

/**
 * Use existing payout eligibility surface when present — do not invent payout state.
 */
export function deriveSellerPayoutConfiguredFromEligibility(input: {
  payoutEligibility:
    | {
        overallState?: string;
        balanceVisibilityAvailable?: boolean;
        unavailable?: boolean;
        unauthorized?: boolean;
        eligibility?: unknown;
      }
    | null
    | undefined;
}): boolean | null {
  if (!input.payoutEligibility) return null;
  if (
    input.payoutEligibility.unavailable ||
    input.payoutEligibility.unauthorized ||
    input.payoutEligibility.overallState === "unavailable" ||
    input.payoutEligibility.overallState === "unauthorized"
  ) {
    return null;
  }
  if (typeof input.payoutEligibility.balanceVisibilityAvailable === "boolean") {
    return input.payoutEligibility.balanceVisibilityAvailable;
  }
  return input.payoutEligibility.eligibility != null;
}
