/**
 * Seller Orders Operations V1 — pure presentation / action derivation.
 * Does not invent transitions, payments, shipments, or inventory mutations.
 */

import {
  canSellerManageOrders,
  isSellerTerminalOrderStatus,
  nextFulfillmentStatuses,
  nextSellerOrderStatuses,
} from "./orderRules";
import { classifyTradingPaymentState } from "./tradingContracts";
import type {
  FulfillmentStatus,
  OrderStatus,
  StoreMemberRole,
} from "./types";
import { isFulfillmentStatus, isOrderStatus, isPaymentStatus } from "./orderRules";
import {
  buyerDeliveryStatusLabel,
  buyerFulfillmentStatusLabel,
  buyerOrderStatusLabel,
  buyerPaymentStatusLabel,
} from "./buyerOrdersPresentation";
import { assertSellerCancelAllowedForStockSafety } from "./cancellationStockReleaseSafety";

export type SellerAttentionLevel = "none" | "info" | "warn" | "critical";

export type SellerTransitionOption = {
  value: OrderStatus;
  label: string;
  paymentBlocked: boolean;
  reason?: string;
};

export type SellerFulfillmentOption = {
  value: FulfillmentStatus;
  label: string;
  paymentBlocked: boolean;
  reason?: string;
};

export type SellerOpsAction =
  | {
      id: "update_status";
      label: string;
      enabled: boolean;
      reason?: string;
    }
  | {
      id: "view_products";
      label: string;
      href: string;
      enabled: true;
    }
  | {
      id: "view_dashboard";
      label: string;
      href: string;
      enabled: true;
    }
  | {
      id: "refresh";
      label: string;
      enabled: true;
    };

const ORDER_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  confirmed: "Acknowledge order",
  processing: "Start preparation",
  packed: "Mark ready for shipping",
  shipped: "Hand to shipping",
  delivered: "Confirm delivered",
  cancelled: "Cancel order",
};

const FULFILLMENT_ACTION_LABELS: Record<FulfillmentStatus, string> = {
  unfulfilled: "Mark unfulfilled",
  partial: "Mark partially fulfilled",
  fulfilled: "Mark fulfilled",
};

export function sellerListBuyerLabel(fullName: string | null | undefined): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed || trimmed.toLowerCase() === "customer") return "Customer";
  const first = trimmed.split(/\s+/)[0] ?? "Customer";
  return first.length > 40 ? `${first.slice(0, 40)}…` : first;
}

export function isPaymentBlockingFulfillmentProgress(
  paymentStatus: unknown
): boolean {
  if (!isPaymentStatus(paymentStatus)) return true;
  return classifyTradingPaymentState({
    paymentStatus,
    status: "pending",
  }).blocksFulfillmentProgress;
}

export function paymentBlockReason(paymentStatus: unknown): string {
  if (paymentStatus === "failed") {
    return "Payment failed in trusted records. Live payment collection is not enabled — do not treat this order as paid or shippable.";
  }
  if (paymentStatus === "pending") {
    return "Payment is still pending (deferred collection). Handing to shipping or marking delivered is blocked until payment is paid or authorized.";
  }
  if (!isPaymentStatus(paymentStatus)) {
    return "Payment state is unknown. Shipping and delivery transitions are blocked.";
  }
  return "Fulfillment progress is blocked by payment state.";
}

export function isShipOrDeliverTransition(toStatus: OrderStatus): boolean {
  return toStatus === "shipped" || toStatus === "delivered";
}

export function sellerTransitionPaymentBlocked(input: {
  paymentStatus: unknown;
  toStatus?: OrderStatus | null;
  toFulfillment?: FulfillmentStatus | null;
}): { blocked: boolean; reason?: string } {
  // Paid/authorized cancel must use refund+restock — never reservation release.
  if (input.toStatus === "cancelled") {
    const cancelStock = assertSellerCancelAllowedForStockSafety({
      paymentStatus: input.paymentStatus,
    });
    if (!cancelStock.ok) {
      return {
        blocked: true,
        reason:
          "Paid or authorized orders cannot be cancelled here. Use the full-order refund path so purchase stock is restocked safely.",
      };
    }
  }
  if (!isPaymentBlockingFulfillmentProgress(input.paymentStatus)) {
    return { blocked: false };
  }
  if (input.toStatus && isShipOrDeliverTransition(input.toStatus)) {
    return { blocked: true, reason: paymentBlockReason(input.paymentStatus) };
  }
  if (input.toFulfillment === "fulfilled") {
    return {
      blocked: true,
      reason:
        paymentBlockReason(input.paymentStatus) +
        " Marking fulfillment complete while unpaid is not allowed here.",
    };
  }
  return { blocked: false };
}

