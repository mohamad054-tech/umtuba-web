import type { SupabaseClient } from "@supabase/supabase-js";
import { availableUnits } from "./inventory";
import { isPubliclyVisibleProduct } from "./permissions";
import { createAuthorizedProductMediaSignedUrl } from "./productMediaUrl";
import {
  isSandboxCategoryIdentity,
  isSandboxProductIdentity,
  isSandboxStoreIdentity,
  shouldHideSandboxFromStorefront,
} from "./sandboxCatalog";
import { isLegitimateCompareAt } from "./tradingContracts";
import type {
  ProductCategoryRow,
  ProductInventoryRow,
  ProductMediaRow,
  ProductPriceRow,
  ProductVariantRow,
  PublicCatalogItem,
  PublicProductDetail,
  StoreProductRow,
  StoreRow,
} from "./types";

type AnyClient = SupabaseClient;

export async function listActiveCategories(
  supabase: AnyClient
): Promise<ProductCategoryRow[]> {
  const { data } = await supabase
    .from("product_categories")
    .select("id, parent_id, slug, name, status, sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  const rows = (data ?? []) as ProductCategoryRow[];
  if (!shouldHideSandboxFromStorefront()) return rows;
  return rows.filter((category) => !isSandboxCategoryIdentity(category));
}

/**
 * Enrich a public product row (with its joined store) into a `PublicCatalogItem`
 * — cover media, active price, and available stock. Shared by catalog listing
 * and wishlist queries so visibility/price/inventory logic stays in one place.
 */
export async function enrichPublicCatalogRow(
  supabase: AnyClient,
  row: StoreProductRow & {
    stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
  }
): Promise<PublicCatalogItem> {
  const store = row.stores;

  const { data: media } = await supabase
    .from("product_media")
    .select("storage_path, role, status, sort_order")
    .eq("product_id", row.id)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .limit(8);

  const cover =
    (media ?? []).find((m) => m.role === "cover")?.storage_path ??
    (media ?? [])[0]?.storage_path ??
    null;

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", row.id)
    .eq("status", "active")
    .limit(1);

  let priceMinor: number | null = null;
  let compareAtMinor: number | null = null;
  let currency: string | null = null;
  let available: number | null = null;

  const variantId = variants?.[0]?.id;
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
      currency = price.currency;
      const compareRaw =
        price.compare_at_amount_minor == null
          ? null
          : Number(price.compare_at_amount_minor);
      compareAtMinor = isLegitimateCompareAt(priceMinor, compareRaw)
        ? compareRaw
        : null;
    }

    const { data: inv } = await supabase
      .from("product_inventory")
      .select("on_hand, reserved, safety_stock")
      .eq("variant_id", variantId)
      .eq("warehouse_key", "default")
      .maybeSingle();
    if (inv) {
      available = availableUnits({
        onHand: inv.on_hand,
        reserved: inv.reserved,
        safetyStock: inv.safety_stock,
      });
    }
  }

  const { stores: _stores, ...product } = row;
  const mediaStoreId = (product as StoreProductRow).store_id || store.id;
  const coverUrl = cover
    ? await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: cover,
        productId: row.id,
        storeId: mediaStoreId,
        userId: null,
      })
    : null;

  return {
    product: product as StoreProductRow,
    store,
    coverPath: cover,
    coverUrl,
    priceMinor,
    compareAtMinor,
    currency,
    available,
    sellerListingId: null,
    supplierStoreId: null,
    marketplaceSourceType: "owned",
  };
}

