/**
 * Commerce Digital Product Versioning & Update Delivery V1.
 * Always-latest delivery via a single active version pointer.
 * Does not pin entitlements; does not redesign mint / grant security.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extensionFromStoreDigitalAssetPath,
  isOwnedStoreDigitalProductAssetPath,
  type AllowedStoreDigitalFileExtension,
} from "./mediaConstants";

export const DIGITAL_PRODUCT_VERSIONING_ID =
  "commerce.digital.product_versioning_update_delivery_v1" as const;

export const STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE =
  "store_digital_product_asset_versions" as const;

export type DigitalAssetVersionStatus = "draft" | "active" | "inactive";

export type DigitalAssetVersionRow = {
  id: string;
  storeId: string;
  productId: string;
  storagePath: string;
  status: DigitalAssetVersionStatus;
  versionNumber: number;
  title: string | null;
};

export type SellerDigitalAssetVersionSummary = {
  id: string;
  versionNumber: number;
  status: DigitalAssetVersionStatus;
  title: string | null;
  fileExtension: AllowedStoreDigitalFileExtension | null;
  isActive: boolean;
};

type AnyClient = SupabaseClient;

function asVersionStatus(value: unknown): DigitalAssetVersionStatus | null {
  const status = String(value ?? "").trim();
  if (status === "draft" || status === "active" || status === "inactive") {
    return status;
  }
  return null;
}

function mapVersionRow(row: {
  id: unknown;
  store_id: unknown;
  product_id: unknown;
  storage_path: unknown;
  status: unknown;
  version_number: unknown;
  title?: unknown;
}): DigitalAssetVersionRow | null {
  const status = asVersionStatus(row.status);
  const versionNumber = Number(row.version_number);
  if (!status || !Number.isInteger(versionNumber) || versionNumber < 1) {
    return null;
  }
  const storagePath = String(row.storage_path ?? "").trim();
  if (!storagePath) return null;
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    productId: String(row.product_id),
    storagePath,
    status,
    versionNumber,
    title:
      typeof row.title === "string" && row.title.trim()
        ? row.title.trim()
        : null,
  };
}

/**
 * Resolve the single active owned version for a product.
 * Fail closed when missing, inactive, mismatched, or path-unowned.
 */
export async function resolveActiveDigitalAssetVersion(
  admin: AnyClient,
  input: { productId: string; storeId: string }
): Promise<DigitalAssetVersionRow | null> {
  const { data: asset } = await admin
    .from("store_digital_product_assets")
    .select("id, store_id, product_id, active_version_id, status")
    .eq("product_id", input.productId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!asset?.active_version_id) return null;
  if (String(asset.status) !== "active") return null;

  const { data: version } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE)
    .select(
      "id, store_id, product_id, storage_path, status, version_number, title"
    )
    .eq("id", String(asset.active_version_id))
    .eq("product_id", input.productId)
    .eq("store_id", input.storeId)
    .maybeSingle();

  if (!version) return null;
  const mapped = mapVersionRow(version);
  if (!mapped || mapped.status !== "active") return null;
  if (
    !isOwnedStoreDigitalProductAssetPath(
      input.storeId,
      input.productId,
      mapped.storagePath
    )
  ) {
    return null;
  }
  return mapped;
}

export async function listDigitalAssetVersionsForProduct(
  admin: AnyClient,
  input: { productId: string; storeId: string }
): Promise<DigitalAssetVersionRow[]> {
  const { data: rows } = await admin
    .from(STORE_DIGITAL_PRODUCT_ASSET_VERSIONS_TABLE)
    .select(
      "id, store_id, product_id, storage_path, status, version_number, title"
    )
    .eq("product_id", input.productId)
    .eq("store_id", input.storeId)
    .order("version_number", { ascending: false });

  const out: DigitalAssetVersionRow[] = [];
  for (const row of rows ?? []) {
    const mapped = mapVersionRow(row);
    if (!mapped) continue;
    if (
      !isOwnedStoreDigitalProductAssetPath(
        input.storeId,
        input.productId,
        mapped.storagePath
      )
    ) {
      continue;
    }
    out.push(mapped);
  }
  return out;
}

export function toSellerVersionSummaries(
  versions: DigitalAssetVersionRow[]
): SellerDigitalAssetVersionSummary[] {
  return versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    title: v.title,
    fileExtension: extensionFromStoreDigitalAssetPath(v.storagePath),
    isActive: v.status === "active",
  }));
}

export type ActivateDigitalAssetVersionResult =
  | {
      ok: true;
      versionId: string;
      versionNumber: number;
      alreadyActive: boolean;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "invalid_product_id"
        | "invalid_version_id"
        | "product_missing"
        | "forbidden"
        | "physical_product"
        | "version_missing"
        | "version_mismatch"
        | "unsafe_path"
        | "activate_failed"
        | "server_misconfigured";
      message: string;
    };

export function interpretActivateRpcPayload(
  payload: unknown
): ActivateDigitalAssetVersionResult {
  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      code: "activate_failed",
      message: "Unable to activate digital asset version.",
    };
  }
  const row = payload as Record<string, unknown>;
  if (row.ok === true) {
    return {
      ok: true,
      versionId: String(row.version_id),
      versionNumber: Number(row.version_number),
      alreadyActive: String(row.code) === "already_active",
    };
  }
  const code = String(row.code ?? "activate_failed");
  if (code === "version_missing") {
    return {
      ok: false,
      code: "version_missing",
      message: "Digital asset version was not found.",
    };
  }
  if (code === "version_mismatch") {
    return {
      ok: false,
      code: "version_mismatch",
      message: "Digital asset version does not belong to this product.",
    };
  }
  return {
    ok: false,
    code: "activate_failed",
    message: "Unable to activate digital asset version.",
  };
}

/**
 * Pure helper used by tests for backfill shape expectations.
 */
export function buildBackfillVersionFromLegacyAsset(input: {
  storeId: string;
  productId: string;
  storagePath: string;
  status: string;
  title: string | null;
}): {
  storeId: string;
  productId: string;
  storagePath: string;
  status: DigitalAssetVersionStatus;
  versionNumber: 1;
  title: string | null;
  shouldSetActivePointer: boolean;
} {
  const status: DigitalAssetVersionStatus =
    input.status === "active" ? "active" : "inactive";
  return {
    storeId: input.storeId,
    productId: input.productId,
    storagePath: input.storagePath,
    status,
    versionNumber: 1,
    title: input.title,
    shouldSetActivePointer: status === "active",
  };
}
