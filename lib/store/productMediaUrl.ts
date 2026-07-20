import type { SupabaseClient } from "@supabase/supabase-js";
import { assertPlatformAdminDb } from "./adminAuth";
import {
  STORE_PRODUCT_MEDIA_BUCKET,
  STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS,
  isOwnedStoreProductMediaPath,
} from "./mediaConstants";
import { canManageCatalog, isPubliclyVisibleProduct } from "./permissions";
import type { StoreMemberRole } from "./types";

type AnyClient = SupabaseClient;

export type ProductMediaAccessDecision = {
  allowed: boolean;
  reason:
    | "ok_public_catalog"
    | "ok_catalog_editor"
    | "ok_platform_admin"
    | "invalid_path"
    | "media_inactive"
    | "not_authorized";
};

/**
 * Pure authorization for product media signing.
 * Never signs arbitrary client paths — caller must supply trusted store/product ids.
 */
export function decideProductMediaAccess(input: {
  storagePath: string;
  storeId: string;
  productId: string;
  storeStatus: string;
  productStatus: string;
  moderationStatus: string;
  mediaStatus: string;
  callerCanManageCatalog: boolean;
  callerIsPlatformAdmin: boolean;
}): ProductMediaAccessDecision {
  if (
    !isOwnedStoreProductMediaPath(
      input.storeId,
      input.productId,
      input.storagePath
    )
  ) {
    return { allowed: false, reason: "invalid_path" };
  }

  if (input.mediaStatus !== "active") {
    return { allowed: false, reason: "media_inactive" };
  }

  if (
    isPubliclyVisibleProduct({
      productStatus: input.productStatus,
      moderationStatus: input.moderationStatus,
      storeStatus: input.storeStatus,
    })
  ) {
    return { allowed: true, reason: "ok_public_catalog" };
  }

  if (input.callerCanManageCatalog) {
    return { allowed: true, reason: "ok_catalog_editor" };
  }

  if (input.callerIsPlatformAdmin) {
    return { allowed: true, reason: "ok_platform_admin" };
  }

  return { allowed: false, reason: "not_authorized" };
}

async function resolveCallerCatalogRole(
  supabase: AnyClient,
  storeId: string,
  userId: string | null | undefined
): Promise<StoreMemberRole | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("store_members")
    .select("role, status")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return (data?.role as StoreMemberRole | undefined) ?? null;
}

/**
 * Mint a short-lived signed URL only after DB-backed authorization.
 * Rejects arbitrary paths that do not belong to the given store/product.
 */
export async function createAuthorizedProductMediaSignedUrl(
  supabase: AnyClient,
  input: {
    storagePath: string;
    productId: string;
    storeId: string;
    userId?: string | null;
  }
): Promise<string | null> {
  const storagePath = input.storagePath.trim();
  if (
    !isOwnedStoreProductMediaPath(input.storeId, input.productId, storagePath)
  ) {
    return null;
  }

  const [{ data: media }, { data: product }, { data: store }] =
    await Promise.all([
      supabase
        .from("product_media")
        .select("status, product_id, storage_path")
        .eq("product_id", input.productId)
        .eq("storage_path", storagePath)
        .maybeSingle(),
      supabase
        .from("store_products")
        .select("id, store_id, status, moderation_status")
        .eq("id", input.productId)
        .maybeSingle(),
      supabase
        .from("stores")
        .select("id, status")
        .eq("id", input.storeId)
        .maybeSingle(),
    ]);

  if (
    !media ||
    !product ||
    !store ||
    product.store_id !== input.storeId ||
    media.product_id !== input.productId
  ) {
    return null;
  }

  const role = await resolveCallerCatalogRole(
    supabase,
    input.storeId,
    input.userId
  );
  const callerIsPlatformAdmin = input.userId
    ? await assertPlatformAdminDb(supabase)
    : false;

  const decision = decideProductMediaAccess({
    storagePath,
    storeId: input.storeId,
    productId: input.productId,
    storeStatus: store.status,
    productStatus: product.status,
    moderationStatus: product.moderation_status,
    mediaStatus: media.status,
    callerCanManageCatalog: canManageCatalog(role),
    callerIsPlatformAdmin,
  });

  if (!decision.allowed) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(STORE_PRODUCT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("createAuthorizedProductMediaSignedUrl", error);
    return null;
  }

  return data.signedUrl;
}
