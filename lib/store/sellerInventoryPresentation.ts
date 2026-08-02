/**
 * Seller Inventory & Reservation Visibility V1 — presentation derivation.
 * Uses trusted availableUnits + Inventory Availability Foundation modes.
 * Does not invent allocated/damaged/quarantine.
 */

import { availableUnits } from "./inventory";
import { isStuckReservation } from "./commerceSafety";
import type { SellerInventoryRow, SellerReservationRow } from "./sellerInventoryQueries";

export type SellerInventoryFilterBucket =
  | "all"
  | "attention"
  | "out"
  | "low"
  | "reserved"
  | "missing";

export type SellerInventorySortKey =
  | "attention"
  | "available_asc"
  | "available_desc"
  | "title_asc"
  | "reserved_desc"
  | "updated_desc";

export type SellerInventoryAttentionLevel = "none" | "info" | "warn" | "critical";

export type SellerInventoryAvailabilityState =
  | "available"
  | "unlimited"
  | "low_stock"
  | "out_of_stock"
  | "backorder"
  | "fully_reserved"
  | "missing"
  | "unknown";

export function deriveAvailableToSell(input: {
  onHand: number | null | undefined;
  reserved: number | null | undefined;
  safetyStock: number | null | undefined;
}): number | null {
  if (
    typeof input.onHand !== "number" ||
    typeof input.reserved !== "number" ||
    typeof input.safetyStock !== "number" ||
    !Number.isFinite(input.onHand) ||
    !Number.isFinite(input.reserved) ||
    !Number.isFinite(input.safetyStock)
  ) {
    return null;
  }
  return availableUnits({
    onHand: input.onHand,
    reserved: input.reserved,
    safetyStock: input.safetyStock,
  });
}

export function deriveInventoryAvailabilityState(
  row: Pick<
    SellerInventoryRow,
    | "missingInventory"
    | "onHand"
    | "reserved"
    | "safetyStock"
    | "availableToSell"
    | "allowBackorder"
    | "availabilityMode"
  >
): SellerInventoryAvailabilityState {
  if (row.availabilityMode === "unlimited") {
    return "unlimited";
  }
  if (row.missingInventory) return "missing";
  if (
    row.onHand == null ||
    row.reserved == null ||
    row.safetyStock == null ||
    row.availableToSell == null
  ) {
    return "unknown";
  }
  if (row.onHand > 0 && row.reserved >= row.onHand) {
    return "fully_reserved";
  }
  if (row.availableToSell === 0) {
    // Backorder is distinct from out_of_stock (do not mislabel sellable holds).
    if (row.allowBackorder) return "backorder";
    return "out_of_stock";
  }
  // Low stock only when safety_stock is configured — explainable from trusted data.
  if (row.safetyStock > 0 && row.availableToSell <= row.safetyStock) {
    return "low_stock";
  }
  return "available";
}

export function sellerInventoryAvailabilityLabel(
  state: SellerInventoryAvailabilityState
): string {
  switch (state) {
    case "available":
      return "Available";
    case "unlimited":
      return "Unlimited";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
    case "backorder":
      return "Backorder";
    case "fully_reserved":
      return "Fully reserved";
    case "missing":
      return "Missing inventory";
    case "unknown":
      return "Unknown";
  }
}

export function deriveSellerInventoryAttention(
  row: SellerInventoryRow
): { level: SellerInventoryAttentionLevel; message: string | null } {
  const state = deriveInventoryAvailabilityState(row);
  if (state === "unlimited") {
    return {
      level: "none",
      message: null,
    };
  }
  if (state === "missing") {
    return {
      level: "critical",
      message: "No trusted inventory row for this variant.",
    };
  }
  if (state === "unknown") {
    return {
      level: "warn",
      message: "Quantity data is incomplete — not treated as zero.",
    };
  }
  if (state === "fully_reserved") {
    return {
      level: "critical",
      message: "All on-hand units are reserved by checkout holds.",
    };
  }
  if (state === "backorder") {
    return {
      level: "info",
      message:
        "Available-to-sell is zero, but backorder is allowed on the inventory row.",
    };
  }
  if (state === "out_of_stock") {
    return {
      level: "warn",
      message: "Available-to-sell is zero after reserved and safety stock.",
    };
  }
  if (state === "low_stock") {
    return {
      level: "info",
      message: `Available-to-sell is at or below safety stock (${row.safetyStock}).`,
    };
  }
  if ((row.reserved ?? 0) > 0) {
    return {
      level: "info",
      message: `${row.reserved} unit(s) currently reserved.`,
    };
  }
  return { level: "none", message: null };
}

export function quantityDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(value);
}

