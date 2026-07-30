/**
 * Commerce Buyer Digital Access Delivery V1.
 * Entitlement-gated short-lived signed access. Server-only signing.
 * Never returns permanent paths or service credentials to the client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS,
  STORE_PRODUCT_MEDIA_BUCKET,
  isOwnedStoreDigitalProductAssetPath,
} from "./mediaConstants";
import { resolveActiveDigitalAssetVersion } from "./digitalProductVersioning";

export const DIGITAL_ACCESS_DELIVERY_ID =
  "commerce.digital.buyer_access_delivery_v1" as const;

export const STORE_DIGITAL_PRODUCT_ASSETS_TABLE =
  "store_digital_product_assets" as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AnyClient = SupabaseClient;

export type DigitalDeliveryAvailability =
  | "available"
  | "unavailable"
  | "inactive"
  | "unsupported";

export type MintDigitalAccessResult =
  | {
      ok: true;
      signedUrl: string;
      expiresInSeconds: number;
      title: string | null;
    }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "invalid_entitlement_id"
        | "entitlement_missing"
        | "entitlement_inactive"
        | "not_owner"
        | "physical_product"
        | "asset_missing"
        | "asset_inactive"
        | "unsafe_path"
        | "sign_failed"
        | "server_misconfigured";
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
      message: "Digital access delivery is unavailable (server configuration).",
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

export function isDigitalAccessEntitlementId(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/**
 * Probe whether an entitlement can be delivered — never returns storage paths.
 */
export async function resolveDigitalDeliveryAvailability(
  admin: AnyClient,
  input: {
    productId: string;
    storeId: string;
    entitlementStatus: string;
  }
): Promise<DigitalDeliveryAvailability> {
  if (input.entitlementStatus !== "active") return "inactive";

  const { data: product } = await admin
    .from("store_products")
    .select("id, store_id, product_type")
    .eq("id", input.productId)
    .maybeSingle();

  if (!product || product.store_id !== input.storeId) return "unavailable";
  if (String(product.product_type) !== "digital") return "unsupported";

  const active = await resolveActiveDigitalAssetVersion(admin, {
    productId: input.productId,
    storeId: input.storeId,
  });
  if (!active) return "unavailable";
  return "available";
}

/**
 * Re-verify entitlement ownership then mint a short-lived signed URL.
 * `userClient` must be the authenticated buyer session.
 * Signing uses service-role storage (buyers have no private object grants).
 */
export async function mintBuyerDigitalAccessSignedUrl(
  userClient: AnyClient,
  input: { entitlementId: string; userId: string | null | undefined },
  deps?: { admin?: AnyClient }
): Promise<MintDigitalAccessResult> {
  if (!input.userId) {
    return {
      ok: false,
      code: "unauthenticated",
      message: "Sign in required to open digital access.",
    };
  }

  const entitlementId = input.entitlementId.trim();
  if (!isDigitalAccessEntitlementId(entitlementId)) {
    return {
      ok: false,
      code: "invalid_entitlement_id",
      message: "Invalid digital entitlement.",
    };
  }

  const { data: entitlement, error: entitlementError } = await userClient
    .from("store_digital_entitlements")
    .select(
      "id, buyer_id, order_id, order_item_id, product_id, store_id, status, title_snapshot"
    )
    .eq("id", entitlementId)
    .maybeSingle();

  if (entitlementError || !entitlement) {
    return {
      ok: false,
      code: "entitlement_missing",
      message: "Digital entitlement was not found.",
    };
  }

  if (String(entitlement.buyer_id) !== input.userId) {
    return {
      ok: false,
      code: "not_owner",
      message: "Digital entitlement is not available for this account.",
    };
  }

  if (String(entitlement.status) !== "active") {
    return {
      ok: false,
      code: "entitlement_inactive",
      message: "This digital entitlement is inactive.",
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

  const productId = String(entitlement.product_id);
  const storeId = String(entitlement.store_id);

  const { data: product } = await admin
    .from("store_products")
    .select("id, store_id, product_type")
    .eq("id", productId)
    .maybeSingle();

  if (!product || product.store_id !== storeId) {
    return {
      ok: false,
      code: "asset_missing",
      message: "Digital product is unavailable.",
    };
  }
  if (String(product.product_type) !== "digital") {
    return {
      ok: false,
      code: "physical_product",
      message: "This item is not a digital product.",
    };
  }

  const { data: orderItem } = await admin
    .from("order_items")
    .select("id, order_id, product_id")
    .eq("id", String(entitlement.order_item_id))
    .maybeSingle();

  if (
    !orderItem ||
    String(orderItem.order_id) !== String(entitlement.order_id) ||
    String(orderItem.product_id) !== productId
  ) {
    return {
      ok: false,
      code: "entitlement_missing",
      message: "Digital entitlement does not match the order item.",
    };
  }

  const active = await resolveActiveDigitalAssetVersion(admin, {
    productId,
    storeId,
  });

  if (!active) {
    return {
      ok: false,
      code: "asset_missing",
      message: "Secure digital file is not ready for this product yet.",
    };
  }

  const storagePath = active.storagePath;
  if (!isOwnedStoreDigitalProductAssetPath(storeId, productId, storagePath)) {
    return {
      ok: false,
      code: "unsafe_path",
      message: "Digital asset path failed ownership checks.",
    };
  }

  const expiresInSeconds = STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS;
  const { data: signed, error: signError } = await admin.storage
    .from(STORE_PRODUCT_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (signError || !signed?.signedUrl) {
    console.error("mintBuyerDigitalAccessSignedUrl sign failed");
    return {
      ok: false,
      code: "sign_failed",
      message: "Unable to prepare secure digital access. Try again.",
    };
  }

  return {
    ok: true,
    signedUrl: signed.signedUrl,
    expiresInSeconds,
    title:
      active.title ||
      (typeof entitlement.title_snapshot === "string"
        ? entitlement.title_snapshot
        : null),
  };
}
