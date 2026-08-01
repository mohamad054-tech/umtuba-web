/**
 * Commerce Physical Commerce Foundation V1.
 * Domain contracts for physical products, inventory status, variants,
 * shipping metadata, mixed-order classification, and launch gating.
 *
 * Does NOT enable physical live Stripe capture, carriers, or settlement changes.
 */

import { availableUnits, validateInventoryInput } from "./inventory";
import {
  FINITE_INVENTORY_PRODUCT_TYPES,
  resolveTrustedInventoryAvailability,
  type TrustedInventoryAvailabilityResult,
  type TrustedInventoryStockSnapshot,
} from "./sellerInventoryAvailabilityFoundation";
import { PRODUCT_TYPES, type ProductType } from "./types";

export const PHYSICAL_COMMERCE_FOUNDATION_ID =
  "commerce.physical.foundation_v1" as const;

export const PHYSICAL_WEIGHT_UNITS = ["g", "kg", "oz", "lb"] as const;
export type PhysicalWeightUnit = (typeof PHYSICAL_WEIGHT_UNITS)[number];

export const PHYSICAL_DIMENSION_UNITS = ["mm", "cm", "in"] as const;
export type PhysicalDimensionUnit = (typeof PHYSICAL_DIMENSION_UNITS)[number];

export const PHYSICAL_SHIPPING_CLASSES = [
  "standard",
  "oversized",
  "fragile",
  "special",
] as const;
export type PhysicalShippingClass = (typeof PHYSICAL_SHIPPING_CLASSES)[number];

export const PHYSICAL_INVENTORY_STATUSES = [
  "in_stock",
  "low_stock",
  "out_of_stock",
  "backorder",
  "not_tracked",
] as const;
export type PhysicalInventoryStatus =
  (typeof PHYSICAL_INVENTORY_STATUSES)[number];

export const PHYSICAL_VARIANT_OPTION_KEYS = [
  "color",
  "size",
  "material",
] as const;
export type PhysicalVariantOptionKey =
  (typeof PHYSICAL_VARIANT_OPTION_KEYS)[number];

export const ORDER_FULFILLMENT_KINDS = [
  "digital_only",
  "physical_only",
  "mixed",
  "empty",
] as const;
export type OrderFulfillmentKind = (typeof ORDER_FULFILLMENT_KINDS)[number];

const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const BARCODE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{3,63}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PhysicalProductModelInput = {
  productType?: unknown;
  shippingRequired?: unknown;
  inventoryTracked?: unknown;
  allowBackorders?: unknown;
  fulfillmentRequired?: unknown;
  shippable?: unknown;
  weight?: unknown;
  weightUnit?: unknown;
  length?: unknown;
  width?: unknown;
  height?: unknown;
  dimensionUnit?: unknown;
  shippingClass?: unknown;
  fragile?: unknown;
  specialHandling?: unknown;
  packageWeight?: unknown;
  packageLength?: unknown;
  packageWidth?: unknown;
  packageHeight?: unknown;
};

export type PhysicalProductModel = {
  productType: "physical";
  shippingRequired: boolean;
  inventoryTracked: boolean;
  allowBackorders: boolean;
  fulfillmentRequired: boolean;
  shippable: boolean;
  weight: number | null;
  weightUnit: PhysicalWeightUnit;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: PhysicalDimensionUnit;
  shippingClass: PhysicalShippingClass | null;
  fragile: boolean;
  specialHandling: boolean;
  packageWeight: number | null;
  packageLength: number | null;
  packageWidth: number | null;
  packageHeight: number | null;
  /** Always true in this foundation — physical launch remains disabled. */
  physicalLaunchGated: true;
};

export type PhysicalInventoryLedger = {
  stockQuantity: number;
  reservedQuantity: number;
  /** Derived: max(0, stock - reserved). Never stored as source of truth. */
  availableQuantity: number;
  /** Sellable after safety stock (existing store convention). */
  sellableQuantity: number;
  safetyStock: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  inventoryTracked: boolean;
  status: PhysicalInventoryStatus;
};

export type PhysicalVariantModelInput = {
  sku?: unknown;
  title?: unknown;
  barcode?: unknown;
  optionValues?: unknown;
  color?: unknown;
  size?: unknown;
  material?: unknown;
  status?: unknown;
  weightGrams?: unknown;
  lengthMm?: unknown;
  widthMm?: unknown;
  heightMm?: unknown;
  productId?: unknown;
  storeId?: unknown;
  /** Other SKUs already owned by the same product (case-insensitive). */
  existingSkusOnProduct?: unknown;
  /** Other barcodes in the uniqueness domain (case-insensitive). */
  existingBarcodes?: unknown;
  /** Expected owning store id for cross-store fail-closed checks. */
  expectedStoreId?: unknown;
};

