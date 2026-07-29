/**
 * Buyer Orders Experience V1 — pure presentation helpers.
 * Maps trusted order/payment/fulfillment data into customer-readable UI.
 * Does not invent money, carriers, tracking, or unconfirmed timeline steps.
 */

import {
  formatFulfillmentStatus,
  formatOrderMoney,
  formatOrderStatus,
  formatPaymentStatus,
  isFulfillmentStatus,
  isOrderStatus,
  isPaymentStatus,
} from "./orderRules";
import type {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  StoreOrderRow,
} from "./types";

export type BuyerStatusChip = {
  kind: "order" | "payment" | "fulfillment" | "delivery";
  label: string;
  tone: "neutral" | "info" | "warn" | "good" | "bad";
  raw: string;
};

export type BuyerMoneyRow = {
  key: "subtotal" | "discount" | "tax" | "shipping" | "grand";
  label: string;
  amountMinor: number;
  negative?: boolean;
  emphasize?: boolean;
};

export type BuyerOrderAction =
  | { id: "view_store"; label: string; href: string; enabled: true }
  | { id: "continue_shopping"; label: string; href: string; enabled: true }
  | { id: "view_orders"; label: string; href: string; enabled: true }
  | {
      id: "cancel_unpaid";
      label: string;
      enabled: boolean;
      reason?: string;
    }
  | {
      id: "retry_deferred_payment";
      label: string;
      enabled: boolean;
      reason?: string;
    };

export type ConfirmedTimelineEvent = {
  key: string;
  label: string;
  at: string;
  kind: "order" | "payment" | "fulfillment" | "delivery";
};

const ORDER_BUYER_LABELS: Record<OrderStatus, string> = {
  pending: "Pending confirmation",
  confirmed: "Confirmed",
  processing: "Preparing",
  packed: "Ready for shipping",
  shipped: "Handed to shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const PAYMENT_BUYER_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  authorized: "Payment authorized",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Payment refunded",
};

const FULFILLMENT_BUYER_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Not fulfilled",
  partial: "Partially fulfilled",
  fulfilled: "Fulfilled",
};

export function buyerOrderStatusLabel(status: unknown): string {
  if (isOrderStatus(status)) return ORDER_BUYER_LABELS[status];
  return typeof status === "string" && status.trim()
    ? `Unknown order state (${status})`
    : "Unknown order state";
}

export function buyerPaymentStatusLabel(status: unknown): string {
  if (isPaymentStatus(status)) return PAYMENT_BUYER_LABELS[status];
  return typeof status === "string" && status.trim()
    ? `Unknown payment state (${status})`
    : "Unknown payment state";
}

export function buyerFulfillmentStatusLabel(status: unknown): string {
  if (isFulfillmentStatus(status)) return FULFILLMENT_BUYER_LABELS[status];
  return typeof status === "string" && status.trim()
    ? `Unknown fulfillment state (${status})`
    : "Unknown fulfillment state";
}

/**
 * Delivery presentation is derived only from trusted order stamps/status.
 * Never invents carriers, tracking, or ETAs.
 */
export function buyerDeliveryStatusLabel(input: {
  status: unknown;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}): { label: string; tone: BuyerStatusChip["tone"]; raw: string } {
  if (input.deliveredAt || input.status === "delivered") {
    return { label: "Delivered", tone: "good", raw: "delivered" };
  }
  if (input.shippedAt || input.status === "shipped") {
    return {
      label: "Handed to shipping",
      tone: "info",
      raw: "handed_to_shipping",
    };
  }
  if (input.status === "cancelled" || input.status === "refunded") {
    return { label: "Delivery not applicable", tone: "neutral", raw: "na" };
  }
  if (input.status === "packed") {
    return {
      label: "Ready for shipping",
      tone: "info",
      raw: "ready_for_shipping",
    };
  }
  return {
    label: "Not handed to shipping",
    tone: "warn",
    raw: "not_handed",
  };
}

