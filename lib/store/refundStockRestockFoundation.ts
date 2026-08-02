/**
 * Refund Stock Restock Foundation V1.
 * Contract-only binding of return_increment to trusted Sync refunded.
 * No on_hand mutation RPC, no migration, no cancel restock runtime.
 *
 * Audit:
 * - Purchase decrement Runtime exists (20260893) on trusted capture.
 * - Full-order refund path Syncs refunded then revokes entitlements — no stock restock.
 * - Cancel only releases active/pending holds (never on_hand +=).
 * - Partials are forbidden by Full Order Refund Path contracts.
 */

import {
  isFiniteInventoryProductType,
  isUnlimitedInventoryProductType,
  isUuid,
} from "./sellerInventoryAvailabilityFoundation";
import {
  validateSellerInventoryMovementIntent,
  type SellerInventoryMovementProjection,
} from "./sellerInventoryMovementLedgerFoundation";
import type { SellerInventoryQuantitySnapshot } from "./sellerInventoryQuantityFoundation";
import { buildPurchaseStockDecrementEventKey } from "./purchaseStockDecrementFoundation";

export const REFUND_STOCK_RESTOCK_FOUNDATION_ID =
  "commerce.inventory.refund_stock_restock_foundation_v1" as const;

/**
 * Only safe commitment point: after trusted payment Sync outcome `refunded`.
 * Future Runtime wires beside revoke in applyFullOrderRefund — not at cancel/ops approve.
 */
export const REFUND_STOCK_RESTOCK_COMMITMENT_POINT =
  "trusted_payment_refund" as const;

export type RefundStockRestockCommitmentPoint =
  typeof REFUND_STOCK_RESTOCK_COMMITMENT_POINT;

/** Lifecycle stages that must NOT restock on_hand under current contracts. */
export const REFUND_STOCK_RESTOCK_FORBIDDEN_POINTS = [
  "order_create",
  "reservation_create",
  "checkout_confirm",
  "cancellation_release",
  "reservation_expired",
  "ops_refund_request",
  "ops_refund_approved",
  "stripe_webhook_alone",
  "settlement_hold",
  "settlement_reverse",
  "entitlement_revoke",
  "fulfillment",
  "trusted_payment_capture",
  "client_request",
  "partial_refund",
  "seller_adjustment_returned",
] as const;

export type RefundStockRestockForbiddenPoint =
  (typeof REFUND_STOCK_RESTOCK_FORBIDDEN_POINTS)[number];

export type RefundStockRestockTrustedLine = {
  orderId: string;
  orderItemId: string;
  storeId: string;
  productId: string;
  variantId: string;
  productType: string;
  /** Reservation id that was purchase-decremented at capture (consumed). */
  reservationId: string;
  /**
   * Quantity previously decremented for this line — trusted from purchase-stock
   * facts / consumed reservation qty. Never client / never refund money ratio.
   */
  priorDecrementQuantity: number;
  /**
   * True when Runtime/evidence proves `${captureEventKey}:purchase_stock`
   * applied a positive finite decrement for this attempt/order/line.
   */
  priorPurchaseDecrementApplied: boolean;
  /**
   * When prior decrement was an unlimited noop (0 lines), restock is also noop.
   */
  priorPurchaseDecrementWasNoop?: boolean;
  /** Current quantity snapshot AFTER capture consume+decrement (reserved already reduced). */
  current: Pick<
    SellerInventoryQuantitySnapshot,
    "tracking" | "onHand" | "reserved" | "safetyStock"
  >;
};

export type RefundStockRestockProjection = {
  commitmentPoint: RefundStockRestockCommitmentPoint;
  idempotencyKey: string;
  lineIdempotencyKey: string;
  reservationId: string;
  orderId: string;
  orderItemId: string;
  quantity: number;
  restock: SellerInventoryMovementProjection;
  /** Always false — Runtime deferred. */
  applied: false;
};