export async function listPublicCatalog(
  supabase: AnyClient,
  options?: {
    search?: string;
    categoryId?: string;
    storeSlug?: string;
    limit?: number;
  }
): Promise<{ items: PublicCatalogItem[]; error: string | null }> {
  const limit = Math.min(Math.max(options?.limit ?? 48, 1), 100);

  let query = supabase
    .from("store_products")
    .select(
      `
      *,
      stores!inner ( id, slug, name, logo_path, status )
    `
    )
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .eq("stores.status", "active")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) {
      query = query.or(`title.ilike.%${q}%,short_description.ilike.%${q}%`);
    }
  }

  if (options?.categoryId) {
    query = query.eq("primary_category_id", options.categoryId);
  }

  if (options?.storeSlug) {
    query = query.eq("stores.slug", options.storeSlug.toLowerCase());
  }

  const { data, error } = await query;
  if (error) {
    console.error("listPublicCatalog", error);
    return { items: [], error: "Unable to load catalog." };
  }

  const rows = (data ?? []) as Array<
    StoreProductRow & { stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status"> }
  >;

  const items: PublicCatalogItem[] = [];
  for (const row of rows) {
    if (
      !isPubliclyVisibleProduct({
        productStatus: row.status,
        moderationStatus: row.moderation_status,
        storeStatus: row.stores.status,
      })
    ) {
      continue;
    }

    if (
      shouldHideSandboxFromStorefront() &&
      (isSandboxStoreIdentity(row.stores) || isSandboxProductIdentity(row))
    ) {
      continue;
    }

    items.push(await enrichPublicCatalogRow(supabase, row));
  }

  // Supplier-sourced active listings appear on the seller storefront without
  // cloning products. Catalog card identity is the seller store; product truth
  // remains the supplier-owned row.
  if (options?.storeSlug) {
    const sellerStore = await getPublicStoreBySlug(supabase, options.storeSlug);
    if (sellerStore) {
      const { data: listings } = await supabase
        .from("store_seller_listings")
        .select("id, source_product_id, display_title_override, supplier_store_id")
        .eq("seller_store_id", sellerStore.id)
        .eq("status", "active")
        .limit(limit);

      const ownedIds = new Set(items.map((i) => i.product.id));
      for (const listing of listings ?? []) {
        const sourceId = String(listing.source_product_id);
        if (ownedIds.has(sourceId)) continue;
        const { data: product } = await supabase
          .from("store_products")
          .select("*")
          .eq("id", sourceId)
          .eq("status", "active")
          .eq("moderation_status", "approved")
          .maybeSingle();
        if (!product) continue;
        if (
          shouldHideSandboxFromStorefront() &&
          (isSandboxStoreIdentity(sellerStore) ||
            isSandboxProductIdentity(product as StoreProductRow))
        ) {
          continue;
        }

        const { data: allowed } = await supabase.rpc(
          "store_listing_allows_seller_sale",
          {
            p_seller_store_id: sellerStore.id,
            p_product_id: sourceId,
            p_listing_id: listing.id,
          }
        );
        if (allowed !== true) continue;

        const enriched = await enrichPublicCatalogRow(supabase, {
          ...(product as StoreProductRow),
          stores: {
            id: sellerStore.id,
            slug: sellerStore.slug,
            name: sellerStore.name,
            logo_path: sellerStore.logo_path,
            status: sellerStore.status,
          },
        });
        if (listing.display_title_override) {
          enriched.product = {
            ...enriched.product,
            title: String(listing.display_title_override),
          };
        }
        enriched.sellerListingId = String(listing.id);
        enriched.supplierStoreId = String(listing.supplier_store_id);
        enriched.marketplaceSourceType = "supplier_listing";
        items.push(enriched);
        ownedIds.add(sourceId);
      }
    }
  }

  return { items, error: null };
}

export async function getPublicStoreBySlug(
  supabase: AnyClient,
  storeSlug: string
): Promise<StoreRow | null> {
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", storeSlug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  const store = (data as StoreRow | null) ?? null;
  if (
    store &&
    shouldHideSandboxFromStorefront() &&
    isSandboxStoreIdentity(store)
  ) {
    return null;
  }
  return store;
}

