import type { SupabaseClient } from "@supabase/supabase-js";
import { availableUnits } from "./inventory";
import { isPubliclyVisibleProduct } from "./permissions";
import { createAuthorizedProductMediaSignedUrl } from "./productMediaUrl";
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

type CatalogStorePick = Pick<
  StoreRow,
  "id" | "slug" | "name" | "logo_path" | "status"
>;

type CatalogProductRow = StoreProductRow & { stores: CatalogStorePick };

/** Explicit public catalog product columns — avoids SELECT * on storefront paths. */
export const STORE_PRODUCT_PUBLIC_COLUMNS = [
  "id",
  "store_id",
  "slug",
  "title",
  "short_description",
  "description",
  "product_type",
  "status",
  "moderation_status",
  "primary_category_id",
  "brand_id",
  "created_by",
  "created_at",
  "updated_at",
  "published_at",
  "review_note",
  "reviewed_at",
  "item_type",
  "weight_grams",
  "length_mm",
  "width_mm",
  "height_mm",
  "origin_country_code",
  "marketplace_eligible",
].join(", ");

const STORE_PUBLIC_COLUMNS = [
  "id",
  "owner_user_id",
  "slug",
  "name",
  "description",
  "logo_path",
  "cover_path",
  "status",
  "verification_status",
  "default_currency",
  "country_code",
  "city",
  "public_contact_email",
  "public_contact_phone",
  "public_contact_url",
  "store_template",
  "tagline",
  "return_policy",
  "shipping_policy",
  "privacy_policy",
  "marketplace_supplier_enabled",
  "created_at",
  "updated_at",
].join(", ");

const VARIANT_PUBLIC_COLUMNS =
  "id, product_id, sku, title, option_values, status, created_at, updated_at";

const MEDIA_PUBLIC_COLUMNS =
  "id, product_id, variant_id, media_type, storage_path, alt_text, sort_order, role, status";

const PRICE_PUBLIC_COLUMNS =
  "id, variant_id, currency, amount_minor, compare_at_amount_minor, country_code, starts_at, ends_at, status, created_at";

const INVENTORY_PUBLIC_COLUMNS =
  "id, variant_id, warehouse_key, on_hand, reserved, safety_stock, allow_backorder";