export function filterSellerInventoryRows(
  rows: SellerInventoryRow[],
  input: {
    query?: string;
    bucket?: SellerInventoryFilterBucket;
    sort?: SellerInventorySortKey;
  }
): SellerInventoryRow[] {
  const q = (input.query ?? "").trim().toLowerCase();
  const bucket = input.bucket ?? "all";

  let next = rows.filter((row) => {
    const state = deriveInventoryAvailabilityState(row);
    const attention = deriveSellerInventoryAttention(row);
    switch (bucket) {
      case "attention":
        if (attention.level === "none") return false;
        break;
      case "out":
        if (state !== "out_of_stock" && state !== "fully_reserved") return false;
        break;
      case "low":
        if (state !== "low_stock") return false;
        break;
      case "reserved":
        if ((row.reserved ?? 0) <= 0) return false;
        break;
      case "missing":
        if (!row.missingInventory && state !== "unknown") return false;
        break;
      default:
        break;
    }
    if (!q) return true;
    return (
      row.productTitle.toLowerCase().includes(q) ||
      row.sku.toLowerCase().includes(q) ||
      row.variantTitle.toLowerCase().includes(q) ||
      row.productSlug.toLowerCase().includes(q) ||
      (row.warehouseKey ?? "").toLowerCase().includes(q)
    );
  });

  const sort = input.sort ?? "attention";
  const rank = (row: SellerInventoryRow) => {
    const level = deriveSellerInventoryAttention(row).level;
    if (level === "critical") return 0;
    if (level === "warn") return 1;
    if (level === "info") return 2;
    return 3;
  };

  next = [...next].sort((a, b) => {
    switch (sort) {
      case "available_asc":
        return (a.availableToSell ?? Number.POSITIVE_INFINITY) -
          (b.availableToSell ?? Number.POSITIVE_INFINITY);
      case "available_desc":
        return (b.availableToSell ?? Number.NEGATIVE_INFINITY) -
          (a.availableToSell ?? Number.NEGATIVE_INFINITY);
      case "title_asc":
        return a.productTitle.localeCompare(b.productTitle);
      case "reserved_desc":
        return (b.reserved ?? -1) - (a.reserved ?? -1);
      case "updated_desc":
        return (b.inventoryUpdatedAt ?? "").localeCompare(
          a.inventoryUpdatedAt ?? ""
        );
      case "attention":
      default: {
        const d = rank(a) - rank(b);
        if (d !== 0) return d;
        return a.productTitle.localeCompare(b.productTitle);
      }
    }
  });

  return next;
}

export function sellerReservationStatusLabel(status: unknown): string {
  switch (status) {
    case "active":
      return "Active hold";
    case "pending_capture":
      return "Pending capture";
    case "consumed":
      return "Consumed";
    case "released":
      return "Released";
    case "expired":
      return "Expired";
    default:
      return typeof status === "string" && status.trim()
        ? status
        : "Unknown";
  }
}

export function deriveReservationAttention(row: SellerReservationRow): {
  level: SellerInventoryAttentionLevel;
  message: string | null;
  stuck: boolean;
} {
  const stuck = isStuckReservation({
    status: row.status,
    expiresAtIso: row.expiresAt,
  });
  if (stuck) {
    return {
      level: "critical",
      message: "Hold is past expiry and still active — reservation pressure.",
      stuck: true,
    };
  }
  if (row.status === "active" || row.status === "pending_capture") {
    return {
      level: "info",
      message: "Checkout/order inventory hold is active.",
      stuck: false,
    };
  }
  if (row.status === "expired") {
    return {
      level: "warn",
      message: "Hold expired and should no longer block sellable stock.",
      stuck: false,
    };
  }
  return { level: "none", message: null, stuck: false };
}

/** Privacy-safe order reference for seller inventory context. */
export function sellerOrderRefLabel(orderId: string | null): string | null {
  if (!orderId) return null;
  return `Order ${orderId.slice(0, 8)}…`;
}

export const SELLER_INVENTORY_FILTERS: Array<{
  id: SellerInventoryFilterBucket;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "out", label: "Out / reserved" },
  { id: "low", label: "Low stock" },
  { id: "reserved", label: "Has holds" },
  { id: "missing", label: "Missing" },
];

/**
 * Product editor stock field contract alignment.
 * Direct on-hand edits are draft/in-review catalog seed mutations — not a movement ledger.
 */
export function productEditorInventoryAlignmentCopy(): {
  eyebrow: string;
  body: string;
  reservedNote: string;
} {
  return {
    eyebrow: "Catalog seed · not inventory ledger",
    body: "On-hand and safety stock edits here run through the trusted draft/in-review catalog upsert. They are not warehouse movements. Canonical visibility and reservation pressure live in Inventory.",
    reservedNote:
      "Reserved quantity is system-managed by checkout holds and cannot be set by sellers.",
  };
}
