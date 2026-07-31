import type {
  CommerceNotificationEvent,
  CommerceNotificationEventType,
  ResolvedRecipient,
} from "./types";

const ROLE_MAP: Record<
  CommerceNotificationEventType,
  Array<"buyer" | "seller" | "supplier" | "store_owner" | "platform_admin">
> = {
  order_created: ["buyer", "seller", "supplier"],
  payment_pending: ["buyer"],
  payment_captured: ["buyer", "seller"],
  payment_failed: ["buyer"],
  order_confirmed: ["buyer", "seller"],
  order_cancelled: ["buyer", "seller"],
  fulfillment_ready: ["seller", "supplier"],
  digital_access_granted: ["buyer"],
  order_shipped: ["buyer", "seller", "supplier"],
  order_delivered: ["buyer", "seller"],
  refund_requested: ["buyer", "seller"],
  refund_completed: ["buyer", "seller"],
  refund_rejected: ["buyer", "seller"],
  refund_failed: ["buyer", "seller"],
  product_approved: ["seller", "platform_admin"],
  product_rejected: ["seller", "platform_admin"],
  seller_approved: ["seller", "platform_admin"],
  seller_rejected: ["seller"],
  inventory_low: ["seller"],
  inventory_out: ["seller"],
  payout_ready: ["seller"],
  payout_blocked: ["seller"],
};

/** Roles that must resolve or the emit fails closed. */
const REQUIRED_ROLES: Partial<
  Record<CommerceNotificationEventType, Array<"buyer" | "seller">>
> = {
  order_created: ["buyer"],
  payment_pending: ["buyer"],
  payment_captured: ["buyer"],
  payment_failed: ["buyer"],
  digital_access_granted: ["buyer"],
  inventory_low: ["seller"],
  inventory_out: ["seller"],
  seller_approved: ["seller"],
  seller_rejected: ["seller"],
  product_approved: ["seller"],
  product_rejected: ["seller"],
};

export type RecipientResolutionInput = {
  event: Pick<
    CommerceNotificationEvent,
    | "eventType"
    | "storeId"
    | "buyerId"
    | "sellerId"
    | "supplierId"
    | "orderId"
  >;
  storeOwnerId?: string | null;
  platformAdminIds?: string[];
  supplierOwnedListing?: boolean;
};

export type RecipientResolutionResult =
  | { ok: true; recipients: ResolvedRecipient[] }
  | { ok: false; message: string; code: string };

/**
 * Fail-closed recipient resolution. Never crosses store/tenant boundaries:
 * recipients are taken only from trusted event identity fields.
 */
export function resolveCommerceNotificationRecipients(
  input: RecipientResolutionInput
): RecipientResolutionResult {
  const roles = ROLE_MAP[input.event.eventType];
  if (!roles) {
    return { ok: false, message: "Unknown event type.", code: "unknown_event" };
  }

  const required = REQUIRED_ROLES[input.event.eventType] ?? [];
  for (const role of required) {
    if (role === "buyer" && !input.event.buyerId?.trim()) {
      return {
        ok: false,
        message: "buyerId is required for this event.",
        code: "missing_buyer",
      };
    }
    if (role === "seller") {
      const seller = input.event.sellerId?.trim() || input.storeOwnerId?.trim();
      if (!seller) {
        return {
          ok: false,
          message: "sellerId is required for this event.",
          code: "missing_seller",
        };
      }
    }
  }

  const out: ResolvedRecipient[] = [];
  const seenRecipients = new Set<string>();

  const push = (
    recipientId: string | null | undefined,
    role: ResolvedRecipient["role"]
  ) => {
    const id = recipientId?.trim() ?? "";
    if (!id || seenRecipients.has(id)) return;
    seenRecipients.add(id);
    out.push({
      recipientId: id,
      role,
      storeId: input.event.storeId,
    });
  };

  for (const role of roles) {
    if (role === "buyer") {
      push(input.event.buyerId, "buyer");
    } else if (role === "seller" || role === "store_owner") {
      const seller = input.event.sellerId?.trim() || input.storeOwnerId?.trim();
      push(seller, role === "store_owner" ? "store_owner" : "seller");
    } else if (role === "supplier") {
      if (input.supplierOwnedListing === false) continue;
      const supplierId = input.event.supplierId?.trim();
      if (!supplierId) continue;
      if (supplierId === input.event.sellerId?.trim()) continue;
      push(supplierId, "supplier");
    } else if (role === "platform_admin") {
      for (const adminId of input.platformAdminIds ?? []) {
        push(adminId, "platform_admin");
      }
    }
  }

  if (out.length === 0) {
    return {
      ok: false,
      message: "No valid recipients resolved.",
      code: "no_recipients",
    };
  }

  return { ok: true, recipients: out };
}

export function assertSameStoreScope(
  eventStoreId: string | null,
  expectedStoreId: string | null
): boolean {
  if (!expectedStoreId) return true;
  if (!eventStoreId) return false;
  return eventStoreId === expectedStoreId;
}