export type PhysicalVariantModel = {
  sku: string;
  title: string;
  barcode: string | null;
  optionValues: Record<string, string>;
  color: string | null;
  size: string | null;
  material: string | null;
  status: "active" | "hidden" | "archived";
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
};

export type OrderLineClassificationInput = {
  productType: string;
  quantity?: number;
  shippingRequired?: boolean | null;
  fulfillmentRequired?: boolean | null;
  /** When true, line already has digital entitlement grant path. */
  digitalEntitlementGranted?: boolean;
  /** When true, physical fulfillment/shipment completed. */
  physicalFulfillmentComplete?: boolean;
};

export type OrderClassificationResult = {
  capability: typeof PHYSICAL_COMMERCE_FOUNDATION_ID;
  kind: OrderFulfillmentKind;
  hasDigitalLines: boolean;
  hasPhysicalLines: boolean;
  shippingRequired: boolean;
  digitalFulfillmentComplete: boolean;
  physicalFulfillmentComplete: boolean;
  /** True only when every required fulfillment track is complete. */
  orderFullyFulfilled: boolean;
  /** Physical sell path remains launch-gated in this foundation. */
  physicalLaunchBlocked: boolean;
  message: string;
};

function parseNonNegInt(
  value: unknown,
  label: string,
  opts?: { allowNull?: boolean }
):
  | { ok: true; value: number | null }
  | { ok: false; message: string } {
  if (value === undefined || value === null || value === "") {
    if (opts?.allowNull) return { ok: true, value: null };
    return { ok: false, message: `${label} is required.` };
  }
  if (typeof value === "string" && value.trim() !== "") {
    if (!/^\d+$/.test(value.trim())) {
      return { ok: false, message: `${label} must be a whole number.` };
    }
    value = Number(value.trim());
  }
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, message: `${label} must be a whole number.` };
  }
  if (value < 0) {
    return { ok: false, message: `${label} cannot be negative.` };
  }
  return { ok: true, value };
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "yes") return true;
    if (t === "false" || t === "0" || t === "no") return false;
  }
  return Boolean(value);
}

export function isPhysicalProductType(productType: string): boolean {
  return productType === "physical";
}

/**
 * Validate / normalize a physical product model.
 * Fail-closed for non-physical types and invalid dimensions/weight.
 */
