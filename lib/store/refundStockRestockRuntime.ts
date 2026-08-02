/**
 * Refund Stock Restock Runtime V1.
 * Service-role helper after trusted Sync refunded.
 * Finite lines previously purchase-decremented: on_hand += qty (DB RPC, one txn).
 * Unlimited / no prior decrement: noop. No partial refund restock.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRefundStockRestockEventKey,
  REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
  REFUND_STOCK_RESTOCK_FOUNDATION_ID,
} from "./refundStockRestockFoundation";

export const REFUND_STOCK_RESTOCK_RUNTIME_ID =
  "commerce.inventory.refund_stock_restock_runtime_v1" as const;

export const STORE_PURCHASE_STOCK_RESTOCK_RPC =
  "restock_store_purchase_stock_after_refund" as const;

type AnyClient = SupabaseClient;

export type RefundStockRestockRuntimeResult =
  | {
      status: "restocked";
      replayed: boolean;
      linesRestocked: number;
      quantityRestocked: number;
      data: Record<string, unknown>;
    }
  | {
      status: "noop";
      replayed: boolean;
      reason: string;
      data: Record<string, unknown>;
    }
  | { status: "failed"; message: string };

export function refundStockRestockRuntimeScope(): {
  foundationId: typeof REFUND_STOCK_RESTOCK_FOUNDATION_ID;
  runtimeId: typeof REFUND_STOCK_RESTOCK_RUNTIME_ID;
  commitmentPoint: typeof REFUND_STOCK_RESTOCK_COMMITMENT_POINT;
  rpc: typeof STORE_PURCHASE_STOCK_RESTOCK_RPC;
  ownsPartialRefundRestock: false;
  ownsCancellationRestock: false;
} {
  return {
    foundationId: REFUND_STOCK_RESTOCK_FOUNDATION_ID,
    runtimeId: REFUND_STOCK_RESTOCK_RUNTIME_ID,
    commitmentPoint: REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
    rpc: STORE_PURCHASE_STOCK_RESTOCK_RPC,
    ownsPartialRefundRestock: false,
    ownsCancellationRestock: false,
  };
}

/**
 * Invoke purchase stock restock after trusted Sync refunded.
 * event_key = `${captureEventKey}:purchase_stock:restock`.
 */
export async function restockPurchaseStockAfterTrustedRefund(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    captureEventKey: string;
    correlationId: string;
  }
): Promise<RefundStockRestockRuntimeResult> {
  const eventKey = buildRefundStockRestockEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 160) {
    return {
      status: "failed",
      message: "Purchase stock restock event_key length is invalid.",
    };
  }

  const { data, error } = await supabase.rpc(STORE_PURCHASE_STOCK_RESTOCK_RPC, {
    p_payment_attempt_id: input.paymentAttemptId,
    p_event_key: eventKey,
    p_correlation_id: input.correlationId,
  });

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Purchase stock restock failed after trusted refund.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const linesRestocked = Number(payload.lines_restocked ?? 0);
  const quantityRestocked = Number(payload.quantity_restocked ?? 0);
  const replayed = Boolean(payload.replayed);

  if (linesRestocked === 0 && quantityRestocked === 0) {
    return {
      status: "noop",
      replayed,
      reason:
        "No finite purchase stock lines required restock for this refund.",
      data: payload,
    };
  }

  return {
    status: "restocked",
    replayed,
    linesRestocked,
    quantityRestocked,
    data: payload,
  };
}
