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
import {
  STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE,
  interpretActivateRpcPayload,
  listDigitalAssetVersionsForProduct,
  resolveActiveDigitalAssetVersion,
  toSellerVersionSummaries,
  type ActivateDigitalAssetVersionResult,
} from "./digitalProductVersioning";
import type { SellerDigitalAssetVersionSummary } from "./digitalProductVersioning";
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
  | "draft_only"
  | "unavailable";

export type SellerDigitalAssetSummary = {
  uiStatus: SellerDigitalAssetUiStatus;
  title: string | null;
  fileExtension: AllowedStoreDigitalFileExtension | null;
  productType: string | null;
  activeVersionId: string | null;
  versions: SellerDigitalAssetVersionSummary[];
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
      /** True when a prior active version remains the delivery pointer. */
      activePreserved: boolean;
      draftVersionNumber: number;
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

export type { ActivateDigitalAssetVersionResult };

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

function emptySummary(
  productType: string | null = null
): SellerDigitalAssetSummary {
  return {
    uiStatus: productType && productType !== "digital" ? "unavailable" : "none",
    title: null,
    fileExtension: null,
    productType,
    activeVersionId: null,
    versions: [],
  };
}

function buildSummaryFromVersions(input: {
  productType: string | null;
  versions: Awaited<ReturnType<typeof listDigitalAssetVersionsForProduct>>;
  activeVersionId: string | null;
}): SellerDigitalAssetSummary {
  if (input.productType && input.productType !== "digital") {
    return emptySummary(input.productType);
  }
  const versions = toSellerVersionSummaries(input.versions);
  const active = input.versions.find((v) => v.status === "active") ?? null;
  if (active) {
    return {
      uiStatus: "active",
      title: active.title,
      fileExtension: extensionFromStoreDigitalAssetPath(active.storagePath),
      productType: input.productType,
      activeVersionId: active.id,
      versions,
    };
  }
  if (input.versions.length > 0) {
    const latest = input.versions[0];
    return {
      uiStatus: "draft_only",
      title: latest?.title ?? null,
      fileExtension: latest
        ? extensionFromStoreDigitalAssetPath(latest.storagePath)
        : null,
      productType: input.productType,
      activeVersionId: null,
      versions,
    };
  }
  return emptySummary(input.productType);
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
    return emptySummary(null);
  }

  const { data: product } = await userClient
    .from("store_products")
    .select("id, store_id, product_type")
    .eq("id", input.productId.trim())
    .maybeSingle();

  if (!product) {
    return emptySummary(null);
  }

  const role = await getMembership(
    userClient,
    String(product.store_id),
    input.userId
  );
  if (!canManageCatalog(role)) {
    return emptySummary(String(product.product_type ?? ""));
  }

  if (String(product.product_type) !== "digital") {
    return emptySummary(String(product.product_type));
  }

  const adminClient = deps?.admin
    ? { ok: true as const, supabase: deps.admin }
    : serviceRoleClient();
  if (!adminClient.ok) {
    return emptySummary("digital");
  }

  const versions = await listDigitalAssetVersionsForProduct(
    adminClient.supabase,
    {
      productId: String(product.id),
      storeId: String(product.store_id),
    }
  );
  const active = await resolveActiveDigitalAssetVersion(adminClient.supabase, {
    productId: String(product.id),
    storeId: String(product.store_id),
  });

  return buildSummaryFromVersions({
    productType: "digital",
    versions,
    activeVersionId: active?.id ?? null,
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
 * After a successful storage upload, insert a draft version.
 * Never overwrites prior version rows or changes the active pointer.
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

  const priorActive = await resolveActiveDigitalAssetVersion(admin, {
    productId: auth.productId,
    storeId: auth.storeId,
  });

  const { data: existingAsset } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE)
    .select("id, active_version_id, status")
    .eq("product_id", auth.productId)
    .eq("store_id", auth.storeId)
    .maybeSingle();

  if (!existingAsset?.id) {
    const { error: assetInsertError } = await admin
      .from(STORE_DIGITAL_PRODUCT_ASSETS_TABLE)
      .insert({
        store_id: auth.storeId,
        product_id: auth.productId,
        storage_path: null,
        status: "inactive",
        title: null,
        active_version_id: null,
      });
    if (assetInsertError) {
      console.error("finalizeSellerDigitalAssetAttach asset insert failed");
      return {
        ok: false,
        code: "attach_failed",
        message: "Unable to attach the digital file. No draft version was set.",
        previousPreserved: true,
      };
    }
  }

  const { data: maxRow } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE)
    .select("version_number")
    .eq("product_id", auth.productId)
    .eq("store_id", auth.storeId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion =
    Number.isInteger(Number(maxRow?.version_number)) &&
    Number(maxRow?.version_number) >= 1
      ? Number(maxRow?.version_number) + 1
      : 1;

  const { error: versionInsertError } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE)
    .insert({
      store_id: auth.storeId,
      product_id: auth.productId,
      storage_path: storagePath,
      status: "draft",
      version_number: nextVersion,
      title,
    });

  if (versionInsertError) {
    console.error("finalizeSellerDigitalAssetAttach version insert failed");
    return {
      ok: false,
      code: "attach_failed",
      message:
        "Unable to create the draft digital version. The active version was kept.",
      previousPreserved: true,
    };
  }

  const versions = await listDigitalAssetVersionsForProduct(admin, {
    productId: auth.productId,
    storeId: auth.storeId,
  });

  return {
    ok: true,
    activePreserved: Boolean(priorActive),
    draftVersionNumber: nextVersion,
    summary: buildSummaryFromVersions({
      productType: auth.productType,
      versions,
      activeVersionId: priorActive?.id ?? null,
    }),
  };
}

