import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STORE_ADMIN_REVIEW_RPCS,
  assertProductModerationAction,
  validateRejectionReason,
  validateRevisionReason,
} from "./adminReview";
import {
  buildStoreProductMediaPath,
  isOwnedStoreProductMediaPath,
  STORE_PRODUCT_MEDIA_BUCKET,
  STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS,
} from "./mediaConstants";
import { decideProductMediaAccess } from "./productMediaUrl";
import { STOREFRONT_FLAGS } from "./storefrontFlags";

const ROOT = process.cwd();
const HARDENING =
  "supabase/migrations/20260818_store_hardening_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("store hardening migration security contracts", () => {
  it("ships hardening migration after orders foundation date collision", () => {
    expect(existsSync(join(ROOT, HARDENING))).toBe(true);
    expect(
      existsSync(
        join(ROOT, "supabase/migrations/20260811_store_orders_foundation_v1.sql")
      )
    ).toBe(true);
    const sql = read(HARDENING);
    expect(sql).toMatch(/Filename note: 20260811_/);
  });

  it("closes residual authenticated store INSERT path", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(
      /drop policy if exists "Authenticated users can create stores" on public\.stores;/
    );
    expect(sql).toMatch(
      /revoke insert on public\.stores from anon, authenticated;/
    );
    expect(sql).not.toMatch(
      /create policy "Authenticated users can create stores"/
    );
  });

  it("adds reject/return RPCs with fixed search_path and platform admin", () => {
    const sql = read(HARDENING);
    for (const rpc of [
      "admin_reject_store_product",
      "admin_return_store_product_for_revision",
    ]) {
      expect(sql).toContain(rpc);
      const slice = sql.slice(sql.indexOf(`create or replace function public.${rpc}`));
      expect(slice).toMatch(/security definer/);
      expect(slice).toMatch(/set search_path = public/);
      expect(slice).toMatch(/require_platform_admin/);
    }
    expect(sql).toMatch(/Rejection reason is required/);
    expect(sql).toMatch(/Revision reason is required/);
    expect(sql).toMatch(
      /revoke all on function public\.admin_reject_store_product\(uuid, text\) from public, anon;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_reject_store_product\(uuid, text\) to authenticated, service_role;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.admin_return_store_product_for_revision\(uuid, text\) from public, anon;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.admin_return_store_product_for_revision\(uuid, text\) to authenticated, service_role;/
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.admin_reject_store_product\(uuid, text\) to anon/
    );
  });

  it("creates PRIVATE store-product-media bucket with tenant path policies", () => {
    const sql = read(HARDENING);
    expect(sql).toContain(STORE_PRODUCT_MEDIA_BUCKET);
    expect(sql).toMatch(/'store-product-media',\s*\r?\n\s*'store-product-media',\s*\r?\n\s*false,/);
    expect(sql).toMatch(/PRIVATE bucket|public = false/i);
    expect(sql).toMatch(/\(storage\.foldername\(name\)\)\[1\] = 'stores'/);
    expect(sql).toMatch(/can_manage_store_catalog/);
    expect(sql).toMatch(/is_public_store_product/);
    expect(sql).toMatch(/is_platform_admin/);
    expect(sql).toMatch(/Public catalog may select published store product media/);
    expect(sql).not.toMatch(/Public read store product media objects"\s*\n\s*on storage\.objects/);
    expect(sql).toMatch(/file_size_limit,\s*allowed_mime_types/);
    expect(sql).toMatch(/image\/jpeg/);
    const helper = read("lib/store/productMediaUrl.ts");
    expect(helper).toMatch(/createSignedUrl/);
    expect(helper).toMatch(/createAuthorizedProductMediaSignedUrl/);
    expect(helper).not.toMatch(/getPublicUrl/);
    expect(helper).not.toMatch(/object\/public/);
    expect(STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS).toBe(15 * 60);
  });

  it("lists required Store + video commerce migrations for consistency", () => {
    const required = [
      "supabase/migrations/20260728_store_product_foundation_v1.sql",
      "supabase/migrations/20260729_store_cart_foundation_v1.sql",
      "supabase/migrations/20260801_video_commerce_shelf_v1.sql",
      "supabase/migrations/20260802_store_marketplace_foundation_v1.sql",
      "supabase/migrations/20260809_store_admin_moderation_foundation_v1.sql",
      "supabase/migrations/20260810_store_seller_self_service_v1.sql",
      HARDENING,
    ];
    for (const rel of required) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
  });
});

