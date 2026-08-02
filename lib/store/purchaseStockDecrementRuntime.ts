/**
 * Purchase Stock Decrement Runtime V1.
 * Service-role helper after trusted payment capture.
 * Finite holds: consume reservation then decrement on_hand (DB RPC, one txn).
 * Unlimited types: RPC no-ops those lines. No refund/cancel restock.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPurchaseStockDecrementEventKey,
  PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
  PURCHASE_STOCK_DECREMENT_FOUNDATION_ID,
} from "./purchaseStockDecrementFoundation";

export const PURCHASE_STOCK_DECREMENT_RUNTIME_ID =
  "commerce.inventory.purchase_stock_decrement_runtime_v1" as const;

export const STORE_PURCHASE_STOCK_DECREMENT_RPC =
  "decrement_store_purchase_stock_after_capture" as const;

type AnyClient = SupabaseClient;

export type PurchaseStockDecrementRuntimeResult =
  | {
      status: "decremented";
      replayed: boolean;
      linesDecremented: number;
      quantityDecremented: number;
      reservationsConsumed: number;
      data: Record<string, unknown>;
    }
  | {
      status: "noop";
      replayed: boolean;
      reason: string;
      data: Record<string, unknown>;
    }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string };

export function purchaseStockDecrementRuntimeScope(): {
  foundationId: typeof PURCHASE_STOCK_DECREMENT_FOUNDATION_ID;
  runtimeId: typeof PURCHASE_STOCK_DECREMENT_RUNTIME_ID;
  commitmentPoint: typeof PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT;
  rpc: typeof STORE_PURCHASE_STOCK_DECREMENT_RPC;
  ownsRefundRestock: false;
  ownsCancellationRestock: false;
} {
  return {
    foundationId: PURCHASE_STOCK_DECREMENT_FOUNDATION_ID,
    runtimeId: PURCHASE_STOCK_DECREMENT_RUNTIME_ID,
    commitmentPoint: PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
    rpc: STORE_PURCHASE_STOCK_DECREMENT_RPC,
    ownsRefundRestock: false,
    ownsCancellationRestock: false,
  };
}

/**
 * Invoke purchase stock decrement after trusted capture Sync.
 * event_key = `${captureEventKey}:purchase_stock` (persisted uniqueness in DB).
 */
export async function decrementPurchaseStockAfterTrustedCapture(
  supabase: AnyClient,
  input: {
    paymentAttemptId: string;
    captureEventKey: string;
    correlationId: string;
  }
): Promise<PurchaseStockDecrementRuntimeResult> {
  const eventKey = buildPurchaseStockDecrementEventKey(input.captureEventKey);
  if (eventKey.length < 8 || eventKey.length > 160) {
    return {
      status: "failed",
      message: "Purchase stock decrement event_key length is invalid.",
    };
  }

  const { data, error } = await supabase.rpc(
    STORE_PURCHASE_STOCK_DECREMENT_RPC,
    {
      p_payment_attempt_id: input.paymentAttemptId,
      p_event_key: eventKey,
      p_correlation_id: input.correlationId,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() ||
        "Purchase stock decrement failed after trusted capture.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const linesDecremented = Number(payload.lines_decremented ?? 0);
  const quantityDecremented = Number(payload.quantity_decremented ?? 0);
  const reservationsConsumed = Number(payload.reservations_consumed ?? 0);
  const replayed = Boolean(payload.replayed);

  if (linesDecremented === 0 && quantityDecremented === 0) {
    return {
      status: "noop",
      replayed,
      reason:
        "No finite purchase stock lines required decrement for this capture.",
      data: payload,
    };
  }

  return {
    status: "decremented",
    replayed,
    linesDecremented,
    quantityDecremented,
    reservationsConsumed,
    data: payload,
  };
}
