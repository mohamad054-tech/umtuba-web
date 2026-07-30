/**
 * Server queries/actions for Marketplace Supplier→Seller Foundation V1.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { availableUnits } from "./inventory";
import {
  ADD_STORE_SELLER_LISTING_RPC,
  evaluateMarketplaceEligibility,
  filterMarketplaceDiscovery,
  listingDisplayTitle,
  sellerListingAttention,
  sellerListingPricingControl,
  type MarketplaceDiscoveryItem,
  type MarketplaceListingStatus,
  type SellerListingRow,
} from "./marketplaceSupplierSeller";
import { listingBuyerPdpPath } from "./marketplaceEligibility";
import { createAuthorizedProductMediaSignedUrl } from "./productMediaUrl";
import { canManageCatalog } from "./permissions";
import type { StoreMemberRole } from "./types";
import {
  mapDigitalPublishReadinessByProductId,
  resolveDigitalProductPublishReadiness,
  serviceRoleClientForDigitalReadiness,
} from "./digitalProductPublishReadiness";

type AnyClient = SupabaseClient;

export type MarketplaceActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; requiresAuth?: boolean };

function uuidOk(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function enrichPriceInventory(
  supabase: AnyClient,
  productId: string
): Promise<{
  priceMinor: number | null;
  compareAtMinor: number | null;
  currency: string | null;
  available: number | null;
  availabilityKnown: boolean;
  coverPath: string | null;
}> {
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("status", "active")
    .limit(1);

  const variantId = variants?.[0]?.id as string | undefined;
  let priceMinor: number | null = null;
  let compareAtMinor: number | null = null;
  let currency: string | null = null;
  let available: number | null = null;
  let availabilityKnown = false;

  if (variantId) {
    const { data: price } = await supabase
      .from("product_prices")
      .select("amount_minor, compare_at_amount_minor, currency")
      .eq("variant_id", variantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (price) {
      priceMinor = Number(price.amount_minor);
      currency = String(price.currency);
      const raw =
        price.compare_at_amount_minor == null
          ? null
          : Number(price.compare_at_amount_minor);
      compareAtMinor =
        raw != null && Number.isFinite(raw) && priceMinor != null && raw > priceMinor
          ? raw
          : null;
    }
    const { data: inv } = await supabase
      .from("product_inventory")
      .select("on_hand, reserved, safety_stock")
      .eq("variant_id", variantId)
      .eq("warehouse_key", "default")
      .maybeSingle();
    if (inv) {
      availabilityKnown = true;
      available = availableUnits({
        onHand: inv.on_hand,
        reserved: inv.reserved,
        safetyStock: inv.safety_stock,
      });
    }
  }

  const { data: media } = await supabase
    .from("product_media")
    .select("storage_path, role")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(5);
  const cover =
    (media ?? []).find((m) => m.role === "cover")?.storage_path ??
    (media ?? [])[0]?.storage_path ??
    null;

  return {
    priceMinor,
    compareAtMinor,
    currency,
    available,
    availabilityKnown,
    coverPath: cover ? String(cover) : null,
  };
}

export async function listMarketplaceDiscoveryForSeller(
  supabase: AnyClient,
  input: {
    sellerStoreId: string;
    query?: string;
    categoryName?: string | null;
    onlyAvailable?: boolean;
    sort?: "title_asc" | "price_asc" | "price_desc" | "newest";
  }
): Promise<MarketplaceActionResult<MarketplaceDiscoveryItem[]>> {
  if (!uuidOk(input.sellerStoreId)) {
    return { ok: false, message: "Store not found." };
  }

  const { data: products, error } = await supabase
    .from("store_products")
    .select(
      "id, title, slug, short_description, status, moderation_status, marketplace_eligible, product_type, store_id, primary_category_id, stores!inner(id, name, slug, status, verification_status, marketplace_supplier_enabled)"
    )
    .eq("marketplace_eligible", true)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .neq("store_id", input.sellerStoreId)
    .order("title", { ascending: true })
    .limit(100);

  if (error) {
    console.error("listMarketplaceDiscoveryForSeller", error);
    return { ok: false, message: "Unable to load marketplace products." };
  }

  const readinessAdmin = serviceRoleClientForDigitalReadiness();
  const readinessMap = readinessAdmin.ok
    ? await mapDigitalPublishReadinessByProductId(
        readinessAdmin.supabase,
        (products ?? []).map((row) => ({
          productId: String(row.id),
          storeId: String(row.store_id),
          productType: String(row.product_type ?? ""),
        }))
      )
    : new Map();

  const { data: existing } = await supabase
    .from("store_seller_listings")
    .select("id, source_product_id, status")
    .eq("seller_store_id", input.sellerStoreId);

  const listingByProduct = new Map(
    (existing ?? []).map((row) => [
      String(row.source_product_id),
      { id: String(row.id), status: String(row.status) as MarketplaceListingStatus },
    ])
  );

  const items: MarketplaceDiscoveryItem[] = [];
  for (const row of products ?? []) {
    const store = row.stores as unknown as {
      id: string;
      name: string;
      slug: string;
      status: string;
      verification_status: string;
      marketplace_supplier_enabled: boolean;
    };
    if (!store?.marketplace_supplier_enabled) continue;
    if (store.status !== "active" || store.verification_status !== "verified") {
      continue;
    }

    const productType = String(row.product_type ?? "");
    const digitalReady =
      readinessMap.get(String(row.id))?.ready === true || productType !== "digital";
    if (productType === "digital" && !digitalReady) {
      continue;
    }

    const offer = await enrichPriceInventory(supabase, String(row.id));
    const gate = evaluateMarketplaceEligibility({
      productStatus: String(row.status),
      moderationStatus: String(row.moderation_status),
      marketplaceEligible: Boolean(row.marketplace_eligible),
      supplierStoreStatus: store.status,
      supplierVerificationStatus: store.verification_status,
      marketplaceSupplierEnabled: Boolean(store.marketplace_supplier_enabled),
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: input.sellerStoreId,
      supplierStoreId: store.id,
      priceAmountMinor: offer.priceMinor,
      priceCurrency: offer.currency,
      productType,
      digitalPublishReady: digitalReady,
    });
    if (!gate.ok) continue;

    let coverUrl: string | null = null;
    if (offer.coverPath) {
      coverUrl = await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: offer.coverPath,
        productId: String(row.id),
        storeId: store.id,
        userId: null,
      });
    }

    const listing = listingByProduct.get(String(row.id)) ?? null;
    let categoryName: string | null = null;
    if (row.primary_category_id) {
      const { data: cat } = await supabase
        .from("product_categories")
        .select("name")
        .eq("id", row.primary_category_id)
        .maybeSingle();
      categoryName = cat?.name ? String(cat.name) : null;
    }

    items.push({
      productId: String(row.id),
      title: String(row.title),
      slug: String(row.slug),
      shortDescription: row.short_description
        ? String(row.short_description)
        : null,
      categoryName,
      coverUrl,
      coverPath: offer.coverPath,
      priceMinor: offer.priceMinor,
      compareAtMinor: offer.compareAtMinor,
      currency: offer.currency,
      available: offer.available,
      availabilityKnown: offer.availabilityKnown,
      marketplaceEligible: true,
      supplier: {
        storeId: store.id,
        name: store.name,
        slug: store.slug,
        status: store.status,
        verificationStatus: store.verification_status,
        marketplaceSupplierEnabled: true,
      },
      existingListingId: listing?.id ?? null,
      existingListingStatus: listing?.status ?? null,
    });
  }

  return {
    ok: true,
    data: filterMarketplaceDiscovery(items, {
      query: input.query,
      categoryName: input.categoryName,
      onlyAvailable: input.onlyAvailable,
      sort: input.sort,
    }),
  };
}

export async function addSupplierProductToMyStore(
  supabase: AnyClient,
  input: { sourceProductId: string; sellerStoreId?: string | null }
): Promise<
  MarketplaceActionResult<{ listingId: string; status: string; reused: boolean }>
> {
  if (!uuidOk(input.sourceProductId)) {
    return { ok: false, message: "Product is invalid." };
  }
  if (input.sellerStoreId && !uuidOk(input.sellerStoreId)) {
    return { ok: false, message: "Store not found." };
  }

  const { data, error } = await supabase.rpc(ADD_STORE_SELLER_LISTING_RPC, {
    p_source_product_id: input.sourceProductId,
    p_seller_store_id: input.sellerStoreId ?? null,
  });

  if (error) {
    const msg = error.message || "Unable to add product to your store.";
    if (/sign in|auth|jwt/i.test(msg)) {
      return { ok: false, message: "Sign in required.", requiresAuth: true };
    }
    return { ok: false, message: msg };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const listingId = String(payload.listing_id ?? "");
  if (!listingId) {
    return { ok: false, message: "Unexpected listing response." };
  }
  return {
    ok: true,
    data: {
      listingId,
      status: String(payload.status ?? "active"),
      reused: Boolean(payload.reused),
    },
  };
}

export async function listSellerStoreListings(
  supabase: AnyClient,
  sellerStoreId: string
): Promise<MarketplaceActionResult<SellerListingRow[]>> {
  if (!uuidOk(sellerStoreId)) {
    return { ok: false, message: "Store not found." };
  }

  const { data, error } = await supabase
    .from("store_seller_listings")
    .select(
      "id, seller_store_id, source_product_id, supplier_store_id, status, display_title_override, marketing_description, primary_category_id, inventory_owner_store_id, fulfillment_party_store_id, created_at, updated_at"
    )
    .eq("seller_store_id", sellerStoreId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("listSellerStoreListings", error);
    return { ok: false, message: "Unable to load seller listings." };
  }

  const rows: SellerListingRow[] = [];
  const { data: sellerStore } = await supabase
    .from("stores")
    .select("id, slug, status, verification_status")
    .eq("id", sellerStoreId)
    .maybeSingle();

  for (const row of data ?? []) {
    const { data: product } = await supabase
      .from("store_products")
      .select(
        "title, slug, status, moderation_status, marketplace_eligible, product_type, store_id"
      )
      .eq("id", row.source_product_id)
      .maybeSingle();
    const { data: supplier } = await supabase
      .from("stores")
      .select(
        "name, slug, status, verification_status, marketplace_supplier_enabled"
      )
      .eq("id", row.supplier_store_id)
      .maybeSingle();
    const offer = await enrichPriceInventory(
      supabase,
      String(row.source_product_id)
    );
    let coverUrl: string | null = null;
    if (offer.coverPath) {
      coverUrl = await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: offer.coverPath,
        productId: String(row.source_product_id),
        storeId: String(row.supplier_store_id),
        userId: null,
      });
    }

    const supplierEnabled = Boolean(supplier?.marketplace_supplier_enabled);
    const productEligible = Boolean(product?.marketplace_eligible);
    const productType = product ? String(product.product_type ?? "") : "";
    let digitalPublishReady = productType !== "digital";
    if (product && productType === "digital") {
      const readiness = await resolveDigitalProductPublishReadiness({
        productType,
        storeId: String(product.store_id ?? row.supplier_store_id),
        productId: String(row.source_product_id),
      });
      digitalPublishReady = readiness.ready;
    }

    let blockingReason: string | null = null;
    if (String(row.status) !== "active") {
      blockingReason = `Listing is ${String(row.status)}.`;
    } else if (!product) {
      blockingReason = "Source product is missing.";
    } else if (offer.priceMinor == null) {
      blockingReason = "Trusted price is unavailable.";
    } else {
      const gate = evaluateMarketplaceEligibility({
        productStatus: String(product.status),
        moderationStatus: String(product.moderation_status),
        marketplaceEligible: productEligible,
        supplierStoreStatus: String(supplier?.status ?? "inactive"),
        supplierVerificationStatus: String(
          supplier?.verification_status ?? "unverified"
        ),
        marketplaceSupplierEnabled: supplierEnabled,
        sellerStoreStatus: String(sellerStore?.status ?? "inactive"),
        sellerVerificationStatus: String(
          sellerStore?.verification_status ?? "unverified"
        ),
        sellerStoreId,
        supplierStoreId: String(row.supplier_store_id),
        priceAmountMinor: offer.priceMinor,
        priceCurrency: offer.currency,
        productType,
        digitalPublishReady,
      });
      if (!gate.ok) blockingReason = gate.message;
    }

    const buyerPdpAvailable =
      String(row.status) === "active" &&
      !blockingReason &&
      Boolean(sellerStore?.slug) &&
      Boolean(product?.slug);
    const buyerPdpPath =
      buyerPdpAvailable && sellerStore?.slug && product?.slug
        ? listingBuyerPdpPath({
            sellerStoreSlug: String(sellerStore.slug),
            productSlug: String(product.slug),
          })
        : null;

    rows.push({
      id: String(row.id),
      sellerStoreId: String(row.seller_store_id),
      sourceProductId: String(row.source_product_id),
      supplierStoreId: String(row.supplier_store_id),
      status: row.status as MarketplaceListingStatus,
      displayTitleOverride: row.display_title_override
        ? String(row.display_title_override)
        : null,
      marketingDescription: row.marketing_description
        ? String(row.marketing_description)
        : null,
      primaryCategoryId: row.primary_category_id
        ? String(row.primary_category_id)
        : null,
      inventoryOwnerStoreId: row.inventory_owner_store_id
        ? String(row.inventory_owner_store_id)
        : null,
      fulfillmentPartyStoreId: row.fulfillment_party_store_id
        ? String(row.fulfillment_party_store_id)
        : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      sourceTitle: product?.title ? String(product.title) : undefined,
      sourceSlug: product?.slug ? String(product.slug) : undefined,
      supplierName: supplier?.name ? String(supplier.name) : undefined,
      supplierSlug: supplier?.slug ? String(supplier.slug) : undefined,
      priceMinor: offer.priceMinor,
      currency: offer.currency,
      available: offer.available,
      availabilityKnown: offer.availabilityKnown,
      coverUrl,
      supplierMarketplaceEnabled: supplierEnabled,
      productMarketplaceEligible: productEligible,
      supplierStoreStatus: supplier?.status
        ? String(supplier.status)
        : undefined,
      buyerPdpAvailable,
      buyerPdpPath,
      blockingReason,
    });
  }

  return { ok: true, data: rows };
}

export async function updateSellerListingMerchandising(
  supabase: AnyClient,
  input: {
    listingId: string;
    sellerStoreId: string;
    role: StoreMemberRole | null | undefined;
    displayTitleOverride?: string | null;
    marketingDescription?: string | null;
    status?: MarketplaceListingStatus;
  }
): Promise<MarketplaceActionResult<{ listingId: string }>> {
  if (!canManageCatalog(input.role)) {
    return { ok: false, message: "Not allowed to manage listings." };
  }
  if (!uuidOk(input.listingId) || !uuidOk(input.sellerStoreId)) {
    return { ok: false, message: "Listing not found." };
  }

  const patch: Record<string, unknown> = {};
  if (input.displayTitleOverride !== undefined) {
    const t = (input.displayTitleOverride ?? "").trim();
    if (t.length > 200) {
      return { ok: false, message: "Display title is too long." };
    }
    patch.display_title_override = t || null;
  }
  if (input.marketingDescription !== undefined) {
    const d = (input.marketingDescription ?? "").trim();
    if (d.length > 5000) {
      return { ok: false, message: "Marketing description is too long." };
    }
    patch.marketing_description = d || null;
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "No listing changes provided." };
  }

  const { data, error } = await supabase
    .from("store_seller_listings")
    .update(patch)
    .eq("id", input.listingId)
    .eq("seller_store_id", input.sellerStoreId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Unable to update listing." };
  }
  return { ok: true, data: { listingId: String(data.id) } };
}

export async function getMarketplaceProductDetailForSeller(
  supabase: AnyClient,
  input: { productId: string; sellerStoreId: string }
): Promise<
  MarketplaceActionResult<{
    item: MarketplaceDiscoveryItem;
    pricing: ReturnType<typeof sellerListingPricingControl>;
  }>
> {
  const listed = await listMarketplaceDiscoveryForSeller(supabase, {
    sellerStoreId: input.sellerStoreId,
  });
  if (!listed.ok) return listed;
  const item = listed.data.find((row) => row.productId === input.productId);
  if (!item) {
    return { ok: false, message: "Product not found." };
  }
  return {
    ok: true,
    data: { item, pricing: sellerListingPricingControl() },
  };
}

export function summarizeSellerListingsForDashboard(listings: SellerListingRow[]) {
  return sellerListingAttention({
    listings: listings.map((l) => ({
      status: l.status,
      availabilityKnown: l.availabilityKnown,
      available: l.available,
      supplierStatus: undefined,
    })),
  });
}

/** Bounded counts of other sellers’ listings that reference this supplier store’s products. */
export async function countListingsReferencingSupplier(
  supabase: AnyClient,
  supplierStoreId: string
): Promise<{ active: number; hidden: number; archived: number }> {
  const empty = { active: 0, hidden: 0, archived: 0 };
  if (!uuidOk(supplierStoreId)) return empty;
  const { data, error } = await supabase
    .from("store_seller_listings")
    .select("status")
    .eq("supplier_store_id", supplierStoreId)
    .limit(500);
  if (error || !data) return empty;
  for (const row of data) {
    const status = String(row.status);
    if (status === "active") empty.active += 1;
    else if (status === "hidden") empty.hidden += 1;
    else if (status === "archived") empty.archived += 1;
  }
  return empty;
}

export async function countActiveListingsForProduct(
  supabase: AnyClient,
  productId: string
): Promise<number> {
  if (!uuidOk(productId)) return 0;
  const { count, error } = await supabase
    .from("store_seller_listings")
    .select("id", { count: "exact", head: true })
    .eq("source_product_id", productId)
    .eq("status", "active");
  if (error) return 0;
  return count ?? 0;
}

export { listingDisplayTitle, sellerListingPricingControl };