export async function getPublicProductDetail(
  supabase: AnyClient,
  storeSlug: string,
  productSlug: string
): Promise<{ detail: PublicProductDetail | null; error: string | null }> {
  const store = await getPublicStoreBySlug(supabase, storeSlug);
  if (!store) {
    return { detail: null, error: null };
  }

  const slug = productSlug.toLowerCase();

  // Rule: owned product first (slug collision → seller-owned wins).
  const { data: ownedProduct, error: ownedError } = await supabase
    .from("store_products")
    .select("*")
    .eq("store_id", store.id)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (ownedError) {
    console.error("getPublicProductDetail owned", ownedError);
    return { detail: null, error: "Unable to load product." };
  }

  if (ownedProduct) {
    const productRow = ownedProduct as StoreProductRow;
    if (
      !isPubliclyVisibleProduct({
        productStatus: productRow.status,
        moderationStatus: productRow.moderation_status,
        storeStatus: store.status,
      })
    ) {
      return { detail: null, error: null };
    }
    if (
      shouldHideSandboxFromStorefront() &&
      isSandboxProductIdentity(productRow)
    ) {
      return { detail: null, error: null };
    }
    return buildPublicProductDetail(supabase, {
      store,
      productRow,
      marketplaceSourceType: "owned",
      sellerListingId: null,
      supplierStoreId: null,
      supplierStoreName: null,
      displayTitle: null,
    });
  }

  // Listing-backed: active listing on this seller store whose source product slug matches.
  const { data: listingCandidates, error: listingError } = await supabase
    .from("store_seller_listings")
    .select(
      "id, status, display_title_override, source_product_id, supplier_store_id"
    )
    .eq("seller_store_id", store.id)
    .eq("status", "active")
    .limit(50);

  if (listingError) {
    console.error("getPublicProductDetail listings", listingError);
    return { detail: null, error: "Unable to load product." };
  }

  let matched:
    | {
        listingId: string;
        displayTitle: string | null;
        product: StoreProductRow;
        supplierName: string | null;
      }
    | null = null;

  for (const listing of listingCandidates ?? []) {
    const { data: source } = await supabase
      .from("store_products")
      .select("*")
      .eq("id", listing.source_product_id)
      .eq("slug", slug)
      .eq("status", "active")
      .eq("moderation_status", "approved")
      .maybeSingle();
    if (!source) continue;
    if (
      shouldHideSandboxFromStorefront() &&
      isSandboxProductIdentity(source as StoreProductRow)
    ) {
      continue;
    }

    const { data: supplier } = await supabase
      .from("stores")
      .select("id, name, status, verification_status, marketplace_supplier_enabled")
      .eq("id", source.store_id)
      .maybeSingle();

    if (!supplier) continue;

    const { data: allowed } = await supabase.rpc(
      "store_listing_allows_seller_sale",
      {
        p_seller_store_id: store.id,
        p_product_id: source.id,
        p_listing_id: listing.id,
      }
    );

    if (allowed !== true) continue;

    if (matched) {
      // Ambiguous: two active listings map to same slug under this seller.
      return { detail: null, error: null };
    }
    matched = {
      listingId: String(listing.id),
      displayTitle: listing.display_title_override
        ? String(listing.display_title_override)
        : null,
      product: source as StoreProductRow,
      supplierName: supplier.name ? String(supplier.name) : null,
    };
  }

  if (!matched) {
    return { detail: null, error: null };
  }

  return buildPublicProductDetail(supabase, {
    store,
    productRow: matched.product,
    marketplaceSourceType: "supplier_listing",
    sellerListingId: matched.listingId,
    supplierStoreId: matched.product.store_id,
    supplierStoreName: matched.supplierName,
    displayTitle: matched.displayTitle,
  });
}