export function validatePhysicalProductModel(
  input: PhysicalProductModelInput
):
  | { ok: true; value: PhysicalProductModel }
  | { ok: false; message: string } {
  const productType =
    typeof input.productType === "string" ? input.productType.trim() : "";
  if (productType !== "physical") {
    return {
      ok: false,
      message: "Physical product model requires product_type = physical.",
    };
  }

  const weightUnitRaw =
    typeof input.weightUnit === "string" && input.weightUnit.trim()
      ? input.weightUnit.trim().toLowerCase()
      : "g";
  if (!(PHYSICAL_WEIGHT_UNITS as readonly string[]).includes(weightUnitRaw)) {
    return { ok: false, message: "Weight unit is invalid." };
  }

  const dimensionUnitRaw =
    typeof input.dimensionUnit === "string" && input.dimensionUnit.trim()
      ? input.dimensionUnit.trim().toLowerCase()
      : "mm";
  if (
    !(PHYSICAL_DIMENSION_UNITS as readonly string[]).includes(dimensionUnitRaw)
  ) {
    return { ok: false, message: "Dimension unit is invalid." };
  }

  const weight = parseNonNegInt(input.weight, "Weight", { allowNull: true });
  if (!weight.ok) return weight;
  const length = parseNonNegInt(input.length, "Length", { allowNull: true });
  if (!length.ok) return length;
  const width = parseNonNegInt(input.width, "Width", { allowNull: true });
  if (!width.ok) return width;
  const height = parseNonNegInt(input.height, "Height", { allowNull: true });
  if (!height.ok) return height;

  const dims = [length.value, width.value, height.value];
  const anyDim = dims.some((d) => d != null);
  const allDim = dims.every((d) => d != null);
  if (anyDim && !allDim) {
    return {
      ok: false,
      message: "Dimensions must include length, width, and height together.",
    };
  }

  let shippingClass: PhysicalShippingClass | null = null;
  if (input.shippingClass != null && input.shippingClass !== "") {
    const raw =
      typeof input.shippingClass === "string"
        ? input.shippingClass.trim().toLowerCase()
        : "";
    if (!(PHYSICAL_SHIPPING_CLASSES as readonly string[]).includes(raw)) {
      return { ok: false, message: "Shipping class is invalid." };
    }
    shippingClass = raw as PhysicalShippingClass;
  }

  const packageWeight = parseNonNegInt(input.packageWeight, "Package weight", {
    allowNull: true,
  });
  if (!packageWeight.ok) return packageWeight;
  const packageLength = parseNonNegInt(input.packageLength, "Package length", {
    allowNull: true,
  });
  if (!packageLength.ok) return packageLength;
  const packageWidth = parseNonNegInt(input.packageWidth, "Package width", {
    allowNull: true,
  });
  if (!packageWidth.ok) return packageWidth;
  const packageHeight = parseNonNegInt(input.packageHeight, "Package height", {
    allowNull: true,
  });
  if (!packageHeight.ok) return packageHeight;

  const pkgDims = [packageLength.value, packageWidth.value, packageHeight.value];
  const anyPkg = pkgDims.some((d) => d != null);
  const allPkg = pkgDims.every((d) => d != null);
  if (anyPkg && !allPkg) {
    return {
      ok: false,
      message:
        "Package dimensions must include length, width, and height together.",
    };
  }

  const shippingRequired = parseBool(input.shippingRequired, true);
  const inventoryTracked = parseBool(input.inventoryTracked, true);
  const fulfillmentRequired = parseBool(input.fulfillmentRequired, true);
  const shippable = parseBool(input.shippable, shippingRequired);
  const allowBackorders = parseBool(input.allowBackorders, false);
  const fragile = parseBool(input.fragile, shippingClass === "fragile");
  const specialHandling = parseBool(
    input.specialHandling,
    shippingClass === "special" || fragile
  );

  if (shippingRequired && !shippable) {
    return {
      ok: false,
      message: "Shipping-required physical products must be shippable.",
    };
  }

  return {
    ok: true,
    value: {
      productType: "physical",
      shippingRequired,
      inventoryTracked,
      allowBackorders,
      fulfillmentRequired,
      shippable,
      weight: weight.value,
      weightUnit: weightUnitRaw as PhysicalWeightUnit,
      length: length.value,
      width: width.value,
      height: height.value,
      dimensionUnit: dimensionUnitRaw as PhysicalDimensionUnit,
      shippingClass,
      fragile,
      specialHandling,
      packageWeight: packageWeight.value,
      packageLength: packageLength.value,
      packageWidth: packageWidth.value,
      packageHeight: packageHeight.value,
      physicalLaunchGated: true,
    },
  };
}

/**
 * Derive inventory status. available = stock - reserved (never negative).
 * Sellable uses existing safety-stock convention via availableUnits().
 */
export function derivePhysicalInventoryLedger(input: {
  stockQuantity?: unknown;
  reservedQuantity?: unknown;
  safetyStock?: unknown;
  lowStockThreshold?: unknown;
  allowBackorder?: unknown;
  inventoryTracked?: unknown;
}):
  | { ok: true; value: PhysicalInventoryLedger }
  | { ok: false; message: string } {
  const tracked = parseBool(input.inventoryTracked, true);
  if (!tracked) {
    return {
      ok: true,
      value: {
        stockQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        sellableQuantity: 0,
        safetyStock: 0,
        lowStockThreshold: 0,
        allowBackorder: false,
        inventoryTracked: false,
        status: "not_tracked",
      },
    };
  }

  const validated = validateInventoryInput({
    onHand: input.stockQuantity,
    reserved: input.reservedQuantity ?? 0,
    safetyStock: input.safetyStock ?? 0,
    allowBackorder: input.allowBackorder,
  });
  if (!validated.ok) return validated;

  const thresholdParsed = parseNonNegInt(
    input.lowStockThreshold ?? 0,
    "Low stock threshold",
    { allowNull: false }
  );
  if (!thresholdParsed.ok) return thresholdParsed;
  const lowStockThreshold = thresholdParsed.value as number;

  const availableQuantity = Math.max(
    0,
    validated.onHand - validated.reserved
  );
  const sellableQuantity = availableUnits({
    onHand: validated.onHand,
    reserved: validated.reserved,
    safetyStock: validated.safetyStock,
  });

  let status: PhysicalInventoryStatus;
  if (availableQuantity <= 0) {
    status = validated.allowBackorder ? "backorder" : "out_of_stock";
  } else if (availableQuantity <= lowStockThreshold) {
    status = "low_stock";
  } else {
    status = "in_stock";
  }

  return {
    ok: true,
    value: {
      stockQuantity: validated.onHand,
      reservedQuantity: validated.reserved,
      availableQuantity,
      sellableQuantity,
      safetyStock: validated.safetyStock,
      lowStockThreshold,
      allowBackorder: validated.allowBackorder,
      inventoryTracked: true,
      status,
    },
  };
}