export type RefundStockRestockPlan =
  | {
      ok: true;
      disposition: "projected";
      sequence: RefundStockRestockProjection;
    }
  | {
      ok: true;
      disposition: "noop_unlimited";
      productType: string;
      idempotencyKey: string;
      lineIdempotencyKey: string;
      reason: string;
      applied: false;
    }
  | {
      ok: true;
      disposition: "noop_no_prior_decrement";
      idempotencyKey: string;
      lineIdempotencyKey: string;
      reason: string;
      applied: false;
    }
  | { ok: false; message: string };

/**
 * Read-model row for presentation / future Runtime consumers.
 * Never claims DB persistence (`recorded: false`).
 */
export type RefundStockRestockReadRow = {
  commitmentPoint: RefundStockRestockCommitmentPoint;
  productType: string;
  quantity: number | null;
  disposition: "projected" | "noop_unlimited" | "noop_no_prior_decrement";
  idempotencyKey: string;
  lineIdempotencyKey: string;
  recorded: false;
};

/**
 * Deterministic restock event_key — parallel to `:purchase_stock` / `:entitlement:revoke`.
 * Persisted uniqueness must be enforced by a future Runtime RPC (not this foundation).
 */
export function buildRefundStockRestockEventKey(captureEventKey: string): string {
  return `${buildPurchaseStockDecrementEventKey(captureEventKey)}:restock`;
}

export function buildRefundStockRestockLineEventKey(
  captureEventKey: string,
  reservationId: string
): string {
  return `${buildRefundStockRestockEventKey(captureEventKey)}:${reservationId.trim()}`;
}

export function isRefundStockRestockCommitmentPoint(
  value: unknown
): value is RefundStockRestockCommitmentPoint {
  return value === REFUND_STOCK_RESTOCK_COMMITMENT_POINT;
}

export function assertRefundStockRestockCommitmentPoint(
  value: unknown
): { ok: true } | { ok: false; message: string } {
  if (isRefundStockRestockCommitmentPoint(value)) {
    return { ok: true };
  }
  if (
    typeof value === "string" &&
    (REFUND_STOCK_RESTOCK_FORBIDDEN_POINTS as readonly string[]).includes(value)
  ) {
    return {
      ok: false,
      message: `Refund stock restock must not run at "${value}" — commitment is trusted_payment_refund only.`,
    };
  }
  return {
    ok: false,
    message:
      "Refund stock restock commitment point must be trusted_payment_refund.",
  };
}

function requireUuid(
  value: unknown,
  label: string
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: `${label} is required.` };
  }
  const trimmed = value.trim();
  if (!isUuid(trimmed)) {
    return { ok: false, message: `${label} must be a valid UUID.` };
  }
  return { ok: true, value: trimmed };
}

function parsePositiveQuantity(
  raw: unknown
): { ok: true; value: number } | { ok: false; message: string } {
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    !Number.isFinite(raw) ||
    raw <= 0
  ) {
    return {
      ok: false,
      message: "Prior decrement quantity must be a positive whole number.",
    };
  }
  return { ok: true, value: raw };
}

/**
 * Fail-closed ownership / relation checks for trusted server facts.
 */
export function validateRefundStockRestockLineRelations(input: {
  orderId: unknown;
  orderItemId: unknown;
  storeId: unknown;
  productId: unknown;
  variantId: unknown;
  reservationId: unknown;
}): { ok: true } | { ok: false; message: string } {
  const orderId = requireUuid(input.orderId, "Order id");
  if (!orderId.ok) return orderId;
  const orderItemId = requireUuid(input.orderItemId, "Order item id");
  if (!orderItemId.ok) return orderItemId;
  const storeId = requireUuid(input.storeId, "Store id");
  if (!storeId.ok) return storeId;
  const productId = requireUuid(input.productId, "Product id");
  if (!productId.ok) return productId;
  const variantId = requireUuid(input.variantId, "Variant id");
  if (!variantId.ok) return variantId;
  const reservationId = requireUuid(input.reservationId, "Reservation id");
  if (!reservationId.ok) return reservationId;
  return { ok: true };
}