async function buildPublicProductDetail(
  supabase: AnyClient,
  input: {
    store: StoreRow;
    productRow: StoreProductRow;
    marketplaceSourceType: "owned" | "supplier_listing";
    sellerListingId: string | null;
    supplierStoreId: string | null;
    supplierStoreName: string | null;
    displayTitle: string | null;
  }
): Promise<{ detail: PublicProductDetail | null; error: string | null }> {
  const { store, productRow } = input;
  const mediaStoreId = productRow.store_id;

  const [{ data: variants }, { data: media }, { data: category }] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productRow.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase
        .from("product_media")
        .select("*")
        .eq("product_id", productRow.id)
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      productRow.primary_category_id
        ? supabase
            .from("product_categories")
            .select("id, parent_id, slug, name, status")
            .eq("id", productRow.primary_category_id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const variantRows = (variants ?? []) as ProductVariantRow[];
  const enriched = [];
  let hasTrustedPrice = false;
  for (const variant of variantRows) {
    const [{ data: price }, { data: inventory }] = await Promise.all([
      supabase
        .from("product_prices")
        .select("*")
        .eq("variant_id", variant.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("product_inventory")
        .select("*")
        .eq("variant_id", variant.id)
        .eq("warehouse_key", "default")
        .maybeSingle(),
    ]);

    const inv = (inventory as ProductInventoryRow | null) ?? null;
    if (price) hasTrustedPrice = true;
    enriched.push({
      variant: {
        ...variant,
        option_values:
          (variant.option_values as Record<string, string>) ?? {},
      },
      price: (price as ProductPriceRow | null) ?? null,
      inventory: inv,
      available: inv
        ? availableUnits({
            onHand: inv.on_hand,
            reserved: inv.reserved,
            safetyStock: inv.safety_stock,
          })
        : 0,
    });
  }

  const mediaRows = (media ?? []) as ProductMediaRow[];
  const mediaWithUrls = await Promise.all(
    mediaRows.map(async (row) => ({
      ...row,
      mediaUrl: await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: row.storage_path,
        productId: productRow.id,
        storeId: mediaStoreId,
        userId: null,
      }),
    }))
  );

  let purchaseAllowed = enriched.length > 0 && hasTrustedPrice;
  let purchaseBlockedReason: string | null = null;
  if (!hasTrustedPrice) {
    purchaseAllowed = false;
    purchaseBlockedReason = "Trusted selling price is unavailable.";
  } else if (enriched.every((v) => v.available <= 0 && !v.inventory?.allow_backorder)) {
    purchaseAllowed = false;
    purchaseBlockedReason = "This product is currently unavailable.";
  }
  if (input.marketplaceSourceType === "supplier_listing" && !input.sellerListingId) {
    purchaseAllowed = false;
    purchaseBlockedReason = "Marketplace listing is invalid.";
  }

  return {
    detail: {
      product: productRow,
      store,
      variants: enriched,
      media: mediaWithUrls,
      category: (category as ProductCategoryRow | null) ?? null,
      sellerListingId: input.sellerListingId,
      supplierStoreId: input.supplierStoreId,
      supplierStoreName: input.supplierStoreName,
      marketplaceSourceType: input.marketplaceSourceType,
      displayTitle: input.displayTitle,
      purchaseAllowed,
      purchaseBlockedReason,
    },
    error: null,
  };
}

/**
 * Resolve a product by id to its canonical slug PDP location.
 * Used by the `/store/products/[productId]` id-based redirect route
 * (e.g. links shared from Watch/wishlist that only carry a UUID).
 */
export async function getPublicProductById(
  supabase: AnyClient,
  productId: string
): Promise<{ storeSlug: string; productSlug: string } | null> {
  const { data, error } = await supabase
    .from("store_products")
    .select(
      `
      id,
      slug,
      status,
      moderation_status,
      stores!inner ( slug, status )
    `
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;

  const store = data.stores as unknown as { slug: string; status: string };
  if (
    !isPubliclyVisibleProduct({
      productStatus: data.status as string,
      moderationStatus: data.moderation_status as string,
      storeStatus: store.status,
    })
  ) {
    return null;
  }

  if (
    shouldHideSandboxFromStorefront() &&
    (isSandboxStoreIdentity(store) ||
      isSandboxProductIdentity({
        id: data.id as string,
        slug: data.slug as string,
      }))
  ) {
    return null;
  }

  return { storeSlug: store.slug, productSlug: data.slug as string };
}

/**
 * Resolve a store by id to its canonical slug profile location.
 * Used by the `/store/shops/[shopId]` id-based redirect route.
 */
export async function getPublicStoreById(
  supabase: AnyClient,
  storeId: string
): Promise<{ storeSlug: string } | null> {
  const { data } = await supabase
    .from("stores")
    .select("id, slug, status")
    .eq("id", storeId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  if (
    shouldHideSandboxFromStorefront() &&
    isSandboxStoreIdentity({
      id: data.id as string,
      slug: data.slug as string,
    })
  ) {
    return null;
  }
  return { storeSlug: data.slug as string };
}
