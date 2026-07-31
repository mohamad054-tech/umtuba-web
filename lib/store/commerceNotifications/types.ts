/**
 * Commerce Transactional Notifications V1 — contracts only for external channels.
 * In-app delivery reuses platform `create_notification` foundation.
 */

export const COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION =
  "commerce-transactional-notifications-v1" as const;

export const COMMERCE_NOTIFICATION_EVENT_TYPES = [
  "order_created",
  "payment_pending",
  "payment_captured",
  "payment_failed",
  "order_confirmed",
  "order_cancelled",
  "fulfillment_ready",
  "digital_access_granted",
  "order_shipped",
  "order_delivered",
  "refund_requested",
  "refund_completed",
  "refund_rejected",
  "refund_failed",
  "product_approved",
  "product_rejected",
  "seller_approved",
  "seller_rejected",
  "inventory_low",
  "inventory_out",
  "payout_ready",
  "payout_blocked",
] as const;

export type CommerceNotificationEventType =
  (typeof COMMERCE_NOTIFICATION_EVENT_TYPES)[number];

/** Maps commerce event → platform notifications.type (DB allowlist). */
export function commerceEventToNotificationType(
  eventType: CommerceNotificationEventType
): string {
  return `commerce_${eventType}`;
}

export type CommerceRecipientRole =
  | "buyer"
  | "seller"
  | "supplier"
  | "store_owner"
  | "platform_admin";

export type CommerceNotificationChannel =
  | "in_app"
  | "email"
  | "sms"
  | "push";

export type CommerceIntentDeliveryStatus =
  | "created"
  | "queued"
  | "delivered"
  | "read"
  | "dismissed"
  | "failed"
  | "suppressed";

export type CommerceNotificationPermission =
  | "notification_create"
  | "notification_read_self"
  | "notification_read_store"
  | "notification_read_admin"
  | "notification_manage_templates"
  | "notification_retry"
  | "notification_suppress";

export type CommerceSafeMetadata = Record<
  string,
  string | number | boolean | null
>;

export type CommerceNotificationEvent = {
  eventId: string;
  eventType: CommerceNotificationEventType;
  orderId: string | null;
  paymentId: string | null;
  fulfillmentId: string | null;
  storeId: string | null;
  buyerId: string | null;
  sellerId: string | null;
  supplierId: string | null;
  actorId: string | null;
  occurredAt: string;
  correlationId: string;
  idempotencyKey: string;
  metadata: CommerceSafeMetadata;
  auditLinkage: string | null;
};

export type CommerceNotificationIntent = {
  intentId: string;
  eventId: string;
  recipientId: string;
  recipientRole: CommerceRecipientRole;
  channel: CommerceNotificationChannel;
  templateId: string;
  locale: string;
  titleKey: string;
  bodyKey: string;
  title: string;
  body: string;
  deepLink: string | null;
  priority: "low" | "normal" | "high";
  deliveryPolicy: "in_app_only_v1";
  dedupeKey: string;
  status: CommerceIntentDeliveryStatus;
  suppressedReason: string | null;
  inAppNotificationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommerceNotificationTemplate = {
  templateId: string;
  eventType: CommerceNotificationEventType;
  recipientRole: CommerceRecipientRole;
  locales: string[];
  titleKey: string;
  bodyKey: string;
  requiredVariables: string[];
  lifecycle: "active" | "deprecated";
  version: number;
};

export type ResolvedRecipient = {
  recipientId: string;
  role: CommerceRecipientRole;
  storeId: string | null;
};
