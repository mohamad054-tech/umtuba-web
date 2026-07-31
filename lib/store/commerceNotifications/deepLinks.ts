import type {
  CommerceNotificationEvent,
  CommerceRecipientRole,
} from "./types";

const ALLOWED_PREFIXES = [
  "/store/orders/",
  "/store/orders?",
  "/store/orders/digital-access",
  "/seller/store",
  "/seller/store/orders/",
  "/seller/store/products/",
  "/seller/store/inventory",
  "/seller/store/marketplace",
  "/seller/setup",
  "/admin/store/products",
  "/admin/store/sellers",
  "/admin/store/notifications",
  "/admin/store/refunds",
  "/notifications",
] as const;

export function isAllowedCommerceDeepLink(href: string | null): boolean {
  if (!href) return false;
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//") || href.includes("://")) return false;
  return ALLOWED_PREFIXES.some(
    (p) => href === p || href.startsWith(p.endsWith("/") ? p : `${p}`)
  );
}

export function buildCommerceDeepLink(input: {
  role: CommerceRecipientRole;
  event: Pick<
    CommerceNotificationEvent,
    "eventType" | "orderId" | "storeId" | "buyerId"
  > & { productId?: string | null };
}): string | null {
  const { role, event } = input;
  switch (event.eventType) {
    case "digital_access_granted":
      if (role === "buyer") {
        return event.orderId
          ? `/store/orders/${event.orderId}`
          : "/store/orders/digital-access";
      }
      break;
    case "order_created":
    case "payment_pending":
    case "payment_captured":
    case "payment_failed":
    case "order_confirmed":
    case "order_cancelled":
    case "fulfillment_ready":
    case "order_shipped":
    case "order_delivered":
    case "refund_requested":
    case "refund_completed":
    case "refund_rejected":
    case "refund_failed":
      if (role === "platform_admin") {
        return "/admin/store/refunds";
      }
      if (role === "buyer" && event.orderId) {
        return `/store/orders/${event.orderId}`;
      }
      if (
        (role === "seller" || role === "store_owner" || role === "supplier") &&
        event.orderId
      ) {
        return `/seller/store/orders/${event.orderId}`;
      }
      break;
    case "product_approved":
    case "product_rejected":
      if (input.event.productId) {
        if (role === "platform_admin") return "/admin/store/products";
        return `/seller/store/products/${input.event.productId}/edit`;
      }
      if (role === "platform_admin") return "/admin/store/products";
      return "/seller/store/products";
    case "seller_approved":
    case "seller_rejected":
      if (role === "platform_admin") return "/admin/store/sellers";
      return "/seller/setup";
    case "inventory_low":
    case "inventory_out":
      return "/seller/store/inventory";
    case "payout_ready":
    case "payout_blocked":
      return "/seller/store";
    default:
      break;
  }
  return null;
}

export function sanitizeCommerceDeepLink(href: string | null): string | null {
  if (!href) return null;
  return isAllowedCommerceDeepLink(href) ? href : null;
}
