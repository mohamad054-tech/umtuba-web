/**
 * Buyer return-request workflow. Records return state only.
 * Does not execute refunds, captures, or seller payouts.
 */

import { canExecuteRealRefund } from "./commerceReadiness";
import { isOrderStatus } from "./orderRules";
import type { OrderStatus } from "./types";

export const REQUEST_STORE_ORDER_RETURN_RPC = "request_store_order_return";
export const CONFIRM_STORE_ORDER_RETURNED_RPC = "confirm_store_order_returned";

export const RETURN_REQUEST_STATUSES = [
  "requested",
  "received",
  "closed",
] as const;
export type ReturnRequestStatus = (typeof RETURN_REQUEST_STATUSES)[number];

export function canBuyerRequestReturn(input: {
  buyerId: string;
  orderBuyerId: string;
  status: unknown;
}): { ok: true } | { ok: false; message: string } {
  if (!input.buyerId || input.buyerId !== input.orderBuyerId) {
    return { ok: false, message: "Only the order buyer can request a return." };
  }
  if (!isOrderStatus(input.status)) {
    return { ok: false, message: "Order state is unknown." };
  }
  if (input.status !== "delivered") {
    return {
      ok: false,
      message: "Returns can be requested only after delivery.",
    };
  }
  return { ok: true };
}

export function canSellerConfirmReturned(input: {
  status: unknown;
  role: string | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (input.role !== "owner" && input.role !== "manager") {
    return { ok: false, message: "Only an owner or manager can confirm a return." };
  }
  if (input.status !== "return_requested") {
    return {
      ok: false,
      message: "Seller can confirm returned only after a buyer return request.",
    };
  }
  return { ok: true };
}

export function nextStatusAfterBuyerReturnRequest(
  current: OrderStatus
): OrderStatus | null {
  return current === "delivered" ? "return_requested" : null;
}

export function nextStatusAfterSellerReturnConfirm(
  current: OrderStatus
): OrderStatus | null {
  return current === "return_requested" ? "returned" : null;
}

export function assertRefundExecutionBlocked(): { ok: false; message: string } {
  void canExecuteRealRefund();
  return {
    ok: false,
    message:
      "Real refund execution is disabled. Return state may be recorded; money is not moved.",
  };
}

export function validateReturnReason(
  raw: unknown
): { ok: true; reason: string } | { ok: false; message: string } {
  const reason = typeof raw === "string" ? raw.trim() : "";
  if (reason.length < 8) {
    return { ok: false, message: "Return reason must be at least 8 characters." };
  }
  if (reason.length > 2000) {
    return { ok: false, message: "Return reason is too long." };
  }
  return { ok: true, reason };
}