export function deriveSellerOrderAttention(input: {
  status: unknown;
  paymentStatus: unknown;
  fulfillmentStatus: unknown;
}): { level: SellerAttentionLevel; message: string | null } {
  if (input.paymentStatus === "failed") {
    return {
      level: "critical",
      message: "Payment failed — do not fulfill as paid.",
    };
  }
  if (input.status === "cancelled" || input.status === "refunded") {
    return { level: "info", message: "Order is closed." };
  }
  if (input.paymentStatus === "pending" && input.status === "packed") {
    return {
      level: "warn",
      message: "Ready for shipping, but payment is still pending.",
    };
  }
  if (input.paymentStatus === "pending" && input.status === "pending") {
    return {
      level: "warn",
      message: "New unpaid order awaiting acknowledgement.",
    };
  }
  if (
    input.paymentStatus === "pending" &&
    (input.status === "processing" || input.status === "confirmed")
  ) {
    return {
      level: "info",
      message: "In preparation with deferred/pending payment.",
    };
  }
  if (
    input.fulfillmentStatus === "unfulfilled" &&
    input.status === "confirmed"
  ) {
    return { level: "info", message: "Awaiting preparation." };
  }
  return { level: "none", message: null };
}

/** Accessible name for seller order-list attention chips (visible text stays short). */
export function sellerOrderAttentionBadgeLabel(attention: {
  level: SellerAttentionLevel;
  message: string | null;
}): string | null {
  if (attention.level === "none") return null;
  const levelWord =
    attention.level === "critical"
      ? "Critical"
      : attention.level === "warn"
        ? "Warning"
        : "Info";
  if (attention.message) {
    return `${levelWord}: ${attention.message}`;
  }
  return `${levelWord}: Needs attention`;
}

export function sellerOrderStatusOptions(input: {
  status: OrderStatus;
  paymentStatus: unknown;
}): SellerTransitionOption[] {
  return nextSellerOrderStatuses(input.status).map((value) => {
    const block = sellerTransitionPaymentBlocked({
      paymentStatus: input.paymentStatus,
      toStatus: value,
    });
    return {
      value,
      label: ORDER_ACTION_LABELS[value] ?? `Move to ${value}`,
      paymentBlocked: block.blocked,
      reason: block.reason,
    };
  });
}

export function sellerFulfillmentStatusOptions(input: {
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: unknown;
}): SellerFulfillmentOption[] {
  return nextFulfillmentStatuses(input.fulfillmentStatus).map((value) => {
    const block = sellerTransitionPaymentBlocked({
      paymentStatus: input.paymentStatus,
      toFulfillment: value,
    });
    return {
      value,
      label: FULFILLMENT_ACTION_LABELS[value] ?? value,
      paymentBlocked: block.blocked,
      reason: block.reason,
    };
  });
}

export function canSellerUpdateOrderOps(input: {
  role: StoreMemberRole | null | undefined;
  status: unknown;
}): { ok: true } | { ok: false; reason: string } {
  if (!canSellerManageOrders(input.role)) {
    return {
      ok: false,
      reason: "Only store owners or managers can update orders.",
    };
  }
  if (!isOrderStatus(input.status)) {
    return { ok: false, reason: "Order state is unknown." };
  }
  if (isSellerTerminalOrderStatus(input.status)) {
    return {
      ok: false,
      reason: "Terminal orders cannot be changed by sellers.",
    };
  }
  return { ok: true };
}

