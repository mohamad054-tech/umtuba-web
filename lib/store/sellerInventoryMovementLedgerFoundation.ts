/**
 * Seller Inventory Movement Ledger Foundation V1.
 * Contract-only movement types, validation, and read helpers over quantity SoT.
 * No stock_movements / inventory_ledger table, no append runtime, no migration.
 * Reservation events remain a hold audit boundary — not a general movement ledger.
 */

import { availableUnits } from "./inventory";
import {
  deriveSellerInventoryAvailableQuantity,
  type SellerInventoryQuantitySnapshot,
} from "./sellerInventoryQuantityFoundation";
import {
  isReservationStatus,
  type ReservationStatus,
} from "./commerceSafety";
import { isSellerInventoryAdjustmentReason } from "./sellerInventoryAdjustmentFoundation";

export const SELLER_INVENTORY_MOVEMENT_LEDGER_FOUNDATION_ID =
  "commerce.inventory.seller_inventory_movement_ledger_foundation_v1" as const;

/**
 * Contract movement types only — not persisted enums / not an event runtime.
 * No DB check constraint hosts these; do not invent a ledger table for them.
 */
export const SELLER_INVENTORY_MOVEMENT_TYPES = [
  "reservation_created",
  "reservation_released",
  "reservation_consumed",
  "inventory_adjustment",
  "purchase_decrement",
  "return_increment",
] as const;

export type SellerInventoryMovementType =
  (typeof SELLER_INVENTORY_MOVEMENT_TYPES)[number];

const MOVEMENT_TYPE_SET = new Set<string>(SELLER_INVENTORY_MOVEMENT_TYPES);

export type SellerInventoryQuantityCounters = {
  onHand: number;
  reserved: number;
  safetyStock: number;
  available: number;
};

export type SellerInventoryMovementIntent = {
  type: SellerInventoryMovementType;
  deltaOnHand: number;
  deltaReserved: number;
  note?: string | null;
};

export type SellerInventoryMovementProjection = {
  type: SellerInventoryMovementType;
  deltaOnHand: number;
  deltaReserved: number;
  note: string | null;
  before: SellerInventoryQuantityCounters;
  after: SellerInventoryQuantityCounters;
  /** Always false in this foundation — append/apply runtime is deferred. */
  recorded: false;
};

/**
 * Normalized read row for presentation / future ledger consumers.
 * Foundation never claims DB persistence (`source` documents provenance).
 */
export type SellerInventoryMovementReadRow = {
  type: SellerInventoryMovementType;
  deltaOnHand: number;
  deltaReserved: number;
  note: string | null;
  source: "contract" | "reservation_event" | "unknown";
  recorded: false;
};

export function isSellerInventoryMovementType(
  value: unknown
): value is SellerInventoryMovementType {
  return typeof value === "string" && MOVEMENT_TYPE_SET.has(value);
}

export function parseSellerInventoryMovementType(
  raw: unknown
):
  | { ok: true; value: SellerInventoryMovementType }
  | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "Movement type is required." };
  }
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!isSellerInventoryMovementType(normalized)) {
    return {
      ok: false,
      message: `Unknown inventory movement type "${raw}".`,
    };
  }
  return { ok: true, value: normalized };
}

export function sellerInventoryMovementTypeLabel(
  type: SellerInventoryMovementType
): string {
  switch (type) {
    case "reservation_created":
      return "Reservation created";
    case "reservation_released":
      return "Reservation released";
    case "reservation_consumed":
      return "Reservation consumed";
    case "inventory_adjustment":
      return "Inventory adjustment";
    case "purchase_decrement":
      return "Purchase decrement";
    case "return_increment":
      return "Return increment";
  }
}

export function listSellerInventoryMovementTypeOptions(): Array<{
  id: SellerInventoryMovementType;
  label: string;
}> {
  return SELLER_INVENTORY_MOVEMENT_TYPES.map((id) => ({
    id,
    label: sellerInventoryMovementTypeLabel(id),
  }));
}

/**
 * Maps reservation status transitions onto contract movement types.
 * Boundary reuse of inventory_reservation_events — not a general stock ledger.
 * `expired` is release-class (frees reserved without on-hand change).
 */