export function buildBuyerStatusChips(input: {
  status: unknown;
  paymentStatus: unknown;
  fulfillmentStatus: unknown;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}): BuyerStatusChip[] {
  const orderTone: BuyerStatusChip["tone"] = isOrderStatus(input.status)
    ? input.status === "cancelled" || input.status === "refunded"
      ? "bad"
      : input.status === "delivered" || input.status === "shipped"
        ? "good"
        : input.status === "pending"
          ? "warn"
          : "info"
    : "neutral";

  const paymentTone: BuyerStatusChip["tone"] = isPaymentStatus(
    input.paymentStatus
  )
    ? input.paymentStatus === "paid"
      ? "good"
      : input.paymentStatus === "failed" || input.paymentStatus === "refunded"
        ? "bad"
        : "warn"
    : "neutral";

  const fulfillmentTone: BuyerStatusChip["tone"] = isFulfillmentStatus(
    input.fulfillmentStatus
  )
    ? input.fulfillmentStatus === "fulfilled"
      ? "good"
      : input.fulfillmentStatus === "partial"
        ? "info"
        : "warn"
    : "neutral";

  const delivery = buyerDeliveryStatusLabel(input);

  return [
    {
      kind: "order",
      label: `Order · ${buyerOrderStatusLabel(input.status)}`,
      tone: orderTone,
      raw: String(input.status ?? "unknown"),
    },
    {
      kind: "payment",
      label: `Payment · ${buyerPaymentStatusLabel(input.paymentStatus)}`,
      tone: paymentTone,
      raw: String(input.paymentStatus ?? "unknown"),
    },
    {
      kind: "fulfillment",
      label: `Fulfillment · ${buyerFulfillmentStatusLabel(input.fulfillmentStatus)}`,
      tone: fulfillmentTone,
      raw: String(input.fulfillmentStatus ?? "unknown"),
    },
    {
      kind: "delivery",
      label: `Delivery · ${delivery.label}`,
      tone: delivery.tone,
      raw: delivery.raw,
    },
  ];
}

export function buildBuyerOrderMoneyRows(order: Pick<
  StoreOrderRow,
  | "subtotal_minor"
  | "discount_total_minor"
  | "tax_total_minor"
  | "shipping_total_minor"
  | "grand_total_minor"
>): BuyerMoneyRow[] {
  return [
    {
      key: "subtotal",
      label: "Item subtotal",
      amountMinor: order.subtotal_minor,
    },
    {
      key: "discount",
      label: "Discount",
      amountMinor: order.discount_total_minor,
      negative: order.discount_total_minor > 0,
    },
    {
      key: "tax",
      label: "Tax",
      amountMinor: order.tax_total_minor,
    },
    {
      key: "shipping",
      label: "Delivery",
      amountMinor: order.shipping_total_minor,
    },
    {
      key: "grand",
      label: "Grand total",
      amountMinor: order.grand_total_minor,
      emphasize: true,
    },
  ];
}

export function formatBuyerMoneyRow(
  row: BuyerMoneyRow,
  currency: string
): string {
  const formatted = formatOrderMoney(row.amountMinor, currency);
  return row.negative ? `−${formatted}` : formatted;
}

export function canBuyerCancelUnpaidOrder(input: {
  status: unknown;
  paymentStatus: unknown;
}): { ok: true } | { ok: false; reason: string } {
  if (!isOrderStatus(input.status)) {
    return { ok: false, reason: "Order state is unknown." };
  }
  if (input.paymentStatus !== "pending") {
    return {
      ok: false,
      reason: "Only unpaid pending-payment orders can be cancelled here.",
    };
  }
  if (input.status === "cancelled" || input.status === "refunded") {
    return { ok: false, reason: "Order is already closed." };
  }
  if (input.status === "shipped" || input.status === "delivered") {
    return {
      ok: false,
      reason: "Shipped or delivered orders cannot be cancelled here.",
    };
  }
  if (
    !["pending", "confirmed", "processing", "packed"].includes(input.status)
  ) {
    return { ok: false, reason: "Cancellation is not available for this state." };
  }
  return { ok: true };
}

export function canRetryDeferredPaymentRecording(input: {
  paymentStatus: unknown;
  orderStatus: unknown;
  hasDeferredAttempt: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.orderStatus === "cancelled" || input.orderStatus === "refunded") {
    return { ok: false, reason: "Order is closed." };
  }
  if (input.paymentStatus === "paid") {
    return { ok: false, reason: "Payment is already recorded as paid." };
  }
  if (input.paymentStatus === "failed") {
    return {
      ok: false,
      reason:
        "Live payment collection is not enabled. Failed live charges cannot be retried here.",
    };
  }
  if (input.paymentStatus !== "pending" && input.paymentStatus !== "authorized") {
    return {
      ok: false,
      reason: "Deferred payment recording is not applicable.",
    };
  }
  // Always allow retry when pending — RPC is idempotent; useful when attempt missing.
  if (input.hasDeferredAttempt) {
    return {
      ok: true,
    };
  }
  return { ok: true };
}