export function deriveSellerOpsActions(input: {
  role: StoreMemberRole | null | undefined;
  status: unknown;
  paymentStatus: unknown;
  fulfillmentStatus: unknown;
}): SellerOpsAction[] {
  const updateGate = canSellerUpdateOrderOps({
    role: input.role,
    status: input.status,
  });
  const statusOptions = isOrderStatus(input.status)
    ? sellerOrderStatusOptions({
        status: input.status,
        paymentStatus: input.paymentStatus,
      })
    : [];
  const fulfillmentOptions = isFulfillmentStatus(input.fulfillmentStatus)
    ? sellerFulfillmentStatusOptions({
        fulfillmentStatus: input.fulfillmentStatus,
        paymentStatus: input.paymentStatus,
      })
    : [];
  const hasEnabledTransition =
    statusOptions.some((o) => !o.paymentBlocked) ||
    fulfillmentOptions.some((o) => !o.paymentBlocked);

  const actions: SellerOpsAction[] = [
    updateGate.ok
      ? {
          id: "update_status",
          label: hasEnabledTransition
            ? "Update order operations"
            : "No allowed transitions right now",
          enabled: hasEnabledTransition,
          reason: hasEnabledTransition
            ? undefined
            : isPaymentBlockingFulfillmentProgress(input.paymentStatus)
              ? paymentBlockReason(input.paymentStatus)
              : "No further seller transitions are available from the current state.",
        }
      : {
          id: "update_status",
          label: "Update order operations",
          enabled: false,
          reason: updateGate.reason,
        },
    {
      id: "view_products",
      label: "Store products",
      href: "/seller/store/products",
      enabled: true,
    },
    {
      id: "view_dashboard",
      label: "Store dashboard",
      href: "/seller/store",
      enabled: true,
    },
    {
      id: "refresh",
      label: "Refresh order",
      enabled: true,
    },
  ];
  return actions;
}

export function sellerStateSummary(input: {
  status: unknown;
  paymentStatus: unknown;
  fulfillmentStatus: unknown;
  shippedAt?: string | null;
  deliveredAt?: string | null;
}): Array<{ kind: string; label: string }> {
  const delivery = buyerDeliveryStatusLabel({
    status: input.status,
    shippedAt: input.shippedAt,
    deliveredAt: input.deliveredAt,
  });
  return [
    { kind: "order", label: `Order · ${buyerOrderStatusLabel(input.status)}` },
    {
      kind: "payment",
      label: `Payment · ${buyerPaymentStatusLabel(input.paymentStatus)}`,
    },
    {
      kind: "fulfillment",
      label: `Fulfillment · ${buyerFulfillmentStatusLabel(input.fulfillmentStatus)}`,
    },
    { kind: "delivery", label: `Delivery · ${delivery.label}` },
  ];
}

export function validateSellerStatusFormSelection(input: {
  currentStatus: OrderStatus;
  currentFulfillment: FulfillmentStatus;
  paymentStatus: unknown;
  selectedStatus: string;
  selectedFulfillment: string;
}): { ok: true; status?: OrderStatus; fulfillment?: FulfillmentStatus } | { ok: false; message: string } {
  const status =
    input.selectedStatus && isOrderStatus(input.selectedStatus)
      ? input.selectedStatus
      : undefined;
  const fulfillment =
    input.selectedFulfillment && isFulfillmentStatus(input.selectedFulfillment)
      ? input.selectedFulfillment
      : undefined;

  if (!status && !fulfillment) {
    return { ok: false, message: "Choose an order or fulfillment status to update." };
  }

  if (status) {
    const allowed = nextSellerOrderStatuses(input.currentStatus);
    if (!allowed.includes(status)) {
      return {
        ok: false,
        message: `Cannot transition order from ${input.currentStatus} to ${status}.`,
      };
    }
    const block = sellerTransitionPaymentBlocked({
      paymentStatus: input.paymentStatus,
      toStatus: status,
    });
    if (block.blocked) {
      return { ok: false, message: block.reason || "Transition blocked by payment state." };
    }
  }

  if (fulfillment) {
    const allowed = nextFulfillmentStatuses(input.currentFulfillment);
    if (!allowed.includes(fulfillment)) {
      return {
        ok: false,
        message: `Cannot transition fulfillment from ${input.currentFulfillment} to ${fulfillment}.`,
      };
    }
    const block = sellerTransitionPaymentBlocked({
      paymentStatus: input.paymentStatus,
      toFulfillment: fulfillment,
    });
    if (block.blocked) {
      return { ok: false, message: block.reason || "Transition blocked by payment state." };
    }
  }

  return { ok: true, status, fulfillment };
}