export function mapReservationStatusTransitionToMovementType(input: {
  fromStatus?: unknown;
  toStatus: unknown;
}):
  | { ok: true; value: SellerInventoryMovementType }
  | { ok: false; message: string } {
  if (typeof input.toStatus !== "string" || !input.toStatus.trim()) {
    return { ok: false, message: "Reservation to_status is required." };
  }
  const to = input.toStatus.trim().toLowerCase();
  if (!isReservationStatus(to)) {
    return {
      ok: false,
      message: `Unknown reservation status "${input.toStatus}".`,
    };
  }
  if (input.fromStatus != null && input.fromStatus !== "") {
    if (typeof input.fromStatus !== "string") {
      return { ok: false, message: "Reservation from_status must be a string." };
    }
    const from = input.fromStatus.trim().toLowerCase();
    if (from && !isReservationStatus(from)) {
      return {
        ok: false,
        message: `Unknown reservation status "${input.fromStatus}".`,
      };
    }
  }

  switch (to as ReservationStatus) {
    case "active":
    case "pending_capture":
      return { ok: true, value: "reservation_created" };
    case "released":
    case "expired":
      return { ok: true, value: "reservation_released" };
    case "consumed":
      return { ok: true, value: "reservation_consumed" };
  }
}

/** Adjustment intents project as inventory_adjustment movements (still unrecorded). */
export function movementTypeForAdjustmentReason(
  reason: unknown
):
  | { ok: true; value: "inventory_adjustment" }
  | { ok: false; message: string } {
  if (!isSellerInventoryAdjustmentReason(reason)) {
    return { ok: false, message: "Adjustment reason is required." };
  }
  return { ok: true, value: "inventory_adjustment" };
}

export function parseSellerInventoryMovementDelta(
  raw: unknown,
  label: string
): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof raw === "string" && raw.trim() !== "") {
    if (!/^-?\d+$/.test(raw.trim())) {
      return {
        ok: false,
        message: `${label} must be a whole number.`,
      };
    }
    raw = Number(raw.trim());
  }
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    !Number.isFinite(raw)
  ) {
    return { ok: false, message: `${label} must be a whole number.` };
  }
  return { ok: true, value: raw };
}

export function normalizeSellerInventoryMovementNote(
  raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, message: "Movement note must be a string." };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 280) {
    return {
      ok: false,
      message: "Movement note must be at most 280 characters.",
    };
  }
  return { ok: true, value: trimmed };
}

function validateDeltasForMovementType(
  type: SellerInventoryMovementType,
  deltaOnHand: number,
  deltaReserved: number
): { ok: true } | { ok: false; message: string } {
  switch (type) {
    case "reservation_created":
      if (deltaOnHand !== 0) {
        return {
          ok: false,
          message: "reservation_created must not change on-hand.",
        };
      }
      if (deltaReserved <= 0) {
        return {
          ok: false,
          message: "reservation_created requires a positive reserved delta.",
        };
      }
      return { ok: true };
    case "reservation_released":
    case "reservation_consumed":
      if (deltaOnHand !== 0) {
        return {
          ok: false,
          message: `${type} must not change on-hand in this foundation.`,
        };
      }
      if (deltaReserved >= 0) {
        return {
          ok: false,
          message: `${type} requires a negative reserved delta.`,
        };
      }
      return { ok: true };
    case "inventory_adjustment":
      if (deltaOnHand === 0) {
        return {
          ok: false,
          message: "inventory_adjustment requires a non-zero on-hand delta.",
        };
      }
      if (deltaReserved !== 0) {
        return {
          ok: false,
          message: "inventory_adjustment must not change reserved.",
        };
      }
      return { ok: true };
    case "purchase_decrement":
      if (deltaOnHand >= 0) {
        return {
          ok: false,
          message: "purchase_decrement requires a negative on-hand delta.",
        };
      }
      if (deltaReserved !== 0) {
        return {
          ok: false,
          message:
            "purchase_decrement reserved effects are deferred — deltaReserved must be 0.",
        };
      }
      return { ok: true };
    case "return_increment":
      if (deltaOnHand <= 0) {
        return {
          ok: false,
          message: "return_increment requires a positive on-hand delta.",
        };
      }
      if (deltaReserved !== 0) {
        return {
          ok: false,
          message: "return_increment must not change reserved.",
        };
      }
      return { ok: true };
  }
}

