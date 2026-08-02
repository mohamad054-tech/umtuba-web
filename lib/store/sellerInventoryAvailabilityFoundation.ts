/**
 * Seller Inventory Availability Foundation V1.
 * Trusted availability resolution over existing product_inventory.
 * No duplicate inventory system. No client-supplied stock. No shipping.
 * Digital/service types use unlimited tracking; physical stays finite
 * (physical checkout remains behind commerce_confirm launch gates).
 */

import { availableUnits } from "./inventory";
import { PRODUCT_TYPES, type ProductType } from "./types";

export const SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID =
  "commerce.inventory.seller_inventory_availability_foundation_v1" as const;

/** How stock is tracked for availability decisions. */
export const INVENTORY_AVAILABILITY_MODES = [
  "unlimited",
  "finite",
  "unavailable",
] as const;
export type InventoryAvailabilityMode =
  (typeof INVENTORY_AVAILABILITY_MODES)[number];

export type TrustedInventoryStockSnapshot = {
  onHand: number;
  reserved: number;
  safetyStock: number;
  allowBackorder: boolean;
};

export type TrustedInventoryAvailabilityFacts = {
  productType: string;
  productStatus: string;
  variantStatus: string;
  moderationStatus?: string | null;
  /** Null/missing inventory row — required for finite types. */
  inventory: TrustedInventoryStockSnapshot | null;
};

export type TrustedInventoryAvailabilityResult = {
  capability: typeof SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID;
  mode: InventoryAvailabilityMode;
  /** Sellable units; null when mode is unlimited. */
  availableQuantity: number | null;
  reservedQuantity: number;
  onHandQuantity: number | null;
  safetyStockQuantity: number | null;
  allowBackorder: boolean;
  /** True when a purchase quantity check should not use finite on-hand math. */
  skipFiniteStockCheck: boolean;
  sellable: boolean;
  reasonCode:
    | "unlimited_digital_or_service"
    | "finite_in_stock"
    | "finite_out_of_stock"
    | "finite_backorder"
    | "missing_inventory"
    | "product_unavailable"
    | "variant_unavailable"
    | "invalid_product_type"
    | "inconsistent_inventory";
  message: string;
  /** Physical commerce still requires commerce_confirm — this flag documents that. */
  physicalLaunchGated: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Product types that do not consume finite warehouse stock. */
export const UNLIMITED_INVENTORY_PRODUCT_TYPES: readonly ProductType[] = [
  "digital",
  "service",
  "subscription",
  "bundle",
] as const;

/** Product types that require finite product_inventory rows. */
export const FINITE_INVENTORY_PRODUCT_TYPES: readonly ProductType[] = [
  "physical",
  "booking",
] as const;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isUnlimitedInventoryProductType(
  productType: string
): boolean {
  return (UNLIMITED_INVENTORY_PRODUCT_TYPES as readonly string[]).includes(
    productType
  );
}

export function isFiniteInventoryProductType(productType: string): boolean {
  return (FINITE_INVENTORY_PRODUCT_TYPES as readonly string[]).includes(
    productType
  );
}

export function rejectClientInventoryStockFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(onHand|on_hand|reserved|safetyStock|safety_stock|available|availableToSell|available_to_sell|stock|quantity_available)/i.test(
        key
      ) ||
      key === "allowBackorder" ||
      key === "allow_backorder" ||
      key === "trackingMode" ||
      key === "inventoryMode"
    ) {
      return {
        ok: false,
        message:
          "Client must not supply inventory stock or availability fields.",
      };
    }
  }
  return { ok: true };
}

function isSellableProductStatus(status: string): boolean {
  return status === "active";
}

function isSellableVariantStatus(status: string): boolean {
  return status === "active";
}

function parseStock(
  inventory: TrustedInventoryStockSnapshot | null
):
  | { ok: true; stock: TrustedInventoryStockSnapshot }
  | { ok: false; message: string } {
  if (!inventory) {
    return { ok: false, message: "Inventory row missing." };
  }
  const { onHand, reserved, safetyStock, allowBackorder } = inventory;
  if (
    ![onHand, reserved, safetyStock].every(
      (n) => typeof n === "number" && Number.isInteger(n) && Number.isFinite(n)
    )
  ) {
    return { ok: false, message: "Inventory quantities are inconsistent." };
  }
  if (onHand < 0 || reserved < 0 || safetyStock < 0) {
    return { ok: false, message: "Inventory quantities cannot be negative." };
  }
  if (reserved > onHand) {
    return { ok: false, message: "Reserved exceeds on-hand." };
  }
  return {
    ok: true,
    stock: {
      onHand,
      reserved,
      safetyStock,
      allowBackorder: Boolean(allowBackorder),
    },
  };
}

/**
 * Resolve trusted availability from product type + inventory snapshot.
 * Never trusts client stock fields — callers must supply server-loaded facts.
 */
