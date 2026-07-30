/**
 * Commerce Seller Digital Product Asset Upload V1.
 * Prepare path server-side → client upload → service-role attach.
 * Does not mutate payment, settlement, entitlement, or buyer delivery state.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES,
  STORE_PRODUCT_MEDIA_BUCKET,
  buildStoreDigitalProductAssetPath,
  extensionFromStoreDigitalAssetPath,
  isOwnedStoreDigitalProductAssetPath,
  type AllowedStoreDigitalFileExtension,
} from "./mediaConstants";
import { validateStoreDigitalAssetFile } from "./mediaValidation";
import { canManageCatalog } from "./permissions";
import { STORE_DIGITAL_PRODUCT_ASSETS_TABLE } from "./digitalAccessDelivery";
import { getMembership } from "./sellerStore";
import type { StoreMemberRole } from "./types";

export const SELLER_DIGITAL_ASSET_UPLOAD_ID =
  "commerce.digital.seller_product_asset_upload_v1" as const;

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SellerDigitalAssetUiStatus =
  | "none"
  | "active"
  | "inactive"
  | "unavailable";

export type SellerDigitalAssetSummary = {
  uiStatus: SellerDigitalAssetUiStatus;
  title: string | null;
  fileExtension: AllowedStoreDigitalFileExtension | null;
  productType: string | null;
};

export type PrepareDigitalAssetUploadResult =
  | {
      ok: true;
      storagePath: string;
      contentType: string;
      maxBytes: number;
      titleHint: string | null;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "invalid_product_id"
        | "product_missing"
        | "forbidden"
        | "physical_product"
        | "unsafe_name"
        | "unsupported_type"
        | "oversized"
        | "server_misconfigured";
      message: string;
    };

export type FinalizeDigitalAssetAttachResult =
  | {
      ok: true;
      summary: SellerDigitalAssetSummary;
      replaced: boolean;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "invalid_product_id"
        | "product_missing"
        | "forbidden"
        | "physical_product"
        | "unsafe_path"
        | "object_missing"
        | "attach_failed"
        | "server_misconfigured";
      message: string;
      previousPreserved: boolean;
    };

function requireServiceRoleEnv():
  | { ok: true; url: string; key: string }
  | { ok: false; message: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      message: "Digital asset upload is unavailable (server configuration).",
    };
  }
  return { ok: true, url, key };
}

function serviceRoleClient():
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; message: string } {
  const env = requireServiceRoleEnv();
  if (!env.ok) return env;
  return {
    ok: true,
    supabase: createClient(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}

function isProductId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function toSummary(input: {
  productType: string | null;
  status: string | null;
  title: string | null;
  storagePath: string | null;
}): SellerDigitalAssetSummary {
  if (input.productType && input.productType !== "digital") {
    return {
      uiStatus: "unavailable",
      title: null,
      fileExtension: null,
      productType: input.productType,
    };
  }
  if (!input.status || !input.storagePath) {
    return {
      uiStatus: "none",
      title: null,
      fileExtension: null,
      productType: input.productType,
    };
  }
  return {
    uiStatus: input.status === "active" ? "active" : "inactive",
    title: input.title,
    fileExtension: extensionFromStoreDigitalAssetPath(input.storagePath),
    productType: input.productType,
  };
}

async function authorizeDigitalProductEditor(
  userClient: AnyClient,
  input: { productId: string; userId: string | null | undefined }
): Promise<
  | {
      ok: true;
      productId: string;
      storeId: string;
      productType: string;
      role: StoreMemberRole;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "invalid_product_id"
        | "product_missing"
        | "forbidden"
        | "physical_product";
      message: string;
    }
> {
  if (!input.userId) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Sign in required to manage digital assets.",
    };
  }

  const productId = input.productId.trim();
  if (!isProductId(productId)) {
    return {
      ok: false,
      code: "invalid_product_id",
      message: "Invalid product id.",
    };
  }

  const { data: product, error } = await userClient
    .from("store_products")
    .select("id, store_id, product_type")
    .eq("id", productId)
    .maybeSingle();

  if (error || !product) {
    return {
      ok: false,
      code: "product_missing",
      message: "Product not found.",
    };
  }

  const storeId = String(product.store_id);
  const role = await getMembership(userClient, storeId, input.userId);
  if (!canManageCatalog(role)) {
    return {
      ok: false,
      code: "forbidden",
      message: "You do not have permission to manage this product.",
    };
  }

  const productType = String(product.product_type ?? "");
  if (productType !== "digital") {
    return {
      ok: false,
      code: "physical_product",
      message: "Digital assets are only available for digital products.",
    };
  }

  return {
    ok: true,
    productId,
    storeId,
    productType,
    role: role as StoreMemberRole,
  };
}

/**
 * Safe seller-facing summary — never returns storage paths or signed URLs.
 */