/**
 * Explicit seller activation of an owned draft/inactive version.
 * Atomic swap via DB RPC — fail closed on store/product mismatch.
 */
export async function activateSellerDigitalAssetVersion(
  userClient: AnyClient,
  input: {
    productId: string;
    versionId: string;
    userId: string | null | undefined;
  },
  deps?: { admin?: AnyClient }
): Promise<ActivateDigitalAssetVersionResult> {
  const auth = await authorizeDigitalProductEditor(userClient, {
    productId: input.productId,
    userId: input.userId,
  });
  if (!auth.ok) return auth;

  const versionId = String(input.versionId ?? "").trim();
  if (!UUID_RE.test(versionId)) {
    return {
      ok: false,
      code: "invalid_version_id",
      message: "Invalid digital asset version id.",
    };
  }

  const adminClient = deps?.admin
    ? { ok: true as const, supabase: deps.admin }
    : serviceRoleClient();
  if (!adminClient.ok) {
    return {
      ok: false,
      code: "server_misconfigured",
      message: adminClient.message,
    };
  }
  const admin = adminClient.supabase;

  const { data: version } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE)
    .select(
      "id, store_id, product_id, storage_path, status, version_number, title"
    )
    .eq("id", versionId)
    .maybeSingle();

  if (!version) {
    return {
      ok: false,
      code: "version_missing",
      message: "Digital asset version was not found.",
    };
  }

  if (
    String(version.product_id) !== auth.productId ||
    String(version.store_id) !== auth.storeId
  ) {
    return {
      ok: false,
      code: "version_mismatch",
      message: "Digital asset version does not belong to this product.",
    };
  }

  if (
    !isOwnedStoreDigitalProductAssetPath(
      auth.storeId,
      auth.productId,
      String(version.storage_path ?? "")
    )
  ) {
    return {
      ok: false,
      code: "unsafe_path",
      message: "Digital asset path failed ownership checks.",
    };
  }

  const { data, error } = await admin.rpc(
    "activate_store_digital_product_asset_version",
    {
      p_version_id: versionId,
      p_product_id: auth.productId,
      p_store_id: auth.storeId,
    }
  );

  if (error) {
    console.error("activateSellerDigitalAssetVersion rpc failed");
    return {
      ok: false,
      code: "activate_failed",
      message: "Unable to activate digital asset version.",
    };
  }

  return interpretActivateRpcPayload(data);
}