export function deriveBuyerOrderActions(input: {
  storeSlug: string | null;
  orderId: string;
  status: unknown;
  paymentStatus: unknown;
  hasDeferredAttempt: boolean;
}): BuyerOrderAction[] {
  const actions: BuyerOrderAction[] = [];
  if (input.storeSlug) {
    actions.push({
      id: "view_store",
      label: "View seller store",
      href: `/store/${input.storeSlug}`,
      enabled: true,
    });
  }
  actions.push({
    id: "continue_shopping",
    label: "Continue shopping",
    href: "/store",
    enabled: true,
  });
  actions.push({
    id: "view_orders",
    label: "All my orders",
    href: "/store/orders",
    enabled: true,
  });

  const cancel = canBuyerCancelUnpaidOrder({
    status: input.status,
    paymentStatus: input.paymentStatus,
  });
  actions.push(
    cancel.ok
      ? { id: "cancel_unpaid", label: "Cancel unpaid order", enabled: true }
      : {
          id: "cancel_unpaid",
          label: "Cancel unpaid order",
          enabled: false,
          reason: cancel.reason,
        }
  );

  const retry = canRetryDeferredPaymentRecording({
    paymentStatus: input.paymentStatus,
    orderStatus: input.status,
    hasDeferredAttempt: input.hasDeferredAttempt,
  });
  actions.push(
    retry.ok
      ? {
          id: "retry_deferred_payment",
          label: input.hasDeferredAttempt
            ? "Refresh deferred payment record"
            : "Record deferred payment attempt",
          enabled: true,
        }
      : {
          id: "retry_deferred_payment",
          label: "Record deferred payment attempt",
          enabled: false,
          reason: retry.reason,
        }
  );

  return actions;
}

/**
 * Timeline of confirmed events only — never invents future shipping network steps.
 */
export function buildConfirmedBuyerTimeline(input: {
  createdAt: string;
  status: OrderStatus | string;
  confirmedAt?: string | null;
  processingAt?: string | null;
  packedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
}): ConfirmedTimelineEvent[] {
  const events: ConfirmedTimelineEvent[] = [
    {
      key: "placed",
      label: "Order placed",
      at: input.createdAt,
      kind: "order",
    },
  ];
  if (input.confirmedAt) {
    events.push({
      key: "confirmed",
      label: "Order confirmed",
      at: input.confirmedAt,
      kind: "order",
    });
  }
  if (input.processingAt) {
    events.push({
      key: "processing",
      label: "Preparing",
      at: input.processingAt,
      kind: "fulfillment",
    });
  }
  if (input.packedAt) {
    events.push({
      key: "packed",
      label: "Ready for shipping",
      at: input.packedAt,
      kind: "fulfillment",
    });
  }
  if (input.shippedAt) {
    events.push({
      key: "shipped",
      label: "Handed to shipping",
      at: input.shippedAt,
      kind: "delivery",
    });
  }
  if (input.deliveredAt) {
    events.push({
      key: "delivered",
      label: "Delivered",
      at: input.deliveredAt,
      kind: "delivery",
    });
  }
  if (input.cancelledAt || input.status === "cancelled") {
    events.push({
      key: "cancelled",
      label: "Cancelled",
      at: input.cancelledAt || input.createdAt,
      kind: "order",
    });
  }
  return events;
}

export function groupBuyerOrdersByStore<T extends { storeId: string }>(
  orders: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const order of orders) {
    const list = map.get(order.storeId) ?? [];
    list.push(order);
    map.set(order.storeId, list);
  }
  return map;
}

/** Fallback labels that keep domain formatters available for admin/seller. */
export function legacyStatusLabel(kind: "order" | "payment" | "fulfillment", raw: string): string {
  if (kind === "order" && isOrderStatus(raw)) return formatOrderStatus(raw);
  if (kind === "payment" && isPaymentStatus(raw)) return formatPaymentStatus(raw);
  if (kind === "fulfillment" && isFulfillmentStatus(raw)) {
    return formatFulfillmentStatus(raw);
  }
  return raw;
}
