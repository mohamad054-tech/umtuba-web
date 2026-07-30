/**
 * Commerce Digital Product Publish Readiness V1.
 * Gate digital products from review / marketplace-sellable paths unless an
 * active owned digital asset exists. Physical products are not gated here.
 * Does not mutate payment, settlement, entitlement, or delivery state.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveActiveDigitalAssetVersion } from "./digitalProductVersioning";
import { isOwnedStoreDigitalProductAssetPath } from "./mediaConstants";

export const DIGITAL_PRODUCT_PUBLISH_READINESS_ID =
  "commerce.digital.product_publish_readiness_v1" as const;

type AnyClient = SupabaseClient;

export type DigitalPublishReadinessUiState =
  | "not_applicable"
  | "asset_missing"
  | "asset_invalid"
  | "asset_ready"
  | "ready_for_review";

export type DigitalAssetReadinessSnapshot = {
  storeId: string;
  productId: string;
  status: string;
  storagePath: string;
};

export type DigitalPublishReadinessResult = {
  applicable: boolean;
  ready: boolean;
  uiState: DigitalPublishReadinessUiState;
  code:
    | "not_applicable"
    | "asset_missing"
    | "asset_inactive"
    | "asset_invalid_path"
    | "asset_store_mismatch"
    | "asset_product_mismatch"
    | "ready";
  message: string;
};

function requireServiceRoleEnv():
  | { ok: true; url: string; key: string }
  | { ok: false; message: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      message: "Digital publish readiness is unavailable (server configuration).",
    };
  }
  return { ok: true, url, key };
}

export function serviceRoleClientForDigitalReadiness():
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

/**
 * Pure readiness evaluation — never trusts client claims; callers must pass
 * server-fetched product + asset rows.
 */
export function evaluateDigitalProductPublishReadiness(input: {
  productType: string | null | undefined;
  storeId: string;
  productId: string;
  asset: DigitalAssetReadinessSnapshot | null;
}): DigitalPublishReadinessResult {
  const productType = String(input.productType ?? "").trim();
  if (productType !== "digital") {
    return {
      applicable: false,
      ready: true,
      uiState: "not_applicable",
      code: "not_applicable",
      message: "Digital asset readiness does not apply to non-digital products.",
    };
  }

  if (!input.asset) {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_missing",
      code: "asset_missing",
      message:
        "Attach an active digital deliverable before submitting this product for review. Use the Digital deliverable section below.",
    };
  }

  if (String(input.asset.storeId) !== String(input.storeId)) {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_invalid",
      code: "asset_store_mismatch",
      message:
        "Digital asset store ownership is invalid. Re-upload the deliverable in the Digital deliverable section.",
    };
  }

  if (String(input.asset.productId) !== String(input.productId)) {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_invalid",
      code: "asset_product_mismatch",
      message:
        "Digital asset product ownership is invalid. Re-upload the deliverable in the Digital deliverable section.",
    };
  }

  if (String(input.asset.status) !== "active") {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_invalid",
      code: "asset_inactive",
      message:
        "Digital asset is inactive. Upload or replace an active deliverable before review.",
    };
  }

  const path = String(input.asset.storagePath ?? "").trim();
  if (
    !isOwnedStoreDigitalProductAssetPath(
      String(input.storeId),
      String(input.productId),
      path
    )
  ) {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_invalid",
      code: "asset_invalid_path",
      message:
        "Digital asset path failed ownership checks. Re-upload a valid deliverable in the Digital deliverable section.",
    };
  }

  return {
    applicable: true,
    ready: true,
    uiState: "asset_ready",
    code: "ready",
    message:
      "Digital deliverable is active and ready for secure buyer delivery.",
  };
}

export async function loadDigitalAssetReadinessSnapshot(
  admin: AnyClient,
  input: { productId: string; storeId: string }
): Promise<DigitalAssetReadinessSnapshot | null> {
  const active = await resolveActiveDigitalAssetVersion(admin, input);
  if (!active) return null;
  return {
    storeId: active.storeId,
    productId: active.productId,
    status: active.status,
    storagePath: active.storagePath,
  };
}

/**
 * Server-side readiness for a known product. Uses service-role to read the
 * revoke-all assets table unless an admin client is injected.
 */
export async function resolveDigitalProductPublishReadiness(
  input: {
    productType: string | null | undefined;
    storeId: string;
    productId: string;
  },
  deps?: { admin?: AnyClient }
): Promise<DigitalPublishReadinessResult> {
  if (String(input.productType ?? "").trim() !== "digital") {
    return evaluateDigitalProductPublishReadiness({
      productType: input.productType,
      storeId: input.storeId,
      productId: input.productId,
      asset: null,
    });
  }

  const adminClient = deps?.admin
    ? { ok: true as const, supabase: deps.admin }
    : serviceRoleClientForDigitalReadiness();

  if (!adminClient.ok) {
    return {
      applicable: true,
      ready: false,
      uiState: "asset_invalid",
      code: "asset_missing",
      message: adminClient.message,
    };
  }

  const asset = await loadDigitalAssetReadinessSnapshot(adminClient.supabase, {
    productId: input.productId,
    storeId: input.storeId,
  });

  return evaluateDigitalProductPublishReadiness({
    productType: input.productType,
    storeId: input.storeId,
    productId: input.productId,
    asset,
  });
}

/**
 * Batch map productId → ready for marketplace discovery filtering.
 * Non-digital ids are treated as ready (not gated here).
 */
export async function mapDigitalPublishReadinessByProductId(
  admin: AnyClient,
  products: Array<{
    productId: string;
    storeId: string;
    productType: string | null | undefined;
  }>
): Promise<Map<string, DigitalPublishReadinessResult>> {
  const out = new Map<string, DigitalPublishReadinessResult>();
  const digital = products.filter(
    (p) => String(p.productType ?? "").trim() === "digital"
  );

  for (const p of products) {
    if (String(p.productType ?? "").trim() !== "digital") {
      out.set(
        p.productId,
        evaluateDigitalProductPublishReadiness({
          productType: p.productType,
          storeId: p.storeId,
          productId: p.productId,
          asset: null,
        })
      );
    }
  }

  if (digital.length === 0) return out;

  for (const p of digital) {
    const asset = await loadDigitalAssetReadinessSnapshot(admin, {
      productId: p.productId,
      storeId: p.storeId,
    });
    out.set(
      p.productId,
      evaluateDigitalProductPublishReadiness({
        productType: p.productType,
        storeId: p.storeId,
        productId: p.productId,
        asset,
      })
    );
  }

  return out;
}