export async function loadSellerDigitalAssetSummary(
  userClient: AnyClient,
  input: { productId: string; userId: string | null | undefined },
  deps?: { admin?: AnyClient }
): Promise<SellerDigitalAssetSummary> {
  if (!input.userId || !isProductId(input.productId)) {
    return {
      uiStatus: "none",
      title: null,
      fileExtension: null,
      productType: null,
    };
  }

  const { data: product } = await userClient
    .from("store_products")
    .select("id, store_id, product_type")
    .eq("id", input.productId.trim())
    .maybeSingle();

  if (!product) {
    return {
      uiStatus: "none",
      title: null,
      fileExtension: null,
      productType: null,
    };
  }

  const role = await getMembership(
    userClient,
    String(product.store_id),
    input.userId
  );
  if (!canManageCatalog(role)) {
    return {
      uiStatus: "none",
      title: null,
      fileExtension: null,
      productType: String(product.product_type ?? ""),
    };
  }

  if (String(product.product_type) !== "digital") {
    return toSummary({
      productType: String(product.product_type),
      status: null,
      title: null,
      storagePath: null,
    });
  }

  const adminClient = deps?.admin
    ? { ok: true as const, supabase: deps.admin }
    : serviceRoleClient();
  if (!adminClient.ok) {
    return toSummary({
      productType: "digital",
      status: null,
      title: null,
      storagePath: null,
    });
  }

  const { data: asset } = await adminClient.supabase
    .from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE)
    .select("status, title, storage_path")
    .eq("product_id", String(product.id))
    .eq("store_id", String(product.store_id))
    .maybeSingle();

  if (
    asset?.storage_path &&
    !isOwnedStoreDigitalProductAssetPath(
      String(product.store_id),
      String(product.id),
      String(asset.storage_path)
    )
  ) {
    return toSummary({
      productType: "digital",
      status: null,
      title: null,
      storagePath: null,
    });
  }

  return toSummary({
    productType: "digital",
    status: asset ? String(asset.status) : null,
    title:
      typeof asset?.title === "string" && asset.title.trim()
        ? asset.title.trim()
        : null,
    storagePath: asset ? String(asset.storage_path ?? "") : null,
  });
}

/**
 * Authorize editor + generate owned digital path. No DB write.
 */
export async function prepareSellerDigitalAssetUpload(
  userClient: AnyClient,
  input: {
    productId: string;
    userId: string | null | undefined;
    fileName: unknown;
    mimeType: unknown;
    byteSize: unknown;
  }
): Promise<PrepareDigitalAssetUploadResult> {
  const auth = await authorizeDigitalProductEditor(userClient, input);
  if (!auth.ok) return auth;

  const fileCheck = validateStoreDigitalAssetFile({
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  });
  if (!fileCheck.ok) {
    return {
      ok: false,
      code: fileCheck.code,
      message: fileCheck.message,
    };
  }

  const fileId = randomUUID();
  const storagePath = buildStoreDigitalProductAssetPath(
    auth.storeId,
    auth.productId,
    fileId,
    fileCheck.extension
  );

  if (
    !isOwnedStoreDigitalProductAssetPath(
      auth.storeId,
      auth.productId,
      storagePath
    )
  ) {
    return {
      ok: false,
      code: "server_misconfigured",
      message: "Unable to prepare a safe digital asset path.",
    };
  }

  return {
    ok: true,
    storagePath,
    contentType: fileCheck.mimeType,
    maxBytes: MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES,
    titleHint: fileCheck.titleHint,
  };
}