/**
 * Pure reserve semantics (idempotent by reservationKey within a session map).
 * Does not mutate DB — callers persist via existing reservation RPCs.
 */
export function planInventoryReserve(input: {
  stockQuantity: number;
  reservedQuantity: number;
  safetyStock?: number;
  quantity: number;
  allowBackorder?: boolean;
  inventoryTracked?: boolean;
  reservationKey: string;
  priorKeys?: ReadonlySet<string> | readonly string[];
}):
  | {
      ok: true;
      replayed: boolean;
      nextReservedQuantity: number;
      availableAfter: number;
    }
  | { ok: false; message: string } {
  const key = input.reservationKey?.trim() ?? "";
  if (key.length < 8 || key.length > 160) {
    return { ok: false, message: "Reservation key length is invalid." };
  }
  const prior =
    input.priorKeys instanceof Set
      ? input.priorKeys
      : new Set(input.priorKeys ?? []);
  if (prior.has(key)) {
    const availableAfter = Math.max(
      0,
      input.stockQuantity - input.reservedQuantity
    );
    return {
      ok: true,
      replayed: true,
      nextReservedQuantity: input.reservedQuantity,
      availableAfter,
    };
  }

  if (input.inventoryTracked === false) {
    return {
      ok: false,
      message: "Cannot reserve stock for untracked inventory.",
    };
  }

  const ledger = derivePhysicalInventoryLedger({
    stockQuantity: input.stockQuantity,
    reservedQuantity: input.reservedQuantity,
    safetyStock: input.safetyStock ?? 0,
    allowBackorder: input.allowBackorder,
    inventoryTracked: true,
  });
  if (!ledger.ok) return ledger;

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, message: "Reserve quantity must be a positive whole number." };
  }

  const sellable = ledger.value.sellableQuantity;
  if (!input.allowBackorder && input.quantity > sellable) {
    return {
      ok: false,
      message: "Over-reservation rejected: quantity exceeds sellable stock.",
    };
  }

  const nextReserved = input.reservedQuantity + input.quantity;
  if (nextReserved > input.stockQuantity && !input.allowBackorder) {
    return {
      ok: false,
      message: "Over-reservation rejected: reserved cannot exceed stock.",
    };
  }
  // Fail-closed: never allow negative available when backorder disallowed.
  if (!input.allowBackorder && input.stockQuantity - nextReserved < 0) {
    return {
      ok: false,
      message: "Available quantity cannot become negative.",
    };
  }

  return {
    ok: true,
    replayed: false,
    nextReservedQuantity: nextReserved,
    availableAfter: Math.max(0, input.stockQuantity - nextReserved),
  };
}

export function planInventoryRelease(input: {
  stockQuantity: number;
  reservedQuantity: number;
  quantity: number;
  reservationKey: string;
  priorKeys?: ReadonlySet<string> | readonly string[];
  releasedKeys?: ReadonlySet<string> | readonly string[];
}):
  | {
      ok: true;
      replayed: boolean;
      nextReservedQuantity: number;
      availableAfter: number;
    }
  | { ok: false; message: string } {
  const key = input.reservationKey?.trim() ?? "";
  if (key.length < 8 || key.length > 160) {
    return { ok: false, message: "Reservation key length is invalid." };
  }
  const released =
    input.releasedKeys instanceof Set
      ? input.releasedKeys
      : new Set(input.releasedKeys ?? []);
  if (released.has(key)) {
    return {
      ok: true,
      replayed: true,
      nextReservedQuantity: input.reservedQuantity,
      availableAfter: Math.max(0, input.stockQuantity - input.reservedQuantity),
    };
  }

  const prior =
    input.priorKeys instanceof Set
      ? input.priorKeys
      : new Set(input.priorKeys ?? []);
  if (!prior.has(key)) {
    return {
      ok: false,
      message: "Release fail-closed: unknown reservation key.",
    };
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { ok: false, message: "Release quantity must be a positive whole number." };
  }
  if (input.quantity > input.reservedQuantity) {
    return {
      ok: false,
      message: "Release quantity cannot exceed reserved quantity.",
    };
  }

  const nextReserved = input.reservedQuantity - input.quantity;
  return {
    ok: true,
    replayed: false,
    nextReservedQuantity: nextReserved,
    availableAfter: Math.max(0, input.stockQuantity - nextReserved),
  };
}