/**
 * Fail-closed validation of a movement intent against a trusted quantity snapshot.
 * Does not append ledger rows and does not mutate product_inventory.
 */
export function validateSellerInventoryMovementIntent(input: {
  type: unknown;
  deltaOnHand: unknown;
  deltaReserved: unknown;
  note?: unknown;
  current: Pick<
    SellerInventoryQuantitySnapshot,
    "tracking" | "onHand" | "reserved" | "safetyStock"
  >;
}):
  | {
      ok: true;
      intent: SellerInventoryMovementIntent;
      projection: SellerInventoryMovementProjection;
    }
  | { ok: false; message: string } {
  if (input.current.tracking !== "finite") {
    return {
      ok: false,
      message:
        "Inventory movements apply only to finite tracked inventory snapshots.",
    };
  }
  if (
    typeof input.current.onHand !== "number" ||
    typeof input.current.reserved !== "number" ||
    typeof input.current.safetyStock !== "number"
  ) {
    return {
      ok: false,
      message: "Current inventory quantities are incomplete.",
    };
  }

  const type = parseSellerInventoryMovementType(input.type);
  if (!type.ok) return type;
  const deltaOnHand = parseSellerInventoryMovementDelta(
    input.deltaOnHand,
    "On-hand delta"
  );
  if (!deltaOnHand.ok) return deltaOnHand;
  const deltaReserved = parseSellerInventoryMovementDelta(
    input.deltaReserved,
    "Reserved delta"
  );
  if (!deltaReserved.ok) return deltaReserved;
  const note = normalizeSellerInventoryMovementNote(input.note);
  if (!note.ok) return note;

  if (deltaOnHand.value === 0 && deltaReserved.value === 0) {
    return {
      ok: false,
      message: "Movement must change on-hand and/or reserved.",
    };
  }

  const shape = validateDeltasForMovementType(
    type.value,
    deltaOnHand.value,
    deltaReserved.value
  );
  if (!shape.ok) return shape;

  const nextOnHand = input.current.onHand + deltaOnHand.value;
  const nextReserved = input.current.reserved + deltaReserved.value;
  if (nextOnHand < 0) {
    return {
      ok: false,
      message: "Movement would make on-hand negative.",
    };
  }
  if (nextReserved < 0) {
    return {
      ok: false,
      message: "Movement would make reserved negative.",
    };
  }
  if (nextReserved > nextOnHand) {
    return {
      ok: false,
      message: "Movement would leave reserved greater than on-hand.",
    };
  }

  const beforeAvailable = deriveSellerInventoryAvailableQuantity({
    onHand: input.current.onHand,
    reserved: input.current.reserved,
    safetyStock: input.current.safetyStock,
  });
  const afterAvailable = availableUnits({
    onHand: nextOnHand,
    reserved: nextReserved,
    safetyStock: input.current.safetyStock,
  });
  if (beforeAvailable == null) {
    return {
      ok: false,
      message: "Current inventory quantities are inconsistent.",
    };
  }

  const intent: SellerInventoryMovementIntent = {
    type: type.value,
    deltaOnHand: deltaOnHand.value,
    deltaReserved: deltaReserved.value,
    note: note.value,
  };
  const projection: SellerInventoryMovementProjection = {
    type: type.value,
    deltaOnHand: deltaOnHand.value,
    deltaReserved: deltaReserved.value,
    note: note.value,
    before: {
      onHand: input.current.onHand,
      reserved: input.current.reserved,
      safetyStock: input.current.safetyStock,
      available: beforeAvailable,
    },
    after: {
      onHand: nextOnHand,
      reserved: nextReserved,
      safetyStock: input.current.safetyStock,
      available: afterAvailable,
    },
    recorded: false,
  };
  return { ok: true, intent, projection };
}