describe("store hardening domain contracts", () => {
  it("keeps store creation fail-closed in app", () => {
    const seller = read("lib/store/sellerStore.ts");
    expect(seller).toMatch(/export async function createStoreForUser/);
    expect(seller).toMatch(/ok:\s*false/);
    expect(seller).toMatch(/seller\/setup|sellerSetup|Sell on UMTUBA|setup wizard/i);
  });

  it("validates owned media paths", () => {
    const storeId = "11111111-1111-4111-8111-111111111111";
    const productId = "22222222-2222-4222-8222-222222222222";
    const path = buildStoreProductMediaPath(storeId, productId, storeId, "jpg");
    expect(isOwnedStoreProductMediaPath(storeId, productId, path)).toBe(true);
    expect(
      isOwnedStoreProductMediaPath(storeId, productId, "store/products/cover.jpg")
    ).toBe(false);
    expect(
      isOwnedStoreProductMediaPath(
        storeId,
        productId,
        `stores/${storeId}/products/${productId}/../x.jpg`
      )
    ).toBe(false);
  });

  it("authorizes signed media access by product state and caller role", () => {
    const storeId = "11111111-1111-4111-8111-111111111111";
    const productId = "22222222-2222-4222-8222-222222222222";
    const path = buildStoreProductMediaPath(storeId, productId, storeId, "jpg");

    const base = {
      storagePath: path,
      storeId,
      productId,
      mediaStatus: "active",
      callerCanManageCatalog: false,
      callerIsPlatformAdmin: false,
    };

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "active",
        moderationStatus: "approved",
      }).reason
    ).toBe("ok_public_catalog");

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "pending",
      }).allowed
    ).toBe(false);

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "rejected",
        moderationStatus: "rejected",
      }).allowed
    ).toBe(false);

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "needs_changes",
      }).allowed
    ).toBe(false);

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "hidden",
        moderationStatus: "approved",
      }).allowed
    ).toBe(false);

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "pending",
        callerCanManageCatalog: true,
      }).reason
    ).toBe("ok_catalog_editor");

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "pending",
        callerCanManageCatalog: false,
      }).allowed
    ).toBe(false);

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "draft",
        moderationStatus: "pending",
        callerIsPlatformAdmin: true,
      }).reason
    ).toBe("ok_platform_admin");

    expect(
      decideProductMediaAccess({
        ...base,
        storagePath: "stores/other/products/x/y.jpg",
        storeStatus: "active",
        productStatus: "active",
        moderationStatus: "approved",
      }).reason
    ).toBe("invalid_path");

    expect(
      decideProductMediaAccess({
        ...base,
        storeStatus: "active",
        productStatus: "active",
        moderationStatus: "approved",
        mediaStatus: "hidden",
      }).reason
    ).toBe("media_inactive");
  });

  it("supports approve/reject/return product moderation assertions", () => {
    expect(
      assertProductModerationAction("in_review", "pending", "approve").ok
    ).toBe(true);
    expect(
      assertProductModerationAction("in_review", "pending", "reject").ok
    ).toBe(true);
    expect(
      assertProductModerationAction("in_review", "pending", "return").ok
    ).toBe(true);
    expect(
      assertProductModerationAction("active", "approved", "reject").ok
    ).toBe(false);
    expect(validateRejectionReason("Too sparse").ok).toBe(true);
    expect(validateRevisionReason("Add clearer images").ok).toBe(true);
  });

  it("keeps unfinished storefront flags off by default", () => {
    expect(STOREFRONT_FLAGS.SHOW_LIVE_SHOPPING).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_FLASH_DEALS).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_BRAND_RAIL).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_SHOPPABLE_VIDEO_RAIL).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_STORE_PROFILE_VIDEOS_TAB).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_STORE_PROFILE_LIVE_TAB).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_STORE_PROFILE_RATINGS_TAB).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_PDP_REVIEWS_PLACEHOLDER).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_STORE_FOLLOW_UI).toBe(false);
    expect(STOREFRONT_FLAGS.SHOW_SANDBOX_CATALOG).toBe(false);
  });

  it("wires hardening RPCs into admin review registry and actions", () => {
    expect(STORE_ADMIN_REVIEW_RPCS).toContain("admin_reject_store_product");
    expect(STORE_ADMIN_REVIEW_RPCS).toContain(
      "admin_return_store_product_for_revision"
    );
    const actions = read("app/actions/storeAdmin.ts");
    expect(actions).toMatch(/rejectStoreProductAction/);
    expect(actions).toMatch(/returnStoreProductForRevisionAction/);
    expect(actions).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
