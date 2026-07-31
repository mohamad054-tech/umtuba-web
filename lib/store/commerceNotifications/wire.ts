/**
 * Thin post-success wiring helpers. Never mutate commerce business results.
 */

import {
  buildEventIdempotencyKey,
  notifyCommerceBestEffort,
} from "./service";
import type { CommerceNotificationEventType } from "./types";

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function pick(payload: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = asString(payload[key]);
    if (v) return v;
  }
  return null;
}

export function wireCommerceOrderCreated(payload: Record<string, unknown>) {
  const orderId = pick(payload, "order_id", "orderId");
  const buyerId = pick(payload, "buyer_id", "buyerId");
  const storeId = pick(payload, "store_id", "storeId");
  const sellerId = pick(payload, "seller_id", "sellerId", "owner_user_id");
  const supplierId = pick(payload, "supplier_store_owner_id", "supplierId");
  if (!orderId || !buyerId) return null;
  return notifyCommerceBestEffort({
    eventType: "order_created",
    orderId,
    buyerId,
    storeId,
    sellerId,
    supplierId,
    supplierOwnedListing: Boolean(supplierId),
    idempotencyKey: buildEventIdempotencyKey({
      eventType: "order_created",
      orderId,
      storeId,
    }),
    metadata: { source: "checkout_confirm" },
  });
}

export function wireCommercePaymentOutcome(input: {
  outcome: string;
  paymentAttemptId: string;
  correlationId: string;
  payload: Record<string, unknown>;
  entitlementGranted?: boolean;
}) {
  const orderId = pick(input.payload, "order_id", "orderId");
  const buyerId = pick(input.payload, "buyer_id", "buyerId");
  const storeId = pick(input.payload, "store_id", "storeId");
  const sellerId = pick(input.payload, "seller_id", "sellerId", "owner_user_id");

  let eventType: CommerceNotificationEventType | null = null;
  if (input.outcome === "captured") eventType = "payment_captured";
  else if (
    input.outcome === "failed" ||
    input.outcome === "cancelled" ||
    input.outcome === "expired"
  ) {
    eventType = "payment_failed";
  }
  if (!eventType) return null;

  const result = notifyCommerceBestEffort({
    eventType,
    orderId,
    paymentId: input.paymentAttemptId,
    buyerId,
    storeId,
    sellerId,
    correlationId: input.correlationId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType,
      orderId,
      paymentId: input.paymentAttemptId,
      storeId,
      correlationId: input.correlationId,
    }),
    metadata: { outcome: input.outcome, source: "payment_outcome_sync" },
  });

  if (input.outcome === "captured" && input.entitlementGranted) {
    notifyCommerceBestEffort({
      eventType: "digital_access_granted",
      orderId,
      paymentId: input.paymentAttemptId,
      buyerId,
      storeId,
      sellerId,
      correlationId: input.correlationId,
      idempotencyKey: buildEventIdempotencyKey({
        eventType: "digital_access_granted",
        orderId,
        paymentId: input.paymentAttemptId,
        storeId,
        correlationId: input.correlationId,
      }),
      metadata: { source: "digital_entitlement_grant" },
    });
  }

  return result;
}

export function wireCommerceFulfillmentUpdate(input: {
  orderId: string;
  fulfillmentStatus: string;
  orderStatus?: string;
  buyerId?: string | null;
  sellerId?: string | null;
  storeId?: string | null;
  supplierId?: string | null;
}) {
  let eventType: CommerceNotificationEventType | null = null;
  if (input.fulfillmentStatus === "shipped") eventType = "order_shipped";
  else if (input.fulfillmentStatus === "delivered") eventType = "order_delivered";
  else if (input.fulfillmentStatus === "packed" || input.fulfillmentStatus === "ready") {
    eventType = "fulfillment_ready";
  } else if (input.orderStatus === "cancelled") {
    eventType = "order_cancelled";
  } else if (input.orderStatus === "confirmed") {
    eventType = "order_confirmed";
  }
  if (!eventType) return null;

  return notifyCommerceBestEffort({
    eventType,
    orderId: input.orderId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    storeId: input.storeId,
    supplierId: input.supplierId,
    supplierOwnedListing: Boolean(input.supplierId),
    idempotencyKey: buildEventIdempotencyKey({
      eventType,
      orderId: input.orderId,
      storeId: input.storeId,
      suffix: input.fulfillmentStatus,
    }),
    metadata: {
      fulfillment_status: input.fulfillmentStatus,
      order_status: input.orderStatus ?? null,
    },
  });
}

