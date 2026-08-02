/**
 * Purchase Stock Decrement Foundation V1.
 * Contract-only binding of purchase_decrement to trusted payment capture.
 * No on_hand mutation RPC, no migration, no refund/restock runtime.
 *
 * Audit commitment point (SQL 20260819):
 *   "on_hand decrement is payment-phase only (not V1)"
 * Confirm creates ACTIVE holds only; consume drops reserved without on_hand.
 */

import {
  isFiniteInventoryProductType,
  isUnlimitedInventoryProductType,
  isUuid,
} from "./sellerInventoryAvailabilityFoundation";

import {
  isReservationStatus,
  type ReservationStatus,
} from "./commerceSafety";
import {
  validateSellerInventoryMovementIntent,
  type SellerInventoryMovementProjection,
} from "./sellerInventoryMovementLedgerFoundation";
import type { SellerInventoryQuantitySnapshot } from "./sellerInventoryQuantityFoundation";

export const PURCHASE_STOCK_DECREMENT_FOUNDATION_ID =
  "commerce.inventory.purchase_stock_decrement_foundation_v1" as const;

/**
 * Only safe commitment point proven by Commerce Safety + payment Sync contracts.
 * Not order create, not reservation create, not fulfillment.
 */
export const PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT =
  "trusted_payment_capture" as const;

export type PurchaseStockDecrementCommitmentPoint =
  typeof PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT;

/** Lifecycle stages that must NOT decrement on_hand under current contracts. */
export const PURCHASE_STOCK_DECREMENT_FORBIDDEN_POINTS = [
  "order_create",
  "reservation_create",
  "checkout_confirm",
  "fulfillment",
  "settlement_allocate",
  "settlement_release",
  "entitlement_grant",
  "client_request",
] as const;

export type PurchaseStockDecrementForbiddenPoint =
  (typeof PURCHASE_STOCK_DECREMENT_FORBIDDEN_POINTS)[number];

/** Hold statuses that may still be waiting for payment-phase consume+decrement. */
export const PURCHASE_STOCK_DECREMENT_ELIGIBLE_HOLD_STATUSES: readonly ReservationStatus[] =
  ["active", "pending_capture"] as const;

export type PurchaseStockDecrementTrustedReservation = {
  id: string;
  orderId: string | null;
  productId: string;
  variantId: string;
  quantity: number;
  status: unknown;
};

export type PurchaseStockDecrementTrustedLine = {
  orderId: string;
  orderItemId: string;
  storeId: string;
  productId: string;
  variantId: string;
  productType: string;
  reservation: PurchaseStockDecrementTrustedReservation;
  /**
   * Trusted quantity snapshot BEFORE reservation consume in this sequence.
   * Foundation projects consume then purchase_decrement; does not write.
   */
  current: Pick<
    SellerInventoryQuantitySnapshot,
    "tracking" | "onHand" | "reserved" | "safetyStock"
  >;
};

export type PurchaseStockDecrementSequenceProjection = {
  commitmentPoint: PurchaseStockDecrementCommitmentPoint;
  idempotencyKey: string;
  lineIdempotencyKey: string;
  reservationId: string;
  orderId: string;
  orderItemId: string;
  quantity: number;
  consume: SellerInventoryMovementProjection;
  decrement: SellerInventoryMovementProjection;
  /** Always false — Runtime deferred. */
  applied: false;
};

export type PurchaseStockDecrementPlan =
  | {
      ok: true;
      disposition: "projected";
      sequence: PurchaseStockDecrementSequenceProjection;
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
  | { ok: false; message: string };

/**
 * Deterministic post-capture event_key — parallel to `:allocate` / `:entitlement`.
 * Persisted uniqueness must be enforced by a future Runtime RPC (not this foundation).
 */
export function buildPurchaseStockDecrementEventKey(
  captureEventKey: string
): string {
  return `${captureEventKey.trim()}:purchase_stock`;
}

export function buildPurchaseStockDecrementLineEventKey(
  captureEventKey: string,
  reservationId: string
): string {
  return `${captureEventKey.trim()}:purchase_stock:${reservationId.trim()}`;
}

export function isPurchaseStockDecrementCommitmentPoint(
  value: unknown
): value is PurchaseStockDecrementCommitmentPoint {
  return value === PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT;
}

export function assertPurchaseStockDecrementCommitmentPoint(
  value: unknown
): { ok: true } | { ok: false; message: string } {
  if (isPurchaseStockDecrementCommitmentPoint(value)) {
    return { ok: true };
  }
  if (
    typeof value === "string" &&
    (PURCHASE_STOCK_DECREMENT_FORBIDDEN_POINTS as readonly string[]).includes(
      value
    )
  ) {
    return {
      ok: false,
      message: `Purchase stock decrement must not run at "${value}" — commitment is trusted_payment_capture only.`,
    };
  }
  return {
    ok: false,
    message:
      "Purchase stock decrement commitment point must be trusted_payment_capture.",
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
      message: "Reservation quantity must be a positive whole number.",
    };
  }
  return { ok: true, value: raw };
}