export function validatePhysicalVariantModel(
  input: PhysicalVariantModelInput
):
  | { ok: true; value: PhysicalVariantModel }
  | { ok: false; message: string } {
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  if (!SKU_RE.test(sku)) {
    return { ok: false, message: "SKU is invalid." };
  }

  const existingSkus = normalizeStringList(input.existingSkusOnProduct);
  if (existingSkus.some((s) => s.toLowerCase() === sku.toLowerCase())) {
    return { ok: false, message: "SKU must be unique on the product." };
  }

  let barcode: string | null = null;
  if (input.barcode != null && input.barcode !== "") {
    const raw = typeof input.barcode === "string" ? input.barcode.trim() : "";
    if (!BARCODE_RE.test(raw)) {
      return { ok: false, message: "Barcode is invalid." };
    }
    barcode = raw;
    const existingBarcodes = normalizeStringList(input.existingBarcodes);
    if (
      existingBarcodes.some((b) => b.toLowerCase() === barcode!.toLowerCase())
    ) {
      return { ok: false, message: "Barcode must be unique." };
    }
  }

  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim().slice(0, 120)
      : "Default";

  const optionValues: Record<string, string> = {};
  if (input.optionValues && typeof input.optionValues === "object") {
    for (const [key, val] of Object.entries(
      input.optionValues as Record<string, unknown>
    )) {
      if (typeof key === "string" && typeof val === "string" && val.trim()) {
        optionValues[key.slice(0, 40)] = val.trim().slice(0, 80);
      }
    }
  }

  const color = optionalOption(input.color);
  const size = optionalOption(input.size);
  const material = optionalOption(input.material);
  if (color) optionValues.color = color;
  if (size) optionValues.size = size;
  if (material) optionValues.material = material;

  let status: PhysicalVariantModel["status"] = "active";
  if (input.status != null && input.status !== "") {
    const raw =
      typeof input.status === "string" ? input.status.trim().toLowerCase() : "";
    if (raw !== "active" && raw !== "hidden" && raw !== "archived") {
      return { ok: false, message: "Variant status is invalid." };
    }
    status = raw;
  }

  const ownership = assertVariantStoreOwnership({
    storeId: input.storeId,
    expectedStoreId: input.expectedStoreId,
    productId: input.productId,
  });
  if (!ownership.ok) return ownership;

  const weightGrams = parseNonNegInt(input.weightGrams, "Variant weight", {
    allowNull: true,
  });
  if (!weightGrams.ok) return weightGrams;
  const lengthMm = parseNonNegInt(input.lengthMm, "Variant length", {
    allowNull: true,
  });
  if (!lengthMm.ok) return lengthMm;
  const widthMm = parseNonNegInt(input.widthMm, "Variant width", {
    allowNull: true,
  });
  if (!widthMm.ok) return widthMm;
  const heightMm = parseNonNegInt(input.heightMm, "Variant height", {
    allowNull: true,
  });
  if (!heightMm.ok) return heightMm;

  return {
    ok: true,
    value: {
      sku,
      title,
      barcode,
      optionValues,
      color: typeof optionValues.color === "string" ? optionValues.color : null,
      size: typeof optionValues.size === "string" ? optionValues.size : null,
      material:
        typeof optionValues.material === "string" ? optionValues.material : null,
      status,
      weightGrams: weightGrams.value,
      lengthMm: lengthMm.value,
      widthMm: widthMm.value,
      heightMm: heightMm.value,
    },
  };
}

/** Archived / hidden variants are blocked from sale. */
export function assertVariantActiveForSale(status: string):
  | { ok: true }
  | { ok: false; message: string } {
  if (status === "active") return { ok: true };
  if (status === "archived") {
    return { ok: false, message: "Archived variant is blocked from sale." };
  }
  return { ok: false, message: "Variant is not active for sale." };
}

