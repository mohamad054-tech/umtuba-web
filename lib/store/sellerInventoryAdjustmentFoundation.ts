/**
 * Seller Inventory Adjustment Foundation V1.
 * Contract-only layer for adjustment intents/reasons over existing quantity SoT.
 * No inventory_adjustments table, no movement ledger apply runtime, no migration.
 * Catalog seed upserts remain distinct from adjustment intents.
 */

import { availableUnits } from "./inventory";
import {
  deriveSellerInventoryAvailableQuantity,
  type SellerInventoryQuantitySnapshot,
} from "./sellerInventoryQuantityFoundation";

export const SELLER_INVENTORY_ADJUSTMENT_FOUNDATION_ID =
  "commerce.inventory.seller_inventory_adjustment_foundation_v1" as const;

/**
 * Contract reasons only — not persisted enums / not a business workflow engine.
 * No DB check constraint exists for these; do not invent a table to host them.
 */
export const SELLER_INVENTORY_ADJUSTMENT_REASONS = [
  "correction",
  "stock_count",
  "damaged",
  "returned",
  "manual_adjustment",
] as const;

export type SellerInventoryAdjustmentReason =
  (typeof SELLER_INVENTORY_ADJUSTMENT_REASONS)[number];

const REASON_SET = new Set<string>(SELLER_INVENTORY_ADJUSTMENT_REASONS);

export type SellerInventoryAdjustmentIntent = {
  reason: SellerInventoryAdjustmentReason;
  /** Signed whole-number delta applied to on_hand (positive restock, negative reduce). */
  deltaOnHand: number;
  note?: string | null;
};

export type SellerInventoryAdjustmentProjection = {
  reason: SellerInventoryAdjustmentReason;
  deltaOnHand: number;
  note: string | null;
  before: {
    onHand: number;
    reserved: number;
    safetyStock: number;
    available: number;
  };
  after: {
    onHand: number;
    reserved: number;
    safetyStock: number;
    available: number;
  };
  /** Always false in this foundation — apply runtime is deferred. */
  applied: false;
};

export function isSellerInventoryAdjustmentReason(
  value: unknown
): value is SellerInventoryAdjustmentReason {
  return typeof value === "string" && REASON_SET.has(value);
}

export function parseSellerInventoryAdjustmentReason(
  raw: unknown
):
  | { ok: true; value: SellerInventoryAdjustmentReason }
  | { ok: false; message: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "Adjustment reason is required." };
  }
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!isSellerInventoryAdjustmentReason(normalized)) {
    return {
      ok: false,
      message: `Unknown adjustment reason "${raw}".`,
    };
  }
  return { ok: true, value: normalized };
}

export function sellerInventoryAdjustmentReasonLabel(
  reason: SellerInventoryAdjustmentReason
): string {
  switch (reason) {
    case "correction":
      return "Correction";
    case "stock_count":
      return "Stock count";
    case "damaged":
      return "Damaged";
    case "returned":
      return "Returned";
    case "manual_adjustment":
      return "Manual adjustment";
  }
}

export function parseSellerInventoryAdjustmentDelta(
  raw: unknown
): { ok: true; value: number } | { ok: false; message: string } {
  if (typeof raw === "string" && raw.trim() !== "") {
    if (!/^-?\d+$/.test(raw.trim())) {
      return {
        ok: false,
        message: "Adjustment delta must be a whole number.",
      };
    }
    raw = Number(raw.trim());
  }
  if (
    typeof raw !== "number" ||
    !Number.isInteger(raw) ||
    !Number.isFinite(raw)
  ) {
    return { ok: false, message: "Adjustment delta must be a whole number." };
  }
  if (raw === 0) {
    return { ok: false, message: "Adjustment delta cannot be zero." };
  }
  return { ok: true, value: raw };
}

export function normalizeSellerInventoryAdjustmentNote(
  raw: unknown
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null) return { ok: true, value: null };
  if (typeof raw !== "string") {
    return { ok: false, message: "Adjustment note must be a string." };
  }
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 280) {
    return {
      ok: false,
      message: "Adjustment note must be at most 280 characters.",
    };
  }
  return { ok: true, value: trimmed };
}

/**
 * Fail-closed validation of an adjustment intent against a trusted quantity snapshot.
 * Does not write inventory. Reserved remains system-managed (unchanged by intent).
 */
