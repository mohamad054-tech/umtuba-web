/**
 * Commerce Post-Capture Digital Entitlement Grant V1.
 * Server-side helpers for grant after trusted capture + buyer list reads.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const DIGITAL_ENTITLEMENT_GRANT_ID =
  "commerce.digital.post_capture_entitlement_grant_v1" as const;

export const STORE_DIGITAL_ENTITLEMENT_GRANT_RPC =
  "grant_store_digital_entitlements_after_capture" as const;

export const STORE_DIGITAL_ENTITLEMENT_LIST_RPC =
  "list_my_store_digital_entitlements" as const;

export type DigitalEntitlementRow = {
  id: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  storeId: string;
  status: string;
  titleSnapshot: string | null;
  skuSnapshot: string | null;
  grantedAt: string;
};

export type DigitalEntitlementGrantResult =
  | {
      status: "granted";
      replayed: boolean;
      entitlementsGranted: number;
      reservationsConsumed: number;
      fulfillmentMarked: boolean;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

type AnyClient = SupabaseClient;

export function buildDigitalEntitlementGrantEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:entitlement`;
}

export async function grantDigitalEntitlementsAfterTrustedCapture(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    captureEventKey: string;
    correlationId: string;
  }
): Promise<DigitalEntitlementGrantResult> {
  const eventKey = buildDigitalEntitlementGrantEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 160) {
    return {
      status: "failed",
      message: "Digital entitlement grant event_key length is invalid.",
    };
  }

  const { data, error } = await supabase.rpc(
    STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
    {
      p_payment_attempt_id: input.paymentAttemptId,
      p_event_key: eventKey,
      p_correlation_id: input.correlationId,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Digital entitlement grant failed after trusted capture.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    status: "granted",
    replayed: Boolean(payload.replayed),
    entitlementsGranted: Number(payload.entitlements_granted ?? 0),
    reservationsConsumed: Number(payload.reservations_consumed ?? 0),
    fulfillmentMarked: Boolean(payload.fulfillment_marked),
    data: payload,
  };
}

export async function listMyDigitalEntitlements(
  supabase: AnyClient,
  input?: { orderId?: string; limit?: number }
): Promise<
  | { ok: true; entitlements: DigitalEntitlementRow[] }
  | { ok: false; message: string }
> {
  const { data, error } = await supabase.rpc(
    STORE_DIGITAL_ENTITLEMENT_LIST_RPC,
    {
      p_order_id: input?.orderId?.trim() || null,
      p_limit: input?.limit ?? 50,
    }
  );
  if (error) {
    return {
      ok: false,
      message: error.message?.trim() || "Unable to load digital entitlements.",
    };
  }
  const payload = (data ?? {}) as { entitlements?: unknown };
  const rows = Array.isArray(payload.entitlements) ? payload.entitlements : [];
  const entitlements: DigitalEntitlementRow[] = [];
  for (const raw of rows) {
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? "");
    if (!id) continue;
    entitlements.push({
      id,
      orderId: String(row.order_id ?? ""),
      orderItemId: String(row.order_item_id ?? ""),
      productId: String(row.product_id ?? ""),
      storeId: String(row.store_id ?? ""),
      status: String(row.status ?? "active"),
      titleSnapshot:
        typeof row.title_snapshot === "string" ? row.title_snapshot : null,
      skuSnapshot:
        typeof row.sku_snapshot === "string" ? row.sku_snapshot : null,
      grantedAt: String(row.granted_at ?? ""),
    });
  }
  return { ok: true, entitlements };
}