/**
 * Fail-closed ownership / relation checks for trusted server facts.
 * Never accepts client-supplied quantity/product as authority.
 */
export function validatePurchaseStockDecrementLineRelations(input: {
  orderId: unknown;
  orderItemId: unknown;
  storeId: unknown;
  productId: unknown;
  variantId: unknown;
  reservation: PurchaseStockDecrementTrustedReservation;
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
  const reservationId = requireUuid(input.reservation.id, "Reservation id");
  if (!reservationId.ok) return reservationId;
  const reservationProductId = requireUuid(
    input.reservation.productId,
    "Reservation product id"
  );
  if (!reservationProductId.ok) return reservationProductId;
  const reservationVariantId = requireUuid(
    input.reservation.variantId,
    "Reservation variant id"
  );
  if (!reservationVariantId.ok) return reservationVariantId;

  if (
    input.reservation.orderId == null ||
    typeof input.reservation.orderId !== "string" ||
    !input.reservation.orderId.trim()
  ) {
    return {
      ok: false,
      message: "Reservation must be linked to an order.",
    };
  }
  if (input.reservation.orderId.trim() !== orderId.value) {
    return {
      ok: false,
      message: "Reservation order does not match the trusted order.",
    };
  }
  if (reservationProductId.value !== productId.value) {
    return {
      ok: false,
      message: "Reservation product does not match the trusted line product.",
    };
  }
  if (reservationVariantId.value !== variantId.value) {
    return {
      ok: false,
      message: "Reservation variant does not match the trusted line variant.",
    };
  }
  return { ok: true };
}

/**
 * Plans consume → purchase_decrement for a finite line, or no-op for unlimited.
 * Does not mutate inventory. Quantity comes from the trusted reservation only.
 */
export function planPurchaseStockDecrement(input: {
  commitmentPoint: unknown;
  captureEventKey: unknown;
  line: PurchaseStockDecrementTrustedLine;
}): PurchaseStockDecrementPlan {
  const commitment = assertPurchaseStockDecrementCommitmentPoint(
    input.commitmentPoint
  );
  if (!commitment.ok) return commitment;

  if (typeof input.captureEventKey !== "string" || !input.captureEventKey.trim()) {
    return { ok: false, message: "Capture event key is required." };
  }
  const captureEventKey = input.captureEventKey.trim();
  if (captureEventKey.length < 8 || captureEventKey.length > 140) {
    return {
      ok: false,
      message: "Capture event key length is invalid for purchase stock keys.",
    };
  }

  const relations = validatePurchaseStockDecrementLineRelations(input.line);
  if (!relations.ok) return relations;

  const quantity = parsePositiveQuantity(input.line.reservation.quantity);
  if (!quantity.ok) return quantity;

  const idempotencyKey = buildPurchaseStockDecrementEventKey(captureEventKey);
  const lineIdempotencyKey = buildPurchaseStockDecrementLineEventKey(
    captureEventKey,
    input.line.reservation.id
  );
  if (lineIdempotencyKey.length > 160) {
    return {
      ok: false,
      message: "Purchase stock line event_key length is invalid.",
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
        "Unlimited digital/service/subscription/bundle lines do not decrement on_hand.",
      applied: false,
    };
  }

  if (!isFiniteInventoryProductType(productType)) {
    return {
      ok: false,
      message: `Unsupported product type "${productType}" for purchase stock decrement.`,
    };
  }

  const statusRaw = input.line.reservation.status;
  if (typeof statusRaw !== "string" || !statusRaw.trim()) {
    return { ok: false, message: "Reservation status is required." };
  }
  const status = statusRaw.trim().toLowerCase();
  if (!isReservationStatus(status)) {
    return {
      ok: false,
      message: `Unknown reservation status "${statusRaw}".`,
    };
  }
  if (status === "released" || status === "expired") {
    return {
      ok: false,
      message:
        "Released/expired reservations cannot be purchase-decremented — hold was not paid.",
    };
  }
  if (status === "consumed") {
    return {
      ok: false,
      message:
        "Reservation already consumed — Runtime must prove prior purchase_stock idempotency; foundation refuses silent re-plan against consumed holds.",
    };
  }
  if (
    !(
      PURCHASE_STOCK_DECREMENT_ELIGIBLE_HOLD_STATUSES as readonly string[]
    ).includes(status)
  ) {
    return {
      ok: false,
      message: `Reservation status "${status}" is not eligible for purchase stock decrement.`,
    };
  }

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

  const consume = validateSellerInventoryMovementIntent({
    type: "reservation_consumed",
    deltaOnHand: 0,
    deltaReserved: -quantity.value,
    note: "purchase_stock_decrement_foundation_v1:consume",
    current: input.line.current,
  });
  if (!consume.ok) return consume;

  const decrement = validateSellerInventoryMovementIntent({
    type: "purchase_decrement",
    deltaOnHand: -quantity.value,
    deltaReserved: 0,
    note: "purchase_stock_decrement_foundation_v1:decrement",
    current: {
      tracking: "finite",
      onHand: consume.projection.after.onHand,
      reserved: consume.projection.after.reserved,
      safetyStock: consume.projection.after.safetyStock,
    },
  });
  if (!decrement.ok) return decrement;

  return {
    ok: true,
    disposition: "projected",
    sequence: {
      commitmentPoint: PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
      idempotencyKey,
      lineIdempotencyKey,
      reservationId: input.line.reservation.id.trim(),
      orderId: input.line.orderId.trim(),
      orderItemId: input.line.orderItemId.trim(),
      quantity: quantity.value,
      consume: consume.projection,
      decrement: decrement.projection,
      applied: false,
    },
  };
}

/**
 * Reject client bags that claim to execute purchase stock decrement.
 * Quantity/product must never be client-authoritative for apply Runtime.
 */
export function rejectClientPurchaseStockDecrementExecutionFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(applyPurchaseStockDecrement|executePurchaseStockDecrement|decrementOnHand|commitPurchaseStock|purchaseStockApplied|onHandDelta|clientQuantity|clientProductId)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not execute purchase stock decrement — Runtime is deferred and must use trusted order/reservation facts only.",
      };
    }
  }
  return { ok: true };
}

