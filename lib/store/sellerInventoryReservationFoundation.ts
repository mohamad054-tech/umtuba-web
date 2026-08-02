/**
 * Seller Inventory Reservation Foundation V1.
 * Read/contract layer over existing inventory_reservations + product_inventory.reserved.
 * Does NOT invent checkout reserve/release runtime, timers, or queues.
 * Runtime SoT remains Commerce Safety RPCs (20260819+).
 */

import {
  isReservationStatus,
  isStuckReservation,
  RESERVATION_STATUSES,
  type ReservationStatus,
} from "./commerceSafety";
import type { SellerReservationRow } from "./sellerInventoryQueries";
import type { SellerInventoryAttentionLevel } from "./sellerInventoryPresentation";

export const SELLER_INVENTORY_RESERVATION_FOUNDATION_ID =
  "commerce.inventory.seller_inventory_reservation_foundation_v1" as const;

/** Re-export DB-aligned statuses (no parallel enum). */
export { RESERVATION_STATUSES, type ReservationStatus, isReservationStatus };

/** Holds that still pressure sellable stock (counter-affecting). */
export const BLOCKING_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "active",
  "pending_capture",
] as const;

/** Terminal statuses — no longer block sellable stock via this hold. */
export const TERMINAL_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "consumed",
  "released",
  "expired",
] as const;

export type SellerInventoryReservationHoldState =
  | "blocking"
  | "stuck"
  | "terminal"
  | "unknown";

export type SellerInventoryReservationHoldSnapshot = {
  id: string;
  productId: string;
  variantId: string;
  orderId: string | null;
  warehouseKey: string;
  quantity: number;
  status: ReservationStatus | "unknown";
  expiresAt: string;
  releaseReason: string | null;
  state: SellerInventoryReservationHoldState;
  stuck: boolean;
  blocksSellable: boolean;
};

/**
 * Fail-closed status parse — unknown values never treated as active holds.
 */
export function parseSellerInventoryReservationStatus(
  raw: unknown
):
  | { ok: true; value: ReservationStatus }
  | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "Reservation status is required." };
  }
  const normalized = raw.trim().toLowerCase();
  if (!isReservationStatus(normalized)) {
    return {
      ok: false,
      message: `Unknown reservation status "${raw}".`,
    };
  }
  return { ok: true, value: normalized };
}

export function isBlockingReservationStatus(
  status: unknown
): status is ReservationStatus {
  return (
    isReservationStatus(status) &&
    (BLOCKING_RESERVATION_STATUSES as readonly string[]).includes(status)
  );
}

export function isTerminalReservationStatus(
  status: unknown
): status is ReservationStatus {
  return (
    isReservationStatus(status) &&
    (TERMINAL_RESERVATION_STATUSES as readonly string[]).includes(status)
  );
}

export function normalizeSellerReservationQuantity(
  value: unknown
): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof value === "string" && value.trim() !== "") {
    if (!/^\d+$/.test(value.trim())) {
      return { ok: false, message: "Reservation quantity must be a whole number." };
    }
    value = Number(value.trim());
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    !Number.isFinite(value)
  ) {
    return { ok: false, message: "Reservation quantity must be a whole number." };
  }
  if (value < 1) {
    return {
      ok: false,
      message: "Reservation quantity must be at least 1.",
    };
  }
  return { ok: true, value };
}

/**
 * Reject client bags that try to author holds or mutate reserved directly.
 * Foundation is read-only; mutations stay in Commerce Safety RPCs.
 */
export function rejectClientReservationMutationFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(reserved|reservationId|reservation_id|holdId|hold_id|inventoryReservation|inventory_reservation|releaseReservation|expireReservation|createReservation)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not create, release, or mutate inventory reservations directly.",
      };
    }
  }
  return { ok: true };
}

export function mapSellerInventoryReservationHold(
  row: Pick<
    SellerReservationRow,
    | "id"
    | "productId"
    | "variantId"
    | "orderId"
    | "warehouseKey"
    | "quantity"
    | "status"
    | "expiresAt"
    | "releaseReason"
  >,
  nowMs?: number
): SellerInventoryReservationHoldSnapshot {
  const parsed = parseSellerInventoryReservationStatus(row.status);
  const status: ReservationStatus | "unknown" = parsed.ok
    ? parsed.value
    : "unknown";
  const quantityParsed = normalizeSellerReservationQuantity(row.quantity);
  const quantity = quantityParsed.ok ? quantityParsed.value : 0;
  const stuck =
    parsed.ok &&
    isStuckReservation({
      status: parsed.value,
      expiresAtIso: row.expiresAt,
      nowMs,
    });
  const blocksSellable = parsed.ok && isBlockingReservationStatus(parsed.value);
  let state: SellerInventoryReservationHoldState = "unknown";
  if (stuck) state = "stuck";
  else if (blocksSellable) state = "blocking";
  else if (parsed.ok && isTerminalReservationStatus(parsed.value)) {
    state = "terminal";
  }

  return {
    id: String(row.id ?? ""),
    productId: String(row.productId ?? ""),
    variantId: String(row.variantId ?? ""),
    orderId: row.orderId ? String(row.orderId) : null,
    warehouseKey: String(row.warehouseKey ?? "default"),
    quantity,
    status,
    expiresAt: String(row.expiresAt ?? ""),
    releaseReason: row.releaseReason ? String(row.releaseReason) : null,
    state,
    stuck,
    blocksSellable,
  };
}