export async function listActiveCategories(
  supabase: AnyClient
): Promise<ProductCategoryRow[]> {
  const { data } = await supabase
    .from("product_categories")
    .select("id, parent_id, slug, name, status, sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as ProductCategoryRow[];
}

/**
 * Enrich a public product row (with its joined store) into a `PublicCatalogItem`
 * — cover media, active price, and available stock. Shared by catalog listing
 * and wishlist queries so visibility/price/inventory logic stays in one place.
 */
export async function enrichPublicCatalogRow(
  supabase: AnyClient,
  row: CatalogProductRow
): Promise<PublicCatalogItem> {
  const [item] = await enrichPublicCatalogRows(supabase, [row]);
  return item;
}

/**
 * Batch catalog enrichment — replaces per-row N+1 media/variant/price/inventory
 * round-trips with a fixed number of queries + parallel signed URL mints.
 */
export async function enrichPublicCatalogRows(
  supabase: AnyClient,
  rows: CatalogProductRow[]
): Promise<PublicCatalogItem[]> {
  if (rows.length === 0) return [];

  const productIds = rows.map((row) => row.id);

  const [{ data: mediaRows }, { data: variantRows }] = await Promise.all([
    supabase
      .from("product_media")
      .select("product_id, storage_path, role, status, sort_order")
      .in("product_id", productIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, product_id, created_at")
      .in("product_id", productIds)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  const mediaByProduct = new Map<
    string,
    Array<{ storage_path: string; role: string; sort_order: number }>
  >();
  for (const row of mediaRows ?? []) {
    const productId = String(row.product_id);
    const list = mediaByProduct.get(productId) ?? [];
    list.push({
      storage_path: String(row.storage_path),
      role: String(row.role),
      sort_order: Number(row.sort_order ?? 0),
    });
    mediaByProduct.set(productId, list);
  }

  const variantIdByProduct = new Map<string, string>();
  for (const row of variantRows ?? []) {
    const productId = String(row.product_id);
    if (variantIdByProduct.has(productId)) continue;
    variantIdByProduct.set(productId, String(row.id));
  }

  const variantIds = Array.from(new Set(variantIdByProduct.values()));
  let priceByVariant = new Map<
    string,
    {
      amount_minor: number;
      compare_at_amount_minor: number | null;
      currency: string;
      created_at: string;
    }
  >();
  let inventoryByVariant = new Map<
    string,
    { on_hand: number; reserved: number; safety_stock: number }
  >();

  if (variantIds.length > 0) {
    const [{ data: prices }, { data: inventories }] = await Promise.all([
      supabase
        .from("product_prices")
        .select(
          "variant_id, amount_minor, compare_at_amount_minor, currency, created_at"
        )
        .in("variant_id", variantIds)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("product_inventory")
        .select("variant_id, on_hand, reserved, safety_stock")
        .in("variant_id", variantIds)
        .eq("warehouse_key", "default"),
    ]);

    priceByVariant = new Map();
    for (const price of prices ?? []) {
      const variantId = String(price.variant_id);
      if (priceByVariant.has(variantId)) continue;
      priceByVariant.set(variantId, {
        amount_minor: Number(price.amount_minor),
        compare_at_amount_minor:
          price.compare_at_amount_minor == null
            ? null
            : Number(price.compare_at_amount_minor),
        currency: String(price.currency),
        created_at: String(price.created_at ?? ""),
      });
    }

    inventoryByVariant = new Map();
    for (const inv of inventories ?? []) {
      inventoryByVariant.set(String(inv.variant_id), {
        on_hand: Number(inv.on_hand),
        reserved: Number(inv.reserved),
        safety_stock: Number(inv.safety_stock),
      });
    }
  }

  const coverByProduct = new Map<string, string | null>();
  for (const row of rows) {
    const media = mediaByProduct.get(row.id) ?? [];
    const cover =
      media.find((m) => m.role === "cover")?.storage_path ??
      media[0]?.storage_path ??
      null;
    coverByProduct.set(row.id, cover);
  }

  const coverUrls = await Promise.all(
    rows.map(async (row) => {
      const cover = coverByProduct.get(row.id) ?? null;
      if (!cover) return null;
      const mediaStoreId = row.store_id || row.stores.id;
      return createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: cover,
        productId: row.id,
        storeId: mediaStoreId,
        userId: null,
      });
    })
  );

  return rows.map((row, index) => {
    const store = row.stores;
    const cover = coverByProduct.get(row.id) ?? null;
    const variantId = variantIdByProduct.get(row.id);
    let priceMinor: number | null = null;
    let compareAtMinor: number | null = null;
    let currency: string | null = null;
    let available: number | null = null;

    if (variantId) {
      const price = priceByVariant.get(variantId);
      if (price) {
        priceMinor = price.amount_minor;
        currency = price.currency;
        compareAtMinor = isLegitimateCompareAt(
          priceMinor,
          price.compare_at_amount_minor
        )
          ? price.compare_at_amount_minor
          : null;
      }
      const inv = inventoryByVariant.get(variantId);
      if (inv) {
        available = availableUnits({
          onHand: inv.on_hand,
          reserved: inv.reserved,
          safetyStock: inv.safety_stock,
        });
      }
    }

    const { stores: _stores, ...product } = row;
    return {
      product: product as StoreProductRow,
      store,
      coverPath: cover,
      coverUrl: coverUrls[index] ?? null,
      priceMinor,
      compareAtMinor,
      currency,
      available,
      sellerListingId: null,
      supplierStoreId: null,
      marketplaceSourceType: "owned" as const,
    };
  });
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
      `${STORE_PRODUCT_PUBLIC_COLUMNS}, stores!inner ( id, slug, name, logo_path, status )` as "id"
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

  const rows = (data as unknown as CatalogProductRow[] | null) ?? [];
  const visibleRows = rows.filter((row) =>
    isPubliclyVisibleProduct({
      productStatus: row.status,
      moderationStatus: row.moderation_status,
      storeStatus: row.stores.status,
    })
  );

  const items = await enrichPublicCatalogRows(supabase, visibleRows);

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
      const candidateListings = (listings ?? []).filter((listing) => {
        const sourceId = String(listing.source_product_id);
        return !ownedIds.has(sourceId);
      });

      if (candidateListings.length > 0) {
        const sourceIds = Array.from(
          new Set(candidateListings.map((l) => String(l.source_product_id)))
        );

        const { data: products } = await supabase
          .from("store_products")
          .select(STORE_PRODUCT_PUBLIC_COLUMNS as "id")
          .in("id", sourceIds)
          .eq("status", "active")
          .eq("moderation_status", "approved");

        const productById = new Map(
          ((products as unknown as StoreProductRow[] | null) ?? []).map((p) => [
            String(p.id),
            p,
          ])
        );

        const allowedFlags = await Promise.all(
          candidateListings.map(async (listing) => {
            const sourceId = String(listing.source_product_id);
            if (!productById.has(sourceId)) return false;
            const { data: allowed } = await supabase.rpc(
              "store_listing_allows_seller_sale",
              {
                p_seller_store_id: sellerStore.id,
                p_product_id: sourceId,
                p_listing_id: listing.id,
              }
            );
            return allowed === true;
          })
        );

        const listingRows: CatalogProductRow[] = [];
        const listingMeta: Array<{
          listingId: string;
          supplierStoreId: string;
          displayTitle: string | null;
        }> = [];

        candidateListings.forEach((listing, index) => {
          if (!allowedFlags[index]) return;
          const sourceId = String(listing.source_product_id);
          const product = productById.get(sourceId);
          if (!product) return;
          listingRows.push({
            ...product,
            stores: {
              id: sellerStore.id,
              slug: sellerStore.slug,
              name: sellerStore.name,
              logo_path: sellerStore.logo_path,
              status: sellerStore.status,
            },
          });
          listingMeta.push({
            listingId: String(listing.id),
            supplierStoreId: String(listing.supplier_store_id),
            displayTitle: listing.display_title_override
              ? String(listing.display_title_override)
              : null,
          });
        });

        const listingItems = await enrichPublicCatalogRows(
          supabase,
          listingRows
        );
        listingItems.forEach((enriched, index) => {
          const meta = listingMeta[index];
          if (meta.displayTitle) {
            enriched.product = {
              ...enriched.product,
              title: meta.displayTitle,
            };
          }
          enriched.sellerListingId = meta.listingId;
          enriched.supplierStoreId = meta.supplierStoreId;
          enriched.marketplaceSourceType = "supplier_listing";
          items.push(enriched);
          ownedIds.add(enriched.product.id);
        });
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
    .select(STORE_PUBLIC_COLUMNS as "id")
    .eq("slug", storeSlug.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  return (data as unknown as StoreRow | null) ?? null;
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
    .select(STORE_PRODUCT_PUBLIC_COLUMNS as "id")
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
    const productRow = ownedProduct as unknown as StoreProductRow;
    if (
      !isPubliclyVisibleProduct({
        productStatus: productRow.status,
        moderationStatus: productRow.moderation_status,
        storeStatus: store.status,
      })
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

  const candidates = listingCandidates ?? [];
  if (candidates.length === 0) {
    return { detail: null, error: null };
  }

  const sourceIds = Array.from(
    new Set(candidates.map((listing) => String(listing.source_product_id)))
  );

  const { data: sourceProducts } = await supabase
    .from("store_products")
    .select(STORE_PRODUCT_PUBLIC_COLUMNS as "id")
    .in("id", sourceIds)
    .eq("slug", slug)
    .eq("status", "active")
    .eq("moderation_status", "approved");

  const productById = new Map(
    ((sourceProducts as unknown as StoreProductRow[] | null) ?? []).map((p) => [
      String(p.id),
      p,
    ])
  );

  const slugMatches = candidates.filter((listing) =>
    productById.has(String(listing.source_product_id))
  );
  if (slugMatches.length === 0) {
    return { detail: null, error: null };
  }

  const supplierIds = Array.from(
    new Set(
      slugMatches
        .map((listing) => productById.get(String(listing.source_product_id))!)
        .map((product) => String(product.store_id))
    )
  );

  const { data: suppliers } = await supabase
    .from("stores")
    .select("id, name, status, verification_status, marketplace_supplier_enabled")
    .in("id", supplierIds);

  const supplierById = new Map(
    (suppliers ?? []).map((s) => [String(s.id), s])
  );

  const allowedFlags = await Promise.all(
    slugMatches.map(async (listing) => {
      const source = productById.get(String(listing.source_product_id))!;
      const supplier = supplierById.get(String(source.store_id));
      if (!supplier) return false;
      const { data: allowed } = await supabase.rpc(
        "store_listing_allows_seller_sale",
        {
          p_seller_store_id: store.id,
          p_product_id: source.id,
          p_listing_id: listing.id,
        }
      );
      return allowed === true;
    })
  );

  let matched:
    | {
        listingId: string;
        displayTitle: string | null;
        product: StoreProductRow;
        supplierName: string | null;
      }
    | null = null;

  for (let i = 0; i < slugMatches.length; i++) {
    if (!allowedFlags[i]) continue;
    const listing = slugMatches[i];
    const source = productById.get(String(listing.source_product_id))!;
    const supplier = supplierById.get(String(source.store_id));
    if (!supplier) continue;

    if (matched) {
      // Ambiguous: two active listings map to same slug under this seller.
      return { detail: null, error: null };
    }
    matched = {
      listingId: String(listing.id),
      displayTitle: listing.display_title_override
        ? String(listing.display_title_override)
        : null,
      product: source,
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
        .select(VARIANT_PUBLIC_COLUMNS as "id")
        .eq("product_id", productRow.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      supabase
        .from("product_media")
        .select(MEDIA_PUBLIC_COLUMNS as "id")
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

  const variantRows =
    (variants as unknown as ProductVariantRow[] | null) ?? [];
  const variantIds = variantRows.map((v) => v.id);

  let priceByVariant = new Map<string, ProductPriceRow>();
  let inventoryByVariant = new Map<string, ProductInventoryRow>();

  if (variantIds.length > 0) {
    const [{ data: prices }, { data: inventories }] = await Promise.all([
      supabase
        .from("product_prices")
        .select(PRICE_PUBLIC_COLUMNS as "id")
        .in("variant_id", variantIds)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("product_inventory")
        .select(INVENTORY_PUBLIC_COLUMNS as "id")
        .in("variant_id", variantIds)
        .eq("warehouse_key", "default"),
    ]);

    for (const price of (prices as unknown as ProductPriceRow[] | null) ??
      []) {
      const variantId = String(price.variant_id);
      if (priceByVariant.has(variantId)) continue;
      priceByVariant.set(variantId, price);
    }
    for (const inv of (inventories as unknown as ProductInventoryRow[] | null) ??
      []) {
      inventoryByVariant.set(String(inv.variant_id), inv);
    }
  }

  const enriched = [];
  let hasTrustedPrice = false;
  for (const variant of variantRows) {
    const price = priceByVariant.get(variant.id) ?? null;
    const inv = inventoryByVariant.get(variant.id) ?? null;
    if (price) hasTrustedPrice = true;
    enriched.push({
      variant: {
        ...variant,
        option_values:
          (variant.option_values as Record<string, string>) ?? {},
      },
      price,
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

  const mediaRows = (media as unknown as ProductMediaRow[] | null) ?? [];
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
 *
 * When `sellerListingId` is provided, resolve the **seller storefront** for
 * that listing (fail closed — never silently fall back to the owner store).
 */
export async function getPublicProductById(
  supabase: AnyClient,
  productId: string,
  options?: { sellerListingId?: string | null }
): Promise<{
  storeSlug: string;
  productSlug: string;
  sellerListingId: string | null;
} | null> {
  const listingId =
    typeof options?.sellerListingId === "string" &&
    options.sellerListingId.trim()
      ? options.sellerListingId.trim()
      : null;

  if (listingId) {
    return resolvePublicProductByListingId(supabase, productId, listingId);
  }

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

  return {
    storeSlug: store.slug,
    productSlug: data.slug as string,
    sellerListingId: null,
  };
}

/**
 * Fail-closed listing-aware id resolution. Invalid / inactive / mismatched
 * listing identity returns null (no owned-store fallback).
 */
export async function resolvePublicProductByListingId(
  supabase: AnyClient,
  productId: string,
  sellerListingId: string
): Promise<{
  storeSlug: string;
  productSlug: string;
  sellerListingId: string;
} | null> {
  const { data: listing, error: listingError } = await supabase
    .from("store_seller_listings")
    .select(
      "id, status, source_product_id, seller_store_id, supplier_store_id"
    )
    .eq("id", sellerListingId)
    .maybeSingle();

  if (listingError || !listing) return null;
  if (listing.status !== "active") return null;
  if (String(listing.source_product_id) !== productId) return null;

  const { data: product, error: productError } = await supabase
    .from("store_products")
    .select("id, slug, status, moderation_status")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) return null;

  const { data: sellerStore, error: sellerError } = await supabase
    .from("stores")
    .select("id, slug, status")
    .eq("id", listing.seller_store_id)
    .eq("status", "active")
    .maybeSingle();

  if (sellerError || !sellerStore) return null;

  if (
    !isPubliclyVisibleProduct({
      productStatus: product.status as string,
      moderationStatus: product.moderation_status as string,
      storeStatus: sellerStore.status as string,
    })
  ) {
    return null;
  }

  const { data: allowed } = await supabase.rpc(
    "store_listing_allows_seller_sale",
    {
      p_seller_store_id: sellerStore.id,
      p_product_id: productId,
      p_listing_id: sellerListingId,
    }
  );
  if (allowed !== true) return null;

  return {
    storeSlug: sellerStore.slug as string,
    productSlug: product.slug as string,
    sellerListingId,
  };
}

/**
 * Re-enrich a catalog item as a validated supplier listing on the seller store.
 * Returns null when listing provenance is invalid (fail closed — do not invent).
 */
export async function enrichCatalogItemAsSellerListing(
  supabase: AnyClient,
  input: {
    product: StoreProductRow;
    sellerListingId: string;
  }
): Promise<PublicCatalogItem | null> {
  const { data: listing } = await supabase
    .from("store_seller_listings")
    .select(
      "id, status, source_product_id, seller_store_id, supplier_store_id, display_title_override"
    )
    .eq("id", input.sellerListingId)
    .maybeSingle();

  if (!listing || listing.status !== "active") return null;
  if (String(listing.source_product_id) !== input.product.id) return null;

  const sellerStore = await supabase
    .from("stores")
    .select("id, slug, name, logo_path, status")
    .eq("id", listing.seller_store_id)
    .eq("status", "active")
    .maybeSingle();

  const store = sellerStore.data as Pick<
    StoreRow,
    "id" | "slug" | "name" | "logo_path" | "status"
  > | null;
  if (!store) return null;

  if (
    !isPubliclyVisibleProduct({
      productStatus: input.product.status,
      moderationStatus: input.product.moderation_status,
      storeStatus: store.status,
    })
  ) {
    return null;
  }

  const { data: allowed } = await supabase.rpc(
    "store_listing_allows_seller_sale",
    {
      p_seller_store_id: store.id,
      p_product_id: input.product.id,
      p_listing_id: input.sellerListingId,
    }
  );
  if (allowed !== true) return null;

  const enriched = await enrichPublicCatalogRow(supabase, {
    ...input.product,
    stores: store,
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
  return enriched;
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
    .select("slug, status")
    .eq("id", storeId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return { storeSlug: data.slug as string };
}