export function formatPurchaseStockDecrementPlanSummary(
  plan: Extract<PurchaseStockDecrementPlan, { ok: true }>
): string {
  if (plan.disposition === "noop_unlimited") {
    return `Purchase stock no-op (${plan.productType}) · ${plan.reason}`;
  }
  const seq = plan.sequence;
  return `Purchase stock projected · qty ${seq.quantity} · reserved ${seq.consume.before.reserved} → ${seq.consume.after.reserved} · on hand ${seq.decrement.before.onHand} → ${seq.decrement.after.onHand} · available ${seq.decrement.before.available} → ${seq.decrement.after.available}`;
}

export function purchaseStockDecrementFoundationScope(): {
  ownsApplyRuntime: false;
  ownsMigration: false;
  ownsRefundRestock: false;
  ownsCancellationRestock: false;
  commitmentPoint: PurchaseStockDecrementCommitmentPoint;
  sequence: "consume_then_purchase_decrement";
  quantitySource: "trusted_reservation_only";
  idempotency: "capture_event_key_suffix_purchase_stock";
  note: string;
} {
  return {
    ownsApplyRuntime: false,
    ownsMigration: false,
    ownsRefundRestock: false,
    ownsCancellationRestock: false,
    commitmentPoint: PURCHASE_STOCK_DECREMENT_COMMITMENT_POINT,
    sequence: "consume_then_purchase_decrement",
    quantitySource: "trusted_reservation_only",
    idempotency: "capture_event_key_suffix_purchase_stock",
    note: "No on_hand decrement RPC exists. Commerce Safety consume drops reserved only. Future Runtime must run after trusted capture with persisted :purchase_stock idempotency — not at confirm/fulfillment, and not inside digital entitlement grant for unlimited lines.",
  };
}