/**
 * Read-model normalizer for contract bags or reservation-event projections.
 * Never marks rows as recorded/persisted.
 */
export function normalizeSellerInventoryMovementReadRow(input: {
  type: unknown;
  deltaOnHand?: unknown;
  deltaReserved?: unknown;
  note?: unknown;
  source?: unknown;
}):
  | { ok: true; row: SellerInventoryMovementReadRow }
  | { ok: false; message: string } {
  const type = parseSellerInventoryMovementType(input.type);
  if (!type.ok) return type;
  const deltaOnHand = parseSellerInventoryMovementDelta(
    input.deltaOnHand ?? 0,
    "On-hand delta"
  );
  if (!deltaOnHand.ok) return deltaOnHand;
  const deltaReserved = parseSellerInventoryMovementDelta(
    input.deltaReserved ?? 0,
    "Reserved delta"
  );
  if (!deltaReserved.ok) return deltaReserved;
  const note = normalizeSellerInventoryMovementNote(input.note);
  if (!note.ok) return note;

  const shape = validateDeltasForMovementType(
    type.value,
    deltaOnHand.value,
    deltaReserved.value
  );
  if (!shape.ok) return shape;

  let source: SellerInventoryMovementReadRow["source"] = "unknown";
  if (input.source === "contract" || input.source === "reservation_event") {
    source = input.source;
  } else if (input.source == null) {
    source = "contract";
  } else if (typeof input.source === "string") {
    return { ok: false, message: `Unknown movement source "${input.source}".` };
  } else {
    return { ok: false, message: "Movement source must be a string." };
  }

  return {
    ok: true,
    row: {
      type: type.value,
      deltaOnHand: deltaOnHand.value,
      deltaReserved: deltaReserved.value,
      note: note.value,
      source,
      recorded: false,
    },
  };
}

/**
 * Reject client bags that claim to append/record/apply ledger movements.
 * Foundation validates contracts only.
 */
export function rejectClientInventoryMovementLedgerExecutionFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(appendMovement|recordMovement|writeLedger|commitMovement|executeMovement|applyMovement|inventoryMovementId|movementId|ledgerEntry|stockMovement|ledgerId)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not record inventory movements — ledger append runtime is deferred.",
      };
    }
  }
  return { ok: true };
}

export function formatSellerInventoryMovementProjectionSummary(
  projection: SellerInventoryMovementProjection
): string {
  const onHandSign = projection.deltaOnHand > 0 ? "+" : "";
  const reservedSign = projection.deltaReserved > 0 ? "+" : "";
  return `${sellerInventoryMovementTypeLabel(projection.type)} · On hand ${projection.before.onHand} → ${projection.after.onHand} (${onHandSign}${projection.deltaOnHand}) · Reserved ${projection.before.reserved} → ${projection.after.reserved} (${reservedSign}${projection.deltaReserved}) · Available ${projection.before.available} → ${projection.after.available}`;
}

/**
 * Documents that this foundation owns contracts/read helpers only.
 * Reservation events stay a hold audit; catalog seed upserts are not ledger rows.
 */
export function sellerInventoryMovementLedgerFoundationScope(): {
  ownsApplyRuntime: false;
  ownsAppendRuntime: false;
  ownsPersistence: false;
  ownsReservationRuntime: false;
  ownsPurchaseDecrementRuntime: false;
  typesAreContractOnly: true;
  reservationEventsAreHoldAuditOnly: true;
  catalogSeedIsNotMovementLedger: true;
  note: string;
} {
  return {
    ownsApplyRuntime: false,
    ownsAppendRuntime: false,
    ownsPersistence: false,
    ownsReservationRuntime: false,
    ownsPurchaseDecrementRuntime: false,
    typesAreContractOnly: true,
    reservationEventsAreHoldAuditOnly: true,
    catalogSeedIsNotMovementLedger: true,
    note: "No inventory_movements / stock_movements / inventory_ledger table. Validate movement contracts against quantity SoT only; append/record runtime remains deferred. inventory_reservation_events is a hold audit boundary, not a general stock movement ledger.",
  };
}
