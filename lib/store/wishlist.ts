import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enrichCatalogItemAsSellerListing,
  enrichPublicCatalogRow,
} from "./catalogQueries";
import {
  assertOptionalSellerListingId,
  catalogItemBuyerPdpPath,
} from "./listingProvenance";
import { isPubliclyVisibleProduct } from "./permissions";
import type { PublicCatalogItem, StoreProductRow, StoreRow } from "./types";

type AnyClient = SupabaseClient;

export type WishlistActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type WishlistEntry = {
  wishlistItemId: string;
  wishlistedAt: string;
  item: PublicCatalogItem;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeProductId(raw: unknown): string | null {
  const productId = typeof raw === "string" ? raw.trim() : "";
  return UUID_RE.test(productId) ? productId : null;
}

/**
 * List a user's saved products. Fail-closed: any product that is no longer
 * publicly visible (unpublished, unapproved, store suspended, etc.) is
 * silently dropped rather than shown broken.
 *
 * When `seller_listing_id` is present, re-enrich as the seller storefront
 * listing. Invalid listing provenance is dropped (no silent owned fallback).
 */
export async function listWishlist(
  supabase: AnyClient,
  userId: string,
  options?: { limit?: number }
): Promise<{ items: WishlistEntry[]; error: string | null }> {
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 100);

  const { data, error } = await supabase
    .from("store_wishlist_items")
    .select(
      `
      id,
      created_at,
      product_id,
      seller_listing_id,
      store_products!inner (
        *,
        stores!inner ( id, slug, name, logo_path, status )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("listWishlist", error);
    return { items: [], error: "Unable to load your favorites." };
  }

  const entries: WishlistEntry[] = [];
  for (const row of data ?? []) {
    const product = row.store_products as unknown as
      | (StoreProductRow & {
          stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
        })
      | null;
    if (!product) continue;

    if (
      !isPubliclyVisibleProduct({
        productStatus: product.status,
        moderationStatus: product.moderation_status,
        storeStatus: product.stores.status,
      })
    ) {
      continue;
    }

    const listingIdRaw = (row as { seller_listing_id?: unknown })
      .seller_listing_id;
    const listingAssert = assertOptionalSellerListingId(listingIdRaw);
    if (!listingAssert.ok) {
      continue;
    }

    let item: PublicCatalogItem;
    if (listingAssert.sellerListingId) {
      const listed = await enrichCatalogItemAsSellerListing(supabase, {
        product,
        sellerListingId: listingAssert.sellerListingId,
      });
      if (!listed) {
        // Listing no longer valid — do not silently rewrite to owned supplier PDP.
        continue;
      }
      item = listed;
    } else {
      item = await enrichPublicCatalogRow(supabase, product);
    }

    entries.push({
      wishlistItemId: row.id as string,
      wishlistedAt: row.created_at as string,
      item,
    });
  }

  return { items: entries, error: null };
}

/** Save a product to the signed-in user's wishlist (idempotent). */
export async function addToWishlist(
  supabase: AnyClient,
  userId: string,
  productIdRaw: unknown,
  sellerListingIdRaw?: unknown
): Promise<WishlistActionResult<{ id: string }>> {
  const productId = normalizeProductId(productIdRaw);
  if (!productId) {
    return { ok: false, message: "Product is invalid." };
  }

  const listingAssert = assertOptionalSellerListingId(sellerListingIdRaw);
  if (!listingAssert.ok) {
    return { ok: false, message: listingAssert.message };
  }
  const sellerListingId = listingAssert.sellerListingId;

  if (sellerListingId) {
    const { data: listing } = await supabase
      .from("store_seller_listings")
      .select("id, status, source_product_id, seller_store_id")
      .eq("id", sellerListingId)
      .maybeSingle();
    if (
      !listing ||
      listing.status !== "active" ||
      String(listing.source_product_id) !== productId
    ) {
      return { ok: false, message: "Listing identity is invalid." };
    }
    const { data: allowed } = await supabase.rpc(
      "store_listing_allows_seller_sale",
      {
        p_seller_store_id: listing.seller_store_id,
        p_product_id: productId,
        p_listing_id: sellerListingId,
      }
    );
    if (allowed !== true) {
      return { ok: false, message: "Listing identity is invalid." };
    }
  }

  const { data, error } = await supabase
    .from("store_wishlist_items")
    .insert({
      user_id: userId,
      product_id: productId,
      seller_listing_id: sellerListingId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      // Already saved — update listing stamp (last write wins) and treat as success.
      const { data: existing, error: updateError } = await supabase
        .from("store_wishlist_items")
        .update({ seller_listing_id: sellerListingId })
        .eq("user_id", userId)
        .eq("product_id", productId)
        .select("id")
        .maybeSingle();
      if (updateError || !existing) {
        console.error("addToWishlist update", updateError);
        return { ok: false, message: "Unable to save this product." };
      }
      return { ok: true, data: { id: existing.id as string } };
    }
    console.error("addToWishlist", error);
    return { ok: false, message: "Unable to save this product." };
  }

  return { ok: true, data: { id: data.id as string } };
}

/** Remove a product from the signed-in user's wishlist (idempotent). */
export async function removeFromWishlist(
  supabase: AnyClient,
  userId: string,
  productIdRaw: unknown
): Promise<WishlistActionResult> {
  const productId = normalizeProductId(productIdRaw);
  if (!productId) {
    return { ok: false, message: "Product is invalid." };
  }

  const { error } = await supabase
    .from("store_wishlist_items")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("removeFromWishlist", error);
    return { ok: false, message: "Unable to remove this product." };
  }

  return { ok: true, data: undefined };
}

/** Whether `productId` is currently saved by `userId`. Fails closed to `false`. */
export async function isProductWishlisted(
  supabase: AnyClient,
  userId: string | null | undefined,
  productIdRaw: unknown
): Promise<boolean> {
  if (!userId) return false;
  const productId = normalizeProductId(productIdRaw);
  if (!productId) return false;

  const { data } = await supabase
    .from("store_wishlist_items")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  return Boolean(data);
}

/** Buyer PDP href for a wishlist/catalog entry (uses enriched store slug). */
export function wishlistEntryBuyerPdpPath(entry: WishlistEntry): string {
  return catalogItemBuyerPdpPath({
    storeSlug: entry.item.store.slug,
    productSlug: entry.item.product.slug,
  });
}
