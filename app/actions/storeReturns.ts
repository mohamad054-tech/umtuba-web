"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { assertRefundExecutionBlocked } from "../../lib/store/orderReturns";
import {
  CONFIRM_STORE_ORDER_RETURNED_RPC,
  REQUEST_STORE_ORDER_RETURN_RPC,
  canBuyerRequestReturn,
  canSellerConfirmReturned,
  validateReturnReason,
} from "../../lib/store/orderReturns";
import { getMembership } from "../../lib/store/sellerStore";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function requestStoreOrderReturnAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }

  const orderId = formString(formData, "order_id").trim();
  const reasonParsed = validateReturnReason(formString(formData, "reason"));
  if (!orderId) {
    return { ok: false as const, message: "Order is required." };
  }
  if (!reasonParsed.ok) {
    return { ok: false as const, message: reasonParsed.message };
  }

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) {
    return { ok: false as const, message: "Order not found." };
  }

  const allowed = canBuyerRequestReturn({
    buyerId: user.id,
    orderBuyerId: order.buyer_id,
    status: order.status,
  });
  if (!allowed.ok) {
    return { ok: false as const, message: allowed.message };
  }

  const { error: rpcError } = await supabase.rpc(REQUEST_STORE_ORDER_RETURN_RPC, {
    p_order_id: orderId,
    p_reason: reasonParsed.reason,
  });
  if (rpcError) {
    return {
      ok: false as const,
      message: rpcError.message || "Return request failed.",
    };
  }

  revalidatePath(APP_ROUTES.storeOrders);
  revalidatePath(`${APP_ROUTES.storeOrders}/${orderId}`);
  return {
    ok: true as const,
    refund_executed: false,
    message: "Return requested. No refund was executed.",
  };
}

export async function confirmStoreOrderReturnedAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }

  const orderId = formString(formData, "order_id").trim();
  const note = formString(formData, "note").trim();
  if (!orderId) {
    return { ok: false as const, message: "Order is required." };
  }

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, store_id, status")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !order) {
    return { ok: false as const, message: "Order not found." };
  }

  const role = await getMembership(supabase, order.store_id, user.id);
  const allowed = canSellerConfirmReturned({
    status: order.status,
    role,
  });
  if (!allowed.ok) {
    return { ok: false as const, message: allowed.message };
  }

  const { error: rpcError } = await supabase.rpc(
    CONFIRM_STORE_ORDER_RETURNED_RPC,
    {
      p_order_id: orderId,
      p_note: note || null,
    }
  );
  if (rpcError) {
    return {
      ok: false as const,
      message: rpcError.message || "Could not confirm the return.",
    };
  }

  revalidatePath(APP_ROUTES.sellerOrders);
  revalidatePath(`${APP_ROUTES.sellerOrders}/${orderId}`);
  return {
    ok: true as const,
    refund_executed: false,
    message: "Return confirmed. Real refund execution remains disabled.",
  };
}

export async function refuseStoreOrderRefundAction() {
  return assertRefundExecutionBlocked();
}