export function wireCommerceModeration(input: {
  kind: "product_approved" | "product_rejected" | "seller_approved" | "seller_rejected";
  sellerId?: string | null;
  storeId?: string | null;
  productId?: string | null;
  actorId?: string | null;
  platformAdminIds?: string[];
}) {
  return notifyCommerceBestEffort({
    eventType: input.kind,
    sellerId: input.sellerId,
    storeId: input.storeId,
    productId: input.productId,
    actorId: input.actorId,
    platformAdminIds: input.platformAdminIds,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: input.kind,
      storeId: input.storeId,
      productId: input.productId,
      suffix: input.sellerId ?? "seller",
    }),
    metadata: { source: "admin_moderation" },
  });
}

export function wireCommerceRefundRequested(input: {
  orderId: string;
  storeId: string;
  paymentAttemptId: string;
  buyerId?: string | null;
  sellerId?: string | null;
}) {
  return notifyCommerceBestEffort({
    eventType: "refund_requested",
    orderId: input.orderId,
    storeId: input.storeId,
    paymentId: input.paymentAttemptId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: "refund_requested",
      orderId: input.orderId,
      paymentId: input.paymentAttemptId,
      storeId: input.storeId,
    }),
    metadata: { source: "refund_operations" },
  });
}

export function wireCommerceRefundCompleted(input: {
  orderId: string;
  storeId: string;
  paymentAttemptId: string;
  buyerId?: string | null;
  sellerId?: string | null;
  correlationId?: string | null;
}) {
  return notifyCommerceBestEffort({
    eventType: "refund_completed",
    orderId: input.orderId,
    storeId: input.storeId,
    paymentId: input.paymentAttemptId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    correlationId: input.correlationId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: "refund_completed",
      orderId: input.orderId,
      paymentId: input.paymentAttemptId,
      storeId: input.storeId,
    }),
    metadata: { source: "full_order_refund_path" },
  });
}

export function wireCommerceRefundRejected(input: {
  orderId: string;
  storeId: string;
  paymentAttemptId: string;
  buyerId?: string | null;
  sellerId?: string | null;
  reason?: string | null;
}) {
  return notifyCommerceBestEffort({
    eventType: "refund_rejected",
    orderId: input.orderId,
    storeId: input.storeId,
    paymentId: input.paymentAttemptId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: "refund_rejected",
      orderId: input.orderId,
      paymentId: input.paymentAttemptId,
      storeId: input.storeId,
    }),
    metadata: {
      source: "refund_operations",
      reason: input.reason ? String(input.reason).slice(0, 120) : null,
    },
  });
}

export function wireCommerceRefundFailed(input: {
  orderId: string;
  storeId: string;
  paymentAttemptId: string;
  buyerId?: string | null;
  sellerId?: string | null;
  code?: string | null;
}) {
  return notifyCommerceBestEffort({
    eventType: "refund_failed",
    orderId: input.orderId,
    storeId: input.storeId,
    paymentId: input.paymentAttemptId,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: "refund_failed",
      orderId: input.orderId,
      paymentId: input.paymentAttemptId,
      storeId: input.storeId,
    }),
    metadata: {
      source: "refund_operations",
      code: input.code ? String(input.code).slice(0, 80) : null,
    },
  });
}

export function wireCommerceInventorySignal(input: {
  kind: "inventory_low" | "inventory_out";
  sellerId: string;
  storeId: string;
  sku?: string | null;
}) {
  return notifyCommerceBestEffort({
    eventType: input.kind,
    sellerId: input.sellerId,
    storeId: input.storeId,
    idempotencyKey: buildEventIdempotencyKey({
      eventType: input.kind,
      storeId: input.storeId,
      suffix: input.sku ?? "sku",
    }),
    metadata: { sku: input.sku ?? null, source: "inventory_signal" },
  });
}