/** Sum quantities for holds that still pressure sellable stock. */
export function sumBlockingReservationQuantity(
  rows: readonly Pick<SellerReservationRow, "status" | "quantity">[]
): number {
  let total = 0;
  for (const row of rows) {
    if (!isBlockingReservationStatus(row.status)) continue;
    const qty = normalizeSellerReservationQuantity(row.quantity);
    if (!qty.ok) continue;
    total += qty.value;
  }
  return total;
}

/**
 * Heuristic consistency check: inventory.reserved counter vs sum of blocking holds.
 * Does not repair drift — foundation is read-only.
 */
export function assessReservedCounterConsistency(input: {
  reservedCounter: number | null | undefined;
  holdRows: readonly Pick<SellerReservationRow, "status" | "quantity">[];
}): {
  blockingHoldQuantity: number;
  counter: number | null;
  aligned: boolean | null;
  delta: number | null;
} {
  const blockingHoldQuantity = sumBlockingReservationQuantity(input.holdRows);
  if (
    typeof input.reservedCounter !== "number" ||
    !Number.isInteger(input.reservedCounter) ||
    !Number.isFinite(input.reservedCounter) ||
    input.reservedCounter < 0
  ) {
    return {
      blockingHoldQuantity,
      counter: null,
      aligned: null,
      delta: null,
    };
  }
  const delta = input.reservedCounter - blockingHoldQuantity;
  return {
    blockingHoldQuantity,
    counter: input.reservedCounter,
    aligned: delta === 0,
    delta,
  };
}

export function indexBlockingReservationQuantityByVariantId(
  rows: readonly SellerReservationRow[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (!isBlockingReservationStatus(row.status)) continue;
    const qty = normalizeSellerReservationQuantity(row.quantity);
    if (!qty.ok) continue;
    const id = String(row.variantId ?? "").trim();
    if (!id) continue;
    out.set(id, (out.get(id) ?? 0) + qty.value);
  }
  return out;
}

export function deriveSellerReservationHoldAttention(
  hold: SellerInventoryReservationHoldSnapshot
): {
  level: SellerInventoryAttentionLevel;
  message: string | null;
  stuck: boolean;
} {
  if (hold.stuck) {
    return {
      level: "critical",
      message: "Hold is past expiry and still active — reservation pressure.",
      stuck: true,
    };
  }
  if (hold.blocksSellable) {
    return {
      level: "info",
      message: "Checkout/order inventory hold is active.",
      stuck: false,
    };
  }
  if (hold.status === "expired") {
    return {
      level: "warn",
      message: "Hold expired and should no longer block sellable stock.",
      stuck: false,
    };
  }
  return { level: "none", message: null, stuck: false };
}

export function formatSellerReservationPressureSummary(input: {
  reservedCounter: number | null | undefined;
  blockingHoldQuantity: number;
}): string {
  const counter =
    typeof input.reservedCounter === "number" &&
    Number.isFinite(input.reservedCounter)
      ? String(input.reservedCounter)
      : "—";
  return `Reserved ${counter} · Active holds ${input.blockingHoldQuantity}`;
}

/**
 * Documents that this foundation does not own checkout reservation runtime.
 */
export function sellerInventoryReservationFoundationScope(): {
  ownsCheckoutReserveRuntime: false;
  ownsExpireScheduler: false;
  ownsOnHandDecrement: false;
  readsReservedCounter: true;
  readsHoldLedger: true;
  note: string;
} {
  return {
    ownsCheckoutReserveRuntime: false,
    ownsExpireScheduler: false,
    ownsOnHandDecrement: false,
    readsReservedCounter: true,
    readsHoldLedger: true,
    note: "Reservation create/release/expire/consume remain Commerce Safety RPCs. This foundation unifies seller read contracts only.",
  };
}
