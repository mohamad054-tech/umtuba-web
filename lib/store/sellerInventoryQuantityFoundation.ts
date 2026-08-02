/**
 * Seller Inventory Quantity Foundation V1.
 * Numeric quantity contract over existing product_inventory columns.
 * Available quantity is derived (never stored): availableUnits(on_hand, reserved, safety_stock).
 * Orthogonal to Availability status labels. No movements/reservations runtime.
 */

import {
  availableUnits,
  validateInventoryInput,
} from "./inventory";
import {
  isFiniteInventoryProductType,
  isUnlimitedInventoryProductType,
} from "./sellerInventoryAvailabilityFoundation";
import type { SellerInventoryRow } from "./sellerInventoryQueries";
import { quantityDisplay } from "./sellerInventoryPresentation";

export const SELLER_INVENTORY_QUANTITY_FOUNDATION_ID =
  "commerce.inventory.seller_inventory_quantity_foundation_v1" as const;

export type SellerInventoryQuantityTracking =
  | "finite"
  | "unlimited"
  | "unavailable"
  | "unknown";

/**
 * Read model for seller quantity surfaces.
 * `available` is always derived — never persisted.
 */
export type SellerInventoryQuantitySnapshot = {
  tracking: SellerInventoryQuantityTracking;
  onHand: number | null;
  reserved: number | null;
  safetyStock: number | null;
  /** Derived sellable units (on_hand - reserved - safety_stock, floored at 0). */
  available: number | null;
};

export type SellerInventoryQuantitySeedInput = {
  onHand?: unknown;
  /** Sellers cannot set reserved; ignored for seed validation (defaults 0). */
  reserved?: unknown;
  safetyStock?: unknown;
  allowBackorder?: unknown;
  warehouseKey?: unknown;
};

/** Fail-closed seed validation — reuses existing inventory validators. */
export function validateSellerInventoryQuantitySeed(
  input: SellerInventoryQuantitySeedInput
):
  | {
      ok: true;
      onHand: number;
      reserved: number;
      safetyStock: number;
      allowBackorder: boolean;
      warehouseKey: string;
      available: number;
    }
  | { ok: false; message: string } {
  const parsed = validateInventoryInput({
    onHand: input.onHand,
    // Seed path: reserved is system-managed; do not accept seller-supplied reserved.
    reserved: 0,
    safetyStock: input.safetyStock,
    allowBackorder: input.allowBackorder,
    warehouseKey: input.warehouseKey,
  });
  if (!parsed.ok) return parsed;
  return {
    ok: true as const,
    onHand: parsed.onHand,
    reserved: parsed.reserved,
    safetyStock: parsed.safetyStock,
    allowBackorder: parsed.allowBackorder,
    warehouseKey: parsed.warehouseKey,
    available: availableUnits({
      onHand: parsed.onHand,
      reserved: parsed.reserved,
      safetyStock: parsed.safetyStock,
    }),
  };
}

/**
 * Derive available quantity from trusted integers.
 * Fail-closed: incomplete/invalid inputs → null (never invent positive stock).
 */
export function deriveSellerInventoryAvailableQuantity(input: {
  onHand: number | null | undefined;
  reserved: number | null | undefined;
  safetyStock: number | null | undefined;
}): number | null {
  if (
    typeof input.onHand !== "number" ||
    typeof input.reserved !== "number" ||
    typeof input.safetyStock !== "number" ||
    !Number.isInteger(input.onHand) ||
    !Number.isInteger(input.reserved) ||
    !Number.isInteger(input.safetyStock) ||
    !Number.isFinite(input.onHand) ||
    !Number.isFinite(input.reserved) ||
    !Number.isFinite(input.safetyStock) ||
    input.onHand < 0 ||
    input.reserved < 0 ||
    input.safetyStock < 0 ||
    input.reserved > input.onHand
  ) {
    return null;
  }
  return availableUnits({
    onHand: input.onHand,
    reserved: input.reserved,
    safetyStock: input.safetyStock,
  });
}