export function assertVariantStoreOwnership(input: {
  storeId?: unknown;
  expectedStoreId?: unknown;
  productId?: unknown;
}): { ok: true } | { ok: false; message: string } {
  const storeId =
    typeof input.storeId === "string" ? input.storeId.trim() : "";
  const expected =
    typeof input.expectedStoreId === "string"
      ? input.expectedStoreId.trim()
      : "";
  if (expected) {
    if (!UUID_RE.test(expected)) {
      return { ok: false, message: "Expected store id is invalid." };
    }
    if (!storeId || storeId.toLowerCase() !== expected.toLowerCase()) {
      return {
        ok: false,
        message: "Wrong-store ownership rejected for variant mutation.",
      };
    }
  }
  if (storeId && !UUID_RE.test(storeId)) {
    return { ok: false, message: "Store id is invalid." };
  }
  if (input.productId != null && input.productId !== "") {
    const productId =
      typeof input.productId === "string" ? input.productId.trim() : "";
    if (!UUID_RE.test(productId)) {
      return { ok: false, message: "Product id is invalid." };
    }
  }
  return { ok: true };
}

/**
 * Physical checkout / payment remains launch-gated.
 * Does not change Stripe — callers must fail closed before opening physical money paths.
 */
export function assertPhysicalCheckoutLaunchGate(input: {
  hasPhysicalLines: boolean;
  physicalLaunchEnabled?: boolean;
  liveStripePhysicalCaptureEnabled?: boolean;
}): { ok: true } | { ok: false; code: "physical_launch_gated"; message: string } {
  if (!input.hasPhysicalLines) return { ok: true };
  if (input.physicalLaunchEnabled === true) {
    // Still blocked unless an explicit future phase flips capture — foundation keeps closed.
    return {
      ok: false,
      code: "physical_launch_gated",
      message:
        "Physical Commerce Foundation V1 keeps physical checkout launch-gated.",
    };
  }
  if (input.liveStripePhysicalCaptureEnabled === true) {
    return {
      ok: false,
      code: "physical_launch_gated",
      message:
        "Physical live Stripe capture must remain disabled in this foundation.",
    };
  }
  return {
    ok: false,
    code: "physical_launch_gated",
    message:
      "Physical order lines are blocked by launch gate (digital-only live capture remains).",
  };
}

