import type { SupabaseClient } from "@supabase/supabase-js";
import { availableUnits } from "./inventory";
import { isPubliclyVisibleProduct } from "./permissions";
import { createAuthorizedProductMediaSignedUrl } from "./productMediaUrl";
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
  return (data ?? []) as ProductCategoryRow[];
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
  let currency: string | null = null;
  let available: number | null = null;

  const variantId = variants?.[0]?.id;
  if (variantId) {
    const { data: price } = await supabase
      .from("product_prices")
      .select("amount_minor, currency")
      .eq("variant_id", variantId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (price) {
      priceMinor = Number(price.amount_minor);
      currency = price.currency;
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
  const coverUrl = cover
    ? await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: cover,
        productId: row.id,
        storeId: store.id,
        userId: null,
      })
    : null;

  return {
    product: product as StoreProductRow,
    store,
    coverPath: cover,
    coverUrl,
    priceMinor,
    currency,
    available,
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

    items.push(await enrichPublicCatalogRow(supabase, row));
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
  return (data as StoreRow | null) ?? null;
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

  const { data: product, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("store_id", store.id)
    .eq("slug", productSlug.toLowerCase())
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .maybeSingle();

  if (error) {
    console.error("getPublicProductDetail", error);
    return { detail: null, error: "Unable to load product." };
  }
  if (!product) {
    return { detail: null, error: null };
  }

  const productRow = product as StoreProductRow;
  if (
    !isPubliclyVisibleProduct({
      productStatus: productRow.status,
      moderationStatus: productRow.moderation_status,
      storeStatus: store.status,
    })
  ) {
    return { detail: null, error: null };
  }

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
        storeId: store.id,
        userId: null,
      }),
    }))
  );

  return {
    detail: {
      product: productRow,
      store,
      variants: enriched,
      media: mediaWithUrls,
      category: (category as ProductCategoryRow | null) ?? null,
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
    .select("slug, status")
    .eq("id", storeId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return { storeSlug: data.slug as string };
}