export function resolveSellerInventoryQuantitySnapshot(input: {
  productType: string;
  onHand?: number | null;
  reserved?: number | null;
  safetyStock?: number | null;
  missingInventory?: boolean;
}): SellerInventoryQuantitySnapshot {
  if (isUnlimitedInventoryProductType(input.productType)) {
    return {
      tracking: "unlimited",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  if (!isFiniteInventoryProductType(input.productType)) {
    return {
      tracking: "unavailable",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  if (input.missingInventory) {
    return {
      tracking: "unavailable",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  const available = deriveSellerInventoryAvailableQuantity({
    onHand: input.onHand,
    reserved: input.reserved,
    safetyStock: input.safetyStock,
  });
  if (available == null) {
    return {
      tracking: "unknown",
      onHand:
        typeof input.onHand === "number" && Number.isFinite(input.onHand)
          ? input.onHand
          : null,
      reserved:
        typeof input.reserved === "number" && Number.isFinite(input.reserved)
          ? input.reserved
          : null,
      safetyStock:
        typeof input.safetyStock === "number" &&
        Number.isFinite(input.safetyStock)
          ? input.safetyStock
          : null,
      available: null,
    };
  }
  return {
    tracking: "finite",
    onHand: input.onHand as number,
    reserved: input.reserved as number,
    safetyStock: input.safetyStock as number,
    available,
  };
}

export function resolveSellerInventoryQuantityFromRow(
  row: Pick<
    SellerInventoryRow,
    | "productType"
    | "missingInventory"
    | "onHand"
    | "reserved"
    | "safetyStock"
    | "availabilityMode"
  >
): SellerInventoryQuantitySnapshot {
  if (row.availabilityMode === "unlimited") {
    return resolveSellerInventoryQuantitySnapshot({
      productType: row.productType,
      missingInventory: false,
    });
  }
  return resolveSellerInventoryQuantitySnapshot({
    productType: row.productType,
    onHand: row.onHand,
    reserved: row.reserved,
    safetyStock: row.safetyStock,
    missingInventory: row.missingInventory,
  });
}

/**
 * Product-level aggregate for catalog rows (sum finite variant quantities).
 * Unlimited products stay unlimited; never coerce null → 0 as “in stock”.
 */
export function aggregateSellerInventoryQuantitySnapshots(
  snaps: readonly SellerInventoryQuantitySnapshot[]
): SellerInventoryQuantitySnapshot {
  if (snaps.length === 0) {
    return {
      tracking: "unknown",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  if (snaps.every((s) => s.tracking === "unlimited")) {
    return {
      tracking: "unlimited",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  const finite = snaps.filter((s) => s.tracking === "finite");
  if (finite.length === 0) {
    if (snaps.some((s) => s.tracking === "unavailable")) {
      return {
        tracking: "unavailable",
        onHand: null,
        reserved: null,
        safetyStock: null,
        available: null,
      };
    }
    return {
      tracking: "unknown",
      onHand: null,
      reserved: null,
      safetyStock: null,
      available: null,
    };
  }
  let onHand = 0;
  let reserved = 0;
  let safetyStock = 0;
  let available = 0;
  for (const snap of finite) {
    onHand += snap.onHand ?? 0;
    reserved += snap.reserved ?? 0;
    safetyStock += snap.safetyStock ?? 0;
    available += snap.available ?? 0;
  }
  return {
    tracking: "finite",
    onHand,
    reserved,
    safetyStock,
    available,
  };
}

export function indexSellerInventoryQuantityByProductId(
  rows: readonly SellerInventoryRow[]
): Map<string, SellerInventoryQuantitySnapshot> {
  const grouped = new Map<string, SellerInventoryQuantitySnapshot[]>();
  for (const row of rows) {
    const id = String(row.productId ?? "").trim();
    if (!id) continue;
    const snap = resolveSellerInventoryQuantityFromRow(row);
    const bag = grouped.get(id) ?? [];
    bag.push(snap);
    grouped.set(id, bag);
  }
  const out = new Map<string, SellerInventoryQuantitySnapshot>();
  for (const [id, bag] of grouped) {
    out.set(id, aggregateSellerInventoryQuantitySnapshots(bag));
  }
  return out;
}

export function formatSellerInventoryQuantitySummary(
  snap: SellerInventoryQuantitySnapshot
): string {
  if (snap.tracking === "unlimited") {
    return "Qty unlimited";
  }
  if (snap.tracking === "unavailable") {
    return "Qty unavailable";
  }
  if (snap.tracking === "unknown") {
    return "Qty unknown";
  }
  return `On hand ${quantityDisplay(snap.onHand)} · Reserved ${quantityDisplay(snap.reserved)} · Available ${quantityDisplay(snap.available)}`;
}

export function formatSellerInventoryQuantityDetail(
  snap: SellerInventoryQuantitySnapshot
): {
  onHandLabel: string;
  reservedLabel: string;
  safetyStockLabel: string;
  availableLabel: string;
  summary: string;
} {
  if (snap.tracking === "unlimited") {
    return {
      onHandLabel: "—",
      reservedLabel: "—",
      safetyStockLabel: "—",
      availableLabel: "Unlimited",
      summary: "Qty unlimited",
    };
  }
  return {
    onHandLabel: quantityDisplay(snap.onHand),
    reservedLabel: quantityDisplay(snap.reserved),
    safetyStockLabel: quantityDisplay(snap.safetyStock),
    availableLabel: quantityDisplay(snap.available),
    summary: formatSellerInventoryQuantitySummary(snap),
  };
}