export function classifyOrderFulfillment(
  lines: readonly OrderLineClassificationInput[]
): OrderClassificationResult {
  const capability = PHYSICAL_COMMERCE_FOUNDATION_ID;
  if (!lines.length) {
    return {
      capability,
      kind: "empty",
      hasDigitalLines: false,
      hasPhysicalLines: false,
      shippingRequired: false,
      digitalFulfillmentComplete: true,
      physicalFulfillmentComplete: true,
      orderFullyFulfilled: true,
      physicalLaunchBlocked: false,
      message: "No order lines.",
    };
  }

  let hasDigital = false;
  let hasPhysical = false;
  let shippingRequired = false;
  let digitalComplete = true;
  let physicalComplete = true;
  let physicalNeedsFulfillment = false;

  for (const line of lines) {
    const qty =
      line.quantity === undefined
        ? 1
        : Number.isInteger(line.quantity)
          ? line.quantity
          : 0;
    if (qty < 1) {
      return {
        capability,
        kind: "empty",
        hasDigitalLines: false,
        hasPhysicalLines: false,
        shippingRequired: false,
        digitalFulfillmentComplete: false,
        physicalFulfillmentComplete: false,
        orderFullyFulfilled: false,
        physicalLaunchBlocked: true,
        message: "Order classification fail-closed: invalid line quantity.",
      };
    }

    const type = String(line.productType ?? "").trim();
    if (!(PRODUCT_TYPES as readonly string[]).includes(type as ProductType)) {
      return {
        capability,
        kind: "empty",
        hasDigitalLines: false,
        hasPhysicalLines: false,
        shippingRequired: false,
        digitalFulfillmentComplete: false,
        physicalFulfillmentComplete: false,
        orderFullyFulfilled: false,
        physicalLaunchBlocked: true,
        message: "Order classification fail-closed: unknown product type.",
      };
    }

    if (type === "digital") {
      hasDigital = true;
      if (!line.digitalEntitlementGranted) digitalComplete = false;
    } else if (type === "physical") {
      hasPhysical = true;
      const ship =
        line.shippingRequired == null ? true : Boolean(line.shippingRequired);
      const fulfill =
        line.fulfillmentRequired == null
          ? true
          : Boolean(line.fulfillmentRequired);
      if (ship) shippingRequired = true;
      if (fulfill) {
        physicalNeedsFulfillment = true;
        if (!line.physicalFulfillmentComplete) physicalComplete = false;
      }
    } else if ((FINITE_INVENTORY_PRODUCT_TYPES as readonly string[]).includes(type)) {
      // booking etc. — treat as physical-like fulfillment track for classification only.
      hasPhysical = true;
      shippingRequired = true;
      physicalNeedsFulfillment = true;
      if (!line.physicalFulfillmentComplete) physicalComplete = false;
    } else {
      // service/subscription/bundle — no physical shipping in this foundation.
      hasDigital = true;
      if (!line.digitalEntitlementGranted) digitalComplete = false;
    }
  }

  if (!physicalNeedsFulfillment) physicalComplete = true;

  let kind: OrderFulfillmentKind;
  if (hasDigital && hasPhysical) kind = "mixed";
  else if (hasPhysical) kind = "physical_only";
  else kind = "digital_only";

  const gate = assertPhysicalCheckoutLaunchGate({
    hasPhysicalLines: hasPhysical,
  });

  // Mixed: digital entitlement alone must NOT mark order fully fulfilled.
  const fully =
    kind === "mixed"
      ? digitalComplete && physicalComplete
      : kind === "digital_only"
        ? digitalComplete
        : physicalComplete;

  return {
    capability,
    kind,
    hasDigitalLines: hasDigital,
    hasPhysicalLines: hasPhysical,
    shippingRequired,
    digitalFulfillmentComplete: digitalComplete,
    physicalFulfillmentComplete: physicalComplete,
    orderFullyFulfilled: fully,
    physicalLaunchBlocked: !gate.ok,
    message:
      kind === "mixed"
        ? "Mixed order: digital entitlement and physical fulfillment are separate tracks."
        : kind === "physical_only"
          ? "Physical-only order requires shipping/fulfillment; launch gate remains closed."
          : "Digital-only order; physical launch gate not applicable.",
  };
}

/**
 * Bridge helper: physical availability + launch gate documentation.
 * Reuses existing trusted inventory resolution; does not open checkout.
 */
export function resolvePhysicalAvailabilityWithLaunchGate(input: {
  productStatus: string;
  variantStatus: string;
  inventory: TrustedInventoryStockSnapshot | null;
  inventoryTracked?: boolean;
  lowStockThreshold?: number;
}): {
  availability: TrustedInventoryAvailabilityResult;
  ledger: PhysicalInventoryLedger | null;
  physicalLaunchGated: true;
  checkoutAllowed: false;
} {
  const availability = resolveTrustedInventoryAvailability({
    productType: "physical",
    productStatus: input.productStatus,
    variantStatus: input.variantStatus,
    inventory: input.inventory,
  });

  let ledger: PhysicalInventoryLedger | null = null;
  if (input.inventoryTracked === false) {
    const derived = derivePhysicalInventoryLedger({ inventoryTracked: false });
    ledger = derived.ok ? derived.value : null;
  } else if (input.inventory) {
    const derived = derivePhysicalInventoryLedger({
      stockQuantity: input.inventory.onHand,
      reservedQuantity: input.inventory.reserved,
      safetyStock: input.inventory.safetyStock,
      allowBackorder: input.inventory.allowBackorder,
      lowStockThreshold: input.lowStockThreshold ?? 0,
      inventoryTracked: true,
    });
    ledger = derived.ok ? derived.value : null;
  }

  return {
    availability,
    ledger,
    physicalLaunchGated: true,
    checkoutAllowed: false,
  };
}

function optionalOption(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, 80);
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.trim());
}

/** Reject client bags that try to privilege-mutate inventory or flip launch gates. */
export function rejectClientPhysicalPrivilegeFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /^(onHand|on_hand|reserved|available|stock|physicalLaunchEnabled|liveStripePhysical|forceFulfill|bypassGate)/i.test(
        key
      )
    ) {
      return {
        ok: false,
        message:
          "Client must not supply privileged physical inventory or launch-gate fields.",
      };
    }
  }
  return { ok: true };
}