async function verifyUploadedDigitalObject(
  admin: AnyClient,
  storagePath: string
): Promise<boolean> {
  const { data, error } = await admin.storage
    .from(STORE_PRODUCT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60);

  if (error || !data?.signedUrl) {
    return false;
  }
  return true;
}

/**
 * After a successful storage upload, attach verified metadata as the single
 * active digital asset. Failed attach preserves any previous active row.
 */
export async function finalizeSellerDigitalAssetAttach(
  userClient: AnyClient,
  input: {
    productId: string;
    userId: string | null | undefined;
    storagePath: unknown;
    title?: unknown;
  },
  deps?: { admin?: AnyClient }
): Promise<FinalizeDigitalAssetAttachResult> {
  const auth = await authorizeDigitalProductEditor(userClient, input);
  if (!auth.ok) {
    return { ...auth, previousPreserved: true };
  }

  const storagePath =
    typeof input.storagePath === "string" ? input.storagePath.trim() : "";
  if (
    !storagePath ||
    !isOwnedStoreDigitalProductAssetPath(
      auth.storeId,
      auth.productId,
      storagePath
    )
  ) {
    return {
      ok: false,
      code: "unsafe_path",
      message: "Digital asset path failed ownership checks.",
      previousPreserved: true,
    };
  }

  const titleRaw =
    typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  const title = titleRaw || null;

  const adminClient = deps?.admin
    ? { ok: true as const, supabase: deps.admin }
    : serviceRoleClient();
  if (!adminClient.ok) {
    return {
      ok: false,
      code: "server_misconfigured",
      message: adminClient.message,
      previousPreserved: true,
    };
  }
  const admin = adminClient.supabase;

  const objectOk = await verifyUploadedDigitalObject(admin, storagePath);
  if (!objectOk) {
    return {
      ok: false,
      code: "object_missing",
      message:
        "Uploaded file was not found. The previous digital asset was kept.",
      previousPreserved: true,
    };
  }

  const { data: existing } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE)
    .select("id, storage_path, status, title")
    .eq("product_id", auth.productId)
    .eq("store_id", auth.storeId)
    .maybeSingle();

  const previousPath = existing ? String(existing.storage_path ?? "") : "";
  const replaced = Boolean(existing && previousPath && previousPath !== storagePath);

  if (existing?.id) {
    const { error } = await admin
      .from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE)
      .update({
        storage_path: storagePath,
        status: "active",
        title,
      })
      .eq("id", existing.id)
      .eq("product_id", auth.productId)
      .eq("store_id", auth.storeId);

    if (error) {
      console.error("finalizeSellerDigitalAssetAttach update failed");
      return {
        ok: false,
        code: "attach_failed",
        message:
          "Unable to attach the new digital file. The previous asset was kept.",
        previousPreserved: true,
      };
    }
  } else {
    const { error } = await admin.from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE).insert({
      store_id: auth.storeId,
      product_id: auth.productId,
      storage_path: storagePath,
      status: "active",
      title,
    });

    if (error) {
      console.error("finalizeSellerDigitalAssetAttach insert failed");
      return {
        ok: false,
        code: "attach_failed",
        message: "Unable to attach the digital file. No active asset was set.",
        previousPreserved: true,
      };
    }
  }

  return {
    ok: true,
    replaced,
    summary: toSummary({
      productType: auth.productType,
      status: "active",
      title,
      storagePath,
    }),
  };
}
