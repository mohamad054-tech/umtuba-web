/**
 * Inventory reservation domain helpers (Commerce Safety V1).
 * Counter math stays aligned with product_inventory.reserved.
 */

export const INVENTORY_RESERVATION_STATUSES = [
  "active",
  "released",
  "expired",
  "consumed",
] as const;

export type InventoryReservationStatus =
  (typeof INVENTORY_RESERVATION_STATUSES)[number];

export const INVENTORY_RESERVATION_EVENT_TYPES = [
  "created",
  "released",
  "expired",
  "consumed",
] as const;

export type InventoryReservationEventType =
  (typeof INVENTORY_RESERVATION_EVENT_TYPES)[number];

/** Default TTL mirrored in store_commerce_settings (minutes). */
export const DEFAULT_RESERVATION_TTL_MINUTES = 45;

/**
 * Units that can still be reserved against on_hand without violating
 * reserved <= on_hand.
 */
export function reservableUnits(input: {
  onHand: number;
  reserved: number;
}): number {
  const n = input.onHand - input.reserved;
  return n > 0 ? n : 0;
}

export function canReserveQuantity(input: {
  onHand: number;
  reserved: number;
  safetyStock: number;
  allowBackorder: boolean;
  quantity: number;
}): boolean {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) return false;
  const available = input.onHand - input.reserved - input.safetyStock;
  const sellable = available > 0 ? available : 0;
  const reservable = reservableUnits(input);
  if (input.quantity > reservable) return false;
  if (!input.allowBackorder && input.quantity > sellable) return false;
  return true;
}
