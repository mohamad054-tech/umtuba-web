/**
 * Order tracking foundation — provider-neutral shipment tracking models.
 * No carrier API integrations in this foundation.
 */

import {
  isShippingProviderKey,
  type ShippingProviderKey,
} from "./shipping";

export const TRACKING_STATUSES = [
  "pending",
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
  "returned",
  "cancelled",
] as const;
export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
  pending: "Pending",
  label_created: "Label created",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Exception",
  returned: "Returned",
  cancelled: "Cancelled",
};

export type ShipmentTrackingInput = {
  orderId: string;
  fulfillmentId?: string | null;
  providerKey: ShippingProviderKey;
  trackingNumber: string;
  trackingStatus?: TrackingStatus;
  estimatedDeliveryAt?: string | null;
  lastUpdateAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type DeliveryConfirmationInput = {
  trackingId: string;
  deliveredAt: string;
  confirmedBy: "carrier" | "seller" | "buyer" | "system";
  proofReference?: string | null;
};

export function isTrackingStatus(value: unknown): value is TrackingStatus {
  return (
    typeof value === "string" &&
    (TRACKING_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeTrackingNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const UNSAFE_URL_SCHEMES =
  /^(javascript|data|vbscript|file):/i;

/** Reject unsafe tracking URL schemes (javascript:, data:, etc.). */
export function validateTrackingUrl(
  url: string | null | undefined
): { ok: true; url: string } | { ok: false; message: string } {
  if (url == null || url.trim() === "") {
    return { ok: false, message: "Tracking URL is required." };
  }
  const trimmed = url.trim();
  if (trimmed.length > 500) {
    return { ok: false, message: "Tracking URL is too long." };
  }
  if (UNSAFE_URL_SCHEMES.test(trimmed)) {
    return { ok: false, message: "Tracking URL scheme is not allowed." };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, message: "Tracking URL must use http or https." };
  }
  return { ok: true, url: trimmed };
}

/** Shipment metadata must be a plain object without executable payloads. */
export function validateShipmentMetadata(
  metadata: Record<string, unknown> | null | undefined
): { ok: true; metadata: Record<string, unknown> } | { ok: false; message: string } {
  if (metadata == null) {
    return { ok: true, metadata: {} };
  }
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return { ok: false, message: "Metadata must be an object." };
  }
  for (const [key, value] of Object.entries(metadata)) {
    if (key.toLowerCase().includes("script")) {
      return { ok: false, message: "Metadata key is not allowed." };
    }
    if (typeof value === "string" && UNSAFE_URL_SCHEMES.test(value.trim())) {
      return { ok: false, message: "Metadata contains unsafe URL scheme." };
    }
  }
  return { ok: true, metadata: { ...metadata } };
}

export function validateShipmentTracking(
  input: ShipmentTrackingInput
): { ok: true; trackingNumber: string } | { ok: false; message: string } {
  if (!input.orderId.trim()) {
    return { ok: false, message: "Order id is required." };
  }
  if (!isShippingProviderKey(input.providerKey)) {
    return { ok: false, message: "Invalid shipping provider." };
  }
  const trackingNumber = normalizeTrackingNumber(input.trackingNumber);
  if (trackingNumber.length < 4 || trackingNumber.length > 64) {
    return {
      ok: false,
      message: "Tracking number must be 4–64 characters.",
    };
  }
  if (!/^[A-Z0-9-]+$/.test(trackingNumber)) {
    return {
      ok: false,
      message: "Tracking number contains invalid characters.",
    };
  }
  if (
    input.trackingStatus != null &&
    !isTrackingStatus(input.trackingStatus)
  ) {
    return { ok: false, message: "Invalid tracking status." };
  }
  return { ok: true, trackingNumber };
}

export function validateDeliveryConfirmation(
  input: DeliveryConfirmationInput
): { ok: true } | { ok: false; message: string } {
  if (!input.trackingId.trim()) {
    return { ok: false, message: "Tracking id is required." };
  }
  if (!input.deliveredAt.trim()) {
    return { ok: false, message: "Delivered timestamp is required." };
  }
  const allowed = ["carrier", "seller", "buyer", "system"] as const;
  if (!allowed.includes(input.confirmedBy)) {
    return { ok: false, message: "Invalid delivery confirmation source." };
  }
  return { ok: true };
}

export function mapTrackingRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("not authorized")) return "You cannot update tracking for this order.";
  if (m.includes("not found")) return "Shipment tracking not found.";
  if (m.includes("already delivered")) return "Shipment is already marked delivered.";
  return message || "Tracking request failed.";
}