export function validateSellerInventoryAdjustmentIntent(input: {
  reason: unknown;
  deltaOnHand: unknown;
  note?: unknown;
  current: Pick<
    SellerInventoryQuantitySnapshot,
    "tracking" | "onHand" | "reserved" | "safetyStock"
  >;
}):
  | { ok: true; intent: SellerInventoryAdjustmentIntent; projection: SellerInventoryAdjustmentProjection }
  | { ok: false; message: string } {
  if (input.current.tracking !== "finite") {
    return {
      ok: false,
      message:
        "Inventory adjustments apply only to finite tracked inventory snapshots.",
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

  const reason = parseSellerInventoryAdjustmentReason(input.reason);
  if (!reason.ok) return reason;
  const delta = parseSellerInventoryAdjustmentDelta(input.deltaOnHand);
  if (!delta.ok) return delta;
  const note = normalizeSellerInventoryAdjustmentNote(input.note);
  if (!note.ok) return note;

  const nextOnHand = input.current.onHand + delta.value;
  if (nextOnHand < 0) {
    return {
      ok: false,
      message: "Adjustment would make on-hand negative.",
    };
  }
  if (input.current.reserved > nextOnHand) {
    return {
      ok: false,
      message: "Adjustment would leave reserved greater than on-hand.",
    };
  }

  const beforeAvailable = deriveSellerInventoryAvailableQuantity({
    onHand: input.current.onHand,
    reserved: input.current.reserved,
    safetyStock: input.current.safetyStock,
  });
  const afterAvailable = availableUnits({
    onHand: nextOnHand,
    reserved: input.current.reserved,
    safetyStock: input.current.safetyStock,
  });
  if (beforeAvailable == null) {
    return {
      ok: false,
      message: "Current inventory quantities are inconsistent.",
    };
  }

  const intent: SellerInventoryAdjustmentIntent = {
    reason: reason.value,
    deltaOnHand: delta.value,
    note: note.value,
  };
  const projection: SellerInventoryAdjustmentProjection = {
    reason: reason.value,
    deltaOnHand: delta.value,
    note: note.value,
    before: {
      onHand: input.current.onHand,
      reserved: input.current.reserved,
      safetyStock: input.current.safetyStock,
      available: beforeAvailable,
    },
    after: {
      onHand: nextOnHand,
      reserved: input.current.reserved,
      safetyStock: input.current.safetyStock,
      available: afterAvailable,
    },
    applied: false,
  };
  return { ok: true, intent, projection };
}

/**
 * Reject client bags that claim to execute/apply adjustments.
 * Foundation validates intents only.
 */
export function rejectClientInventoryAdjustmentExecutionFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(applyAdjustment|executeAdjustment|commitAdjustment|inventoryAdjustmentId|adjustmentId|movementId|ledgerEntry|stockMovement)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not execute inventory adjustments — apply runtime is deferred.",
      };
    }
  }
  return { ok: true };
}

export function formatSellerInventoryAdjustmentProjectionSummary(
  projection: SellerInventoryAdjustmentProjection
): string {
  const sign = projection.deltaOnHand > 0 ? "+" : "";
  return `${sellerInventoryAdjustmentReasonLabel(projection.reason)} ${sign}${projection.deltaOnHand} · On hand ${projection.before.onHand} → ${projection.after.onHand} · Available ${projection.before.available} → ${projection.after.available}`;
}

export function listSellerInventoryAdjustmentReasonOptions(): Array<{
  id: SellerInventoryAdjustmentReason;
  label: string;
}> {
  return SELLER_INVENTORY_ADJUSTMENT_REASONS.map((id) => ({
    id,
    label: sellerInventoryAdjustmentReasonLabel(id),
  }));
}

/**
 * Documents that catalog seed upserts are not adjustment apply runtime,
 * and that no movement ledger exists for seller adjustments yet.
 */
export function sellerInventoryAdjustmentFoundationScope(): {
  ownsApplyRuntime: false;
  ownsMovementLedger: false;
  ownsReservationRuntime: false;
  reasonsAreContractOnly: true;
  catalogSeedIsNotAdjustmentLedger: true;
  note: string;
} {
  return {
    ownsApplyRuntime: false,
    ownsMovementLedger: false,
    ownsReservationRuntime: false,
    reasonsAreContractOnly: true,
    catalogSeedIsNotAdjustmentLedger: true,
    note: "No inventory_adjustments / stock_movements table. Validate intents against quantity SoT only; apply/audit ledger runtime remains deferred. Catalog draft/in-review on-hand upserts stay seed mutations, not adjustments.",
  };
}