export function resolveTrustedInventoryAvailability(
  facts: TrustedInventoryAvailabilityFacts
): TrustedInventoryAvailabilityResult {
  const base = {
    capability: SELLER_INVENTORY_AVAILABILITY_FOUNDATION_ID,
  } as const;

  if (!(PRODUCT_TYPES as readonly string[]).includes(facts.productType)) {
    return {
      ...base,
      mode: "unavailable",
      availableQuantity: 0,
      reservedQuantity: 0,
      onHandQuantity: null,
      safetyStockQuantity: null,
      allowBackorder: false,
      skipFiniteStockCheck: false,
      sellable: false,
      reasonCode: "invalid_product_type",
      message: "Unknown product type — availability fail closed.",
      physicalLaunchGated: false,
    };
  }

  if (!isSellableProductStatus(facts.productStatus)) {
    return {
      ...base,
      mode: "unavailable",
      availableQuantity: 0,
      reservedQuantity: facts.inventory?.reserved ?? 0,
      onHandQuantity: facts.inventory?.onHand ?? null,
      safetyStockQuantity: facts.inventory?.safetyStock ?? null,
      allowBackorder: Boolean(facts.inventory?.allowBackorder),
      skipFiniteStockCheck: false,
      sellable: false,
      reasonCode: "product_unavailable",
      message: "Product is not in an active sellable status.",
      physicalLaunchGated: facts.productType === "physical",
    };
  }

  if (!isSellableVariantStatus(facts.variantStatus)) {
    return {
      ...base,
      mode: "unavailable",
      availableQuantity: 0,
      reservedQuantity: facts.inventory?.reserved ?? 0,
      onHandQuantity: facts.inventory?.onHand ?? null,
      safetyStockQuantity: facts.inventory?.safetyStock ?? null,
      allowBackorder: Boolean(facts.inventory?.allowBackorder),
      skipFiniteStockCheck: false,
      sellable: false,
      reasonCode: "variant_unavailable",
      message: "Variant is not active.",
      physicalLaunchGated: facts.productType === "physical",
    };
  }

  if (isUnlimitedInventoryProductType(facts.productType)) {
    const reserved = facts.inventory?.reserved ?? 0;
    return {
      ...base,
      mode: "unlimited",
      availableQuantity: null,
      reservedQuantity: reserved,
      onHandQuantity: facts.inventory?.onHand ?? null,
      safetyStockQuantity: facts.inventory?.safetyStock ?? null,
      allowBackorder: true,
      skipFiniteStockCheck: true,
      sellable: true,
      reasonCode: "unlimited_digital_or_service",
      message:
        "Non-physical catalog type uses unlimited availability (finite warehouse math not applied).",
      physicalLaunchGated: false,
    };
  }

  // Finite types (physical / booking)
  const parsed = parseStock(facts.inventory);
  if (!parsed.ok) {
    return {
      ...base,
      mode: "unavailable",
      availableQuantity: 0,
      reservedQuantity: 0,
      onHandQuantity: null,
      safetyStockQuantity: null,
      allowBackorder: false,
      skipFiniteStockCheck: false,
      sellable: false,
      reasonCode:
        facts.inventory == null ? "missing_inventory" : "inconsistent_inventory",
      message:
        facts.inventory == null
          ? "Finite inventory product requires a trusted inventory row."
          : parsed.message,
      physicalLaunchGated: true,
    };
  }

  const available = availableUnits({
    onHand: parsed.stock.onHand,
    reserved: parsed.stock.reserved,
    safetyStock: parsed.stock.safetyStock,
  });

  if (available > 0) {
    return {
      ...base,
      mode: "finite",
      availableQuantity: available,
      reservedQuantity: parsed.stock.reserved,
      onHandQuantity: parsed.stock.onHand,
      safetyStockQuantity: parsed.stock.safetyStock,
      allowBackorder: parsed.stock.allowBackorder,
      skipFiniteStockCheck: false,
      sellable: true,
      reasonCode: "finite_in_stock",
      message: "Finite stock available after reserved and safety stock.",
      physicalLaunchGated: true,
    };
  }

  if (parsed.stock.allowBackorder) {
    return {
      ...base,
      mode: "finite",
      availableQuantity: 0,
      reservedQuantity: parsed.stock.reserved,
      onHandQuantity: parsed.stock.onHand,
      safetyStockQuantity: parsed.stock.safetyStock,
      allowBackorder: true,
      skipFiniteStockCheck: true,
      sellable: true,
      reasonCode: "finite_backorder",
      message: "Finite stock is zero but backorder is allowed on the inventory row.",
      physicalLaunchGated: true,
    };
  }

  return {
    ...base,
    mode: "unavailable",
    availableQuantity: 0,
    reservedQuantity: parsed.stock.reserved,
    onHandQuantity: parsed.stock.onHand,
    safetyStockQuantity: parsed.stock.safetyStock,
    allowBackorder: false,
    skipFiniteStockCheck: false,
    sellable: false,
    reasonCode: "finite_out_of_stock",
    message: "Finite stock is zero after reserved and safety stock.",
    physicalLaunchGated: true,
  };
}

/**
 * Quantity allowed for cart/checkout against a resolved availability result.
 * Unlimited / backorder skip finite caps; otherwise clamp to availableQuantity.
 */
export function assertQuantityAgainstAvailability(
  availability: TrustedInventoryAvailabilityResult,
  quantity: number
): { ok: true } | { ok: false; message: string } {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, message: "Quantity must be a positive whole number." };
  }
  if (!availability.sellable) {
    return {
      ok: false,
      message: availability.message || "Item is unavailable.",
    };
  }
  if (availability.skipFiniteStockCheck) {
    return { ok: true };
  }
  const available = availability.availableQuantity ?? 0;
  if (quantity > available) {
    return {
      ok: false,
      message:
        available <= 0
          ? "This item is out of stock."
          : `Only ${available} available in stock.`,
    };
  }
  return { ok: true };
}

/**
 * Availability foundation does not replace digital publish-readiness
 * (asset must still be present for digital submit/marketplace).
 */
export function inventoryAvailabilityDoesNotReplacePublishReadiness(): {
  replacesDigitalPublishReadiness: false;
  replacesCategoryGate: false;
  note: string;
} {
  return {
    replacesDigitalPublishReadiness: false,
    replacesCategoryGate: false,
    note: "Inventory availability is orthogonal to digital asset publish readiness and category taxonomy gates.",
  };
}
