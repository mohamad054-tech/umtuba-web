import type { SupabaseClient } from "@supabase/supabase-js";
import { isPubliclyVisibleProduct } from "./permissions";
import {
  buildProductHref,
  VIDEO_COMMERCE_NO_RATING_LABEL,
  type VideoShopShelfItem,
} from "./videoCommerce";
import type { StoreProductRow, StoreRow } from "./types";

type AnyClient = SupabaseClient;

type AttachmentRow = {
  id: string;
  post_id: number;
  product_id: string;
  sort_order: number;
  status: string;
  start_ms: number | null;
  end_ms: number | null;
};

/**
 * Load publicly visible shop-shelf items for a Watch post.
 * Fail-closed: empty list on error or when nothing is eligible.
 */
export async function listPublicVideoShopShelf(
  supabase: AnyClient,
  postId: number
): Promise<{ items: VideoShopShelfItem[]; error: string | null }> {
  if (!Number.isFinite(postId) || postId <= 0) {
    return { items: [], error: null };
  }

  const { data: attachments, error: attachError } = await supabase
    .from("video_product_attachments")
    .select("id, post_id, product_id, sort_order, status, start_ms, end_ms")
    .eq("post_id", postId)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (attachError) {
    console.error("listPublicVideoShopShelf attachments", attachError);
    return { items: [], error: "Unable to load shop shelf." };
  }

  const rows = (attachments ?? []) as AttachmentRow[];
  if (rows.length === 0) {
    return { items: [], error: null };
  }

  const productIds = [...new Set(rows.map((r) => r.product_id))];

  const { data: products, error: productError } = await supabase
    .from("store_products")
    .select(
      `
      *,
      stores!inner ( id, slug, name, logo_path, status )
    `
    )
    .in("id", productIds)
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .eq("stores.status", "active");

  if (productError) {
    console.error("listPublicVideoShopShelf products", productError);
    return { items: [], error: "Unable to load shop shelf." };
  }

  const productById = new Map<
    string,
    StoreProductRow & {
      stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
    }
  >();

  for (const row of products ?? []) {
    const typed = row as StoreProductRow & {
      stores: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
    };
    if (
      !isPubliclyVisibleProduct({
        productStatus: typed.status,
        moderationStatus: typed.moderation_status,
        storeStatus: typed.stores.status,
      })
    ) {
      continue;
    }
    productById.set(typed.id, typed);
  }

  const items: VideoShopShelfItem[] = [];

  for (const attachment of rows) {
    const product = productById.get(attachment.product_id);
    if (!product) {
      continue;
    }

    const store = product.stores;

    const { data: media } = await supabase
      .from("product_media")
      .select("storage_path, role, status, sort_order")
      .eq("product_id", product.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .limit(8);

    const coverPath =
      (media ?? []).find((m) => m.role === "cover")?.storage_path ??
      (media ?? [])[0]?.storage_path ??
      null;

    const { data: variants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", product.id)
      .eq("status", "active")
      .limit(1);

    let priceMinor: number | null = null;
    let currency: string | null = null;
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
    }

    items.push({
      attachmentId: attachment.id,
      productId: product.id,
      sortOrder: attachment.sort_order,
      startMs: attachment.start_ms,
      endMs: attachment.end_ms,
      title: product.title,
      storeName: store.name,
      storeSlug: store.slug,
      productSlug: product.slug,
      coverPath,
      priceMinor,
      currency,
      ratingLabel: VIDEO_COMMERCE_NO_RATING_LABEL,
      href: buildProductHref(store.slug, product.slug),
    });
  }

  return { items, error: null };
}

export type PublicProductVideoItem = {
  postId: number;
  href: string;
  caption: string | null;
  authorUsername: string | null;
  authorName: string | null;
  thumbnailPath: string | null;
};

/**
 * Load publicly visible Watch videos that shop this product — the reverse of
 * `listPublicVideoShopShelf` (product → videos rather than video → products).
 * Fail-closed: empty list unless the product itself is publicly visible.
 */
export async function listPublicVideosForProduct(
  supabase: AnyClient,
  productId: string,
  options?: { limit?: number }
): Promise<{ items: PublicProductVideoItem[]; error: string | null }> {
  const limit = Math.min(Math.max(options?.limit ?? 6, 1), 24);

  const { data: product, error: productError } = await supabase
    .from("store_products")
    .select(
      `
      id,
      status,
      moderation_status,
      stores!inner ( status )
    `
    )
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return { items: [], error: null };
  }

  const store = product.stores as unknown as { status: string };
  if (
    !isPubliclyVisibleProduct({
      productStatus: product.status as string,
      moderationStatus: product.moderation_status as string,
      storeStatus: store.status,
    })
  ) {
    return { items: [], error: null };
  }

  const { data: attachments, error: attachError } = await supabase
    .from("video_product_attachments")
    .select("post_id, sort_order")
    .eq("product_id", productId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (attachError) {
    console.error("listPublicVideosForProduct attachments", attachError);
    return { items: [], error: "Unable to load videos." };
  }

  const postIds = [...new Set((attachments ?? []).map((a) => a.post_id as number))];
  if (postIds.length === 0) {
    return { items: [], error: null };
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content, author_name, author_username, thumbnail_path, video_path, media_status")
    .in("id", postIds)
    .eq("post_type", "video")
    .eq("media_status", "ready")
    .not("video_path", "is", null);

  if (postsError) {
    console.error("listPublicVideosForProduct posts", postsError);
    return { items: [], error: "Unable to load videos." };
  }

  const postById = new Map<number, (typeof posts)[number]>();
  for (const post of posts ?? []) {
    postById.set(post.id as number, post);
  }

  const items: PublicProductVideoItem[] = [];
  for (const attachment of attachments ?? []) {
    const post = postById.get(attachment.post_id as number);
    if (!post) continue;
    items.push({
      postId: post.id as number,
      href: `/watch?post=${post.id}`,
      caption: (post.content as string | null) ?? null,
      authorUsername: (post.author_username as string | null) ?? null,
      authorName: (post.author_name as string | null) ?? null,
      thumbnailPath: (post.thumbnail_path as string | null) ?? null,
    });
  }

  return { items, error: null };
}
