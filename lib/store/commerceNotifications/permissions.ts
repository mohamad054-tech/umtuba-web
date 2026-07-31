import type { CommerceNotificationPermission } from "./types";

export type CommerceNotificationAuthContext = {
  userId: string | null;
  isPlatformAdmin: boolean;
  storeIdsManaged: string[];
};

export function hasCommerceNotificationPermission(
  ctx: CommerceNotificationAuthContext,
  permission: CommerceNotificationPermission,
  scope?: { storeId?: string | null; recipientId?: string | null }
): boolean {
  if (!ctx.userId) return false;

  switch (permission) {
    case "notification_create":
      // Server-only emitters; never grant to browser callers.
      return false;
    case "notification_read_self":
      return Boolean(scope?.recipientId && scope.recipientId === ctx.userId);
    case "notification_read_store": {
      const storeId = scope?.storeId;
      return Boolean(storeId && ctx.storeIdsManaged.includes(storeId));
    }
    case "notification_read_admin":
    case "notification_manage_templates":
    case "notification_retry":
    case "notification_suppress":
      return ctx.isPlatformAdmin;
    default:
      return false;
  }
}

/** Server emitters use this internal capability flag (never from client). */
export const COMMERCE_NOTIFICATION_SERVER_CREATE = {
  permission: "notification_create" as const,
  serverOnly: true,
};