/**
 * Plans return_increment for a finite line that was previously purchase-decremented,
 * or no-op for unlimited / no prior decrement. Does not mutate inventory.
 * Full-order refund path only — partial restock is refused.
 */
export function planRefundStockRestock(input: {
  commitmentPoint: unknown;
  captureEventKey: unknown;
  refundScope?: unknown;
  line: RefundStockRestockTrustedLine;
}): RefundStockRestockPlan {
  const commitment = assertRefundStockRestockCommitmentPoint(
    input.commitmentPoint
  );
  if (!commitment.ok) return commitment;

  if (input.refundScope != null && input.refundScope !== "full_order") {
    return {
      ok: false,
      message:
        "Refund stock restock supports full_order scope only — partial restock is out of contract.",
    };
  }

  if (typeof input.captureEventKey !== "string" || !input.captureEventKey.trim()) {
    return { ok: false, message: "Capture event key is required." };
  }
  const captureEventKey = input.captureEventKey.trim();
  if (captureEventKey.length < 8 || captureEventKey.length > 120) {
    return {
      ok: false,
      message: "Capture event key length is invalid for refund restock keys.",
    };
  }

  const relations = validateRefundStockRestockLineRelations({
    orderId: input.line.orderId,
    orderItemId: input.line.orderItemId,
    storeId: input.line.storeId,
    productId: input.line.productId,
    variantId: input.line.variantId,
    reservationId: input.line.reservationId,
  });
  if (!relations.ok) return relations;

  const idempotencyKey = buildRefundStockRestockEventKey(captureEventKey);
  const lineIdempotencyKey = buildRefundStockRestockLineEventKey(
    captureEventKey,
    input.line.reservationId
  );
  if (idempotencyKey.length > 160 || lineIdempotencyKey.length > 180) {
    return {
      ok: false,
      message: "Refund stock restock event_key length is invalid.",
    };
  }

  const productType =
    typeof input.line.productType === "string"
      ? input.line.productType.trim().toLowerCase()
      : "";
  if (!productType) {
    return { ok: false, message: "Product type is required." };
  }

  if (isUnlimitedInventoryProductType(productType)) {
    return {
      ok: true,
      disposition: "noop_unlimited",
      productType,
      idempotencyKey,
      lineIdempotencyKey,
      reason:
        "Unlimited digital/service/subscription/bundle lines do not restock on_hand after refund.",
      applied: false,
    };
  }

  if (!isFiniteInventoryProductType(productType)) {
    return {
      ok: false,
      message: `Unsupported product type "${productType}" for refund stock restock.`,
    };
  }

  if (input.line.priorPurchaseDecrementWasNoop === true) {
    return {
      ok: true,
      disposition: "noop_no_prior_decrement",
      idempotencyKey,
      lineIdempotencyKey,
      reason:
        "Prior purchase stock decrement was a noop — refund restock must not invent on_hand.",
      applied: false,
    };
  }

  if (input.line.priorPurchaseDecrementApplied !== true) {
    return {
      ok: false,
      message:
        "Refund stock restock requires prior purchase stock decrement evidence — refusing to invent stock.",
    };
  }

  const quantity = parsePositiveQuantity(input.line.priorDecrementQuantity);
  if (!quantity.ok) return quantity;

  if (input.line.current.tracking !== "finite") {
    return {
      ok: false,
      message:
        "Finite product lines require a finite inventory quantity snapshot.",
    };
  }
  if (
    typeof input.line.current.onHand !== "number" ||
    typeof input.line.current.reserved !== "number" ||
    typeof input.line.current.safetyStock !== "number"
  ) {
    return {
      ok: false,
      message: "Current inventory quantities are incomplete.",
    };
  }

  const restock = validateSellerInventoryMovementIntent({
    type: "return_increment",
    deltaOnHand: quantity.value,
    deltaReserved: 0,
    note: "refund_stock_restock_foundation_v1:return_increment",
    current: input.line.current,
  });
  if (!restock.ok) return restock;

  return {
    ok: true,
    disposition: "projected",
    sequence: {
      commitmentPoint: REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
      idempotencyKey,
      lineIdempotencyKey,
      reservationId: input.line.reservationId.trim(),
      orderId: input.line.orderId.trim(),
      orderItemId: input.line.orderItemId.trim(),
      quantity: quantity.value,
      restock: restock.projection,
      applied: false,
    },
  };
}

