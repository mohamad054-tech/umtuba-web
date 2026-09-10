/**
 * Map approved drafts onto isolated Store catalog items for sandbox preview.
 * Customer PublicCatalogItem never carries landed/margin/CJ ids.
 */

import type { PublicCatalogItem, PublicProductDetail } from "../../store/types";
import {
  CJ_STORE_LAUNCH_STORE_ID,
  CJ_STORE_LAUNCH_STORE_NAME,
  CJ_STORE_LAUNCH_STORE_SLUG,
  type ApprovedDraftProduct,
} from "./launchDraft";
import {
  isCustomerVisibleLaunchProduct,
  type CjSyncStatus,
} from "./productionCandidate";

const DRAFT_TS = "1970-01-01T00:00:00.000Z";

export function toCustomerCatalogItem(
  draft: Pick<ApprovedDraftProduct, "customer" | "economics"> & {
    sync_status?: CjSyncStatus;
    provider_available?: boolean;
  }
): PublicCatalogItem {
  const purchasable = isCustomerVisibleLaunchProduct(draft);
  return {
    product: {
      id: draft.customer.id,
      store_id: CJ_STORE_LAUNCH_STORE_ID,
      slug: draft.customer.slug,
      title: draft.customer.title,
      short_description: draft.customer.short_description,
      description: draft.customer.description,
      product_type: "physical",
      status: "draft",
      moderation_status: "pending",
      primary_category_id: null,
      brand_id: null,
      created_by: CJ_STORE_LAUNCH_STORE_ID,
      created_at: DRAFT_TS,
      updated_at: DRAFT_TS,
      published_at: null,
      weight_grams: null,
      origin_country_code: null,
      marketplace_eligible: false,
    },
    store: {
      id: CJ_STORE_LAUNCH_STORE_ID,
      slug: CJ_STORE_LAUNCH_STORE_SLUG,
      name: CJ_STORE_LAUNCH_STORE_NAME,
      logo_path: null,
      status: "draft",
    },
    coverPath: null,
    coverUrl: draft.customer.cover_url,
    priceMinor: draft.customer.retail_price_minor,
    currency: draft.customer.currency,
    available: purchasable
      ? draft.economics.stock != null && draft.economics.stock > 3
        ? 12
        : draft.economics.stock
      : 0,
    marketplaceSourceType: "owned",
  };
}

export function toCustomerProductDetail(draft: ApprovedDraftProduct): PublicProductDetail {
  const item = toCustomerCatalogItem(draft);
  const variantId = `${draft.customer.id.slice(0, 8)}-4000-8000-000000000001`;
  return {
    product: item.product,
    store: {
      id: CJ_STORE_LAUNCH_STORE_ID,
      owner_user_id: CJ_STORE_LAUNCH_STORE_ID,
      slug: CJ_STORE_LAUNCH_STORE_SLUG,
      name: CJ_STORE_LAUNCH_STORE_NAME,
      description: "Isolated CJ draft catalog. Not published. Checkout disabled.",
      logo_path: null,
      cover_path: null,
      status: "draft",
      verification_status: "unverified",
      default_currency: "USD",
      country_code: null,
      created_at: DRAFT_TS,
      updated_at: DRAFT_TS,
    },
    variants: [
      {
        variant: {
          id: variantId,
          product_id: draft.customer.id,
          sku: "DRAFT",
          title: "Default",
          option_values: {},
          status: "draft",
          created_at: DRAFT_TS,
          updated_at: DRAFT_TS,
        },
        price:
          draft.customer.retail_price_minor != null
            ? {
                id: `${variantId}-price`,
                variant_id: variantId,
                currency: "USD",
                amount_minor: draft.customer.retail_price_minor,
                compare_at_amount_minor: null,
                country_code: null,
                starts_at: null,
                ends_at: null,
                status: "draft",
              }
            : null,
        inventory: {
          id: `${variantId}-inv`,
          variant_id: variantId,
          warehouse_key: "draft",
          on_hand: draft.economics.stock ?? 0,
          reserved: 0,
          safety_stock: 0,
          allow_backorder: false,
        },
        available: draft.economics.stock ?? 0,
      },
    ],
    media: draft.customer.gallery_urls.map((url, index) => ({
      id: `${draft.customer.id}-media-${index}`,
      product_id: draft.customer.id,
      variant_id: null,
      media_type: "image",
      storage_path: "",
      alt_text: draft.customer.title,
      sort_order: index,
      role: index === 0 ? "cover" : "gallery",
      status: "draft",
      mediaUrl: url,
    })),
    category: {
      id: `cj-cat-${draft.customer.category.toLowerCase().replace(/[^a-z]+/g, "-")}`,
      parent_id: null,
      slug: draft.customer.category.toLowerCase().replace(/[^a-z]+/g, "-"),
      name: draft.customer.category,
      status: "active",
    },
    purchaseAllowed: false,
    purchaseBlockedReason: "Draft catalog — checkout is disabled.",
    marketplaceSourceType: "owned",
    displayTitle: draft.customer.title,
  };
}