/**
 * Normalize a presentation/read row from a planned disposition.
 */
export function normalizeRefundStockRestockReadRow(
  plan: Extract<RefundStockRestockPlan, { ok: true }>
): RefundStockRestockReadRow {
  if (plan.disposition === "projected") {
    return {
      commitmentPoint: REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
      productType: "finite",
      quantity: plan.sequence.quantity,
      disposition: "projected",
      idempotencyKey: plan.sequence.idempotencyKey,
      lineIdempotencyKey: plan.sequence.lineIdempotencyKey,
      recorded: false,
    };
  }
  return {
    commitmentPoint: REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
    productType:
      plan.disposition === "noop_unlimited" ? plan.productType : "finite",
    quantity: null,
    disposition: plan.disposition,
    idempotencyKey: plan.idempotencyKey,
    lineIdempotencyKey: plan.lineIdempotencyKey,
    recorded: false,
  };
}

export function refundStockRestockPresentationCopy(): {
  eyebrow: string;
  body: string;
  note: string;
} {
  return {
    eyebrow: "Refund restock · contract only",
    body: "Finite purchase stock may be restocked only after trusted Sync refunded, and only when a prior purchase_stock decrement is proven. Cancel release and unlimited product types never restock on_hand.",
    note: "Partial refunds are out of contract. Runtime append/apply remains deferred.",
  };
}

/**
 * Reject client bags that claim to execute refund restock.
 */
export function rejectClientRefundStockRestockExecutionFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(applyRefundRestock|executeRefundRestock|restockOnHand|commitRefundRestock|refundRestockApplied|clientQuantity|clientProductId|partialRestockQty)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not execute refund stock restock — Runtime is deferred and must use trusted prior-decrement facts only.",
      };
    }
  }
  return { ok: true };
}

export function formatRefundStockRestockPlanSummary(
  plan: Extract<RefundStockRestockPlan, { ok: true }>
): string {
  if (plan.disposition === "noop_unlimited") {
    return `Refund restock no-op (${plan.productType}) · ${plan.reason}`;
  }
  if (plan.disposition === "noop_no_prior_decrement") {
    return `Refund restock no-op · ${plan.reason}`;
  }
  const seq = plan.sequence;
  return `Refund restock projected · qty ${seq.quantity} · On hand ${seq.restock.before.onHand} → ${seq.restock.after.onHand} · Available ${seq.restock.before.available} → ${seq.restock.after.available}`;
}

export function refundStockRestockFoundationScope(): {
  ownsApplyRuntime: false;
  ownsMigration: false;
  ownsCancellationRestock: false;
  ownsPartialRefundRestock: false;
  commitmentPoint: RefundStockRestockCommitmentPoint;
  movementType: "return_increment";
  quantitySource: "prior_purchase_decrement_only";
  prerequisite: "prior_purchase_stock_decrement_applied";
  idempotency: "capture_event_key_suffix_purchase_stock_restock";
  futureWireIn: "applyFullOrderRefund_after_sync_refunded";
  note: string;
} {
  return {
    ownsApplyRuntime: false,
    ownsMigration: false,
    ownsCancellationRestock: false,
    ownsPartialRefundRestock: false,
    commitmentPoint: REFUND_STOCK_RESTOCK_COMMITMENT_POINT,
    movementType: "return_increment",
    quantitySource: "prior_purchase_decrement_only",
    prerequisite: "prior_purchase_stock_decrement_applied",
    idempotency: "capture_event_key_suffix_purchase_stock_restock",
    futureWireIn: "applyFullOrderRefund_after_sync_refunded",
    note: "No restock RPC exists. Cancel release must never restock. Future Runtime should append after trusted Sync refunded with persisted :purchase_stock:restock idempotency, only for finite lines previously purchase-decremented.",
  };
}
