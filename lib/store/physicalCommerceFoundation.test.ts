import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHYSICAL_COMMERCE_FOUNDATION_ID,
  assertPhysicalCheckoutLaunchGate,
  assertVariantActiveForSale,
  assertVariantStoreOwnership,
  classifyOrderFulfillment,
  derivePhysicalInventoryLedger,
  planInventoryRelease,
  planInventoryReserve,
  rejectClientPhysicalPrivilegeFields,
  resolvePhysicalAvailabilityWithLaunchGate,
  validatePhysicalProductModel,
  validatePhysicalVariantModel,
} from "./physicalCommerceFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260892_store_physical_commerce_foundation_v1.sql";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";
const PRODUCT_A = "33333333-3333-4333-8333-333333333333";

describe("Physical Commerce Foundation V1 — migration audit", () => {
  it("uses unused 20260892 and does not touch 20260889–91", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, "supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql"))).toBe(true);
    expect(existsSync(join(ROOT, "supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql"))).toBe(true);
    expect(existsSync(join(ROOT, "supabase/migrations/20260891_store_commission_policy_activation_v1.sql"))).toBe(true);
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    // Body must not rewrite closed money-wave filenames or money RPCs.
    expect(sql).not.toMatch(/20260889_store_|20260890_store_|20260891_store_/);
    expect(sql).toMatch(/product_variants_barcode_uidx/);
    expect(sql).toMatch(/low_stock_threshold/);
    expect(sql).toMatch(/shipping_required/);
    expect(sql).not.toMatch(/create_my_store_stripe_payment_attempt|apply_store_payment_outcome|activate_store_commission/i);
  });
});

describe("Physical product model", () => {
  it("accepts a valid physical product", () => {
    const result = validatePhysicalProductModel({
      productType: "physical",
      weight: 500,
      weightUnit: "g",
      length: 100,
      width: 50,
      height: 20,
      dimensionUnit: "mm",
      shippingRequired: true,
      inventoryTracked: true,
      shippingClass: "standard",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.productType).toBe("physical");
    expect(result.value.shippingRequired).toBe(true);
    expect(result.value.physicalLaunchGated).toBe(true);
    expect(result.value.fulfillmentRequired).toBe(true);
  });

  it("rejects invalid dimensions/weight and non-physical type", () => {
    expect(
      validatePhysicalProductModel({ productType: "digital" }).ok
    ).toBe(false);
    expect(
      validatePhysicalProductModel({
        productType: "physical",
        weight: -1,
      }).ok
    ).toBe(false);
    expect(
      validatePhysicalProductModel({
        productType: "physical",
        length: 10,
        width: 10,
        // missing height
      }).ok
    ).toBe(false);
  });

  it("requires shippable when shipping is required", () => {
    const result = validatePhysicalProductModel({
      productType: "physical",
      shippingRequired: true,
      shippable: false,
    });
    expect(result.ok).toBe(false);
  });

  it("keeps launch gate closed", () => {
    const gate = assertPhysicalCheckoutLaunchGate({ hasPhysicalLines: true });
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.code).toBe("physical_launch_gated");
  });
});

describe("Inventory foundation", () => {
  it("computes stock / reserved / available without negative available", () => {
    const ledger = derivePhysicalInventoryLedger({
      stockQuantity: 10,
      reservedQuantity: 3,
      safetyStock: 1,
      lowStockThreshold: 2,
    });
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) return;
    expect(ledger.value.availableQuantity).toBe(7);
    expect(ledger.value.sellableQuantity).toBe(6);
    expect(ledger.value.status).toBe("in_stock");
  });

  it("reserve / release are idempotent and reject over-reservation", () => {
    const key = "reserve-key-001";
    const first = planInventoryReserve({
      stockQuantity: 5,
      reservedQuantity: 0,
      quantity: 2,
      reservationKey: key,
      priorKeys: [],
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.nextReservedQuantity).toBe(2);

    const replay = planInventoryReserve({
      stockQuantity: 5,
      reservedQuantity: 2,
      quantity: 2,
      reservationKey: key,
      priorKeys: [key],
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.replayed).toBe(true);
    expect(replay.nextReservedQuantity).toBe(2);

    const over = planInventoryReserve({
      stockQuantity: 5,
      reservedQuantity: 4,
      safetyStock: 0,
      quantity: 2,
      allowBackorder: false,
      reservationKey: "reserve-key-002",
      priorKeys: [key],
    });
    expect(over.ok).toBe(false);

    const release = planInventoryRelease({
      stockQuantity: 5,
      reservedQuantity: 2,
      quantity: 2,
      reservationKey: key,
      priorKeys: [key],
      releasedKeys: [],
    });
    expect(release.ok).toBe(true);
    if (!release.ok) return;
    expect(release.nextReservedQuantity).toBe(0);

    const releaseReplay = planInventoryRelease({
      stockQuantity: 5,
      reservedQuantity: 0,
      quantity: 2,
      reservationKey: key,
      priorKeys: [key],
      releasedKeys: [key],
    });
    expect(releaseReplay.ok).toBe(true);
    if (!releaseReplay.ok) return;
    expect(releaseReplay.replayed).toBe(true);
  });

  it("covers out of stock, low stock, backorder, and untracked", () => {
    const oos = derivePhysicalInventoryLedger({
      stockQuantity: 2,
      reservedQuantity: 2,
      allowBackorder: false,
    });
    expect(oos.ok && oos.value.status).toBe("out_of_stock");

    const low = derivePhysicalInventoryLedger({
      stockQuantity: 5,
      reservedQuantity: 3,
      lowStockThreshold: 3,
    });
    expect(low.ok && low.value.status).toBe("low_stock");

    const back = derivePhysicalInventoryLedger({
      stockQuantity: 0,
      reservedQuantity: 0,
      allowBackorder: true,
    });
    expect(back.ok && back.value.status).toBe("backorder");

    const allowed = planInventoryReserve({
      stockQuantity: 0,
      reservedQuantity: 0,
      quantity: 1,
      allowBackorder: true,
      reservationKey: "backorder-key-1",
    });
    expect(allowed.ok).toBe(true);

    const disallowed = planInventoryReserve({
      stockQuantity: 0,
      reservedQuantity: 0,
      quantity: 1,
      allowBackorder: false,
      reservationKey: "backorder-key-2",
    });
    expect(disallowed.ok).toBe(false);

    const untracked = derivePhysicalInventoryLedger({ inventoryTracked: false });
    expect(untracked.ok && untracked.value.status).toBe("not_tracked");
    expect(
      planInventoryReserve({
        stockQuantity: 10,
        reservedQuantity: 0,
        quantity: 1,
        inventoryTracked: false,
        reservationKey: "untracked-key-1",
      }).ok
    ).toBe(false);
  });
});

describe("Variants", () => {
  it("accepts color / size / material and enforces SKU/barcode uniqueness", () => {
    const ok = validatePhysicalVariantModel({
      sku: "TEE-RED-M",
      color: "red",
      size: "M",
      material: "cotton",
      barcode: "BC0001",
      storeId: STORE_A,
      expectedStoreId: STORE_A,
      productId: PRODUCT_A,
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.value.optionValues.color).toBe("red");
    expect(ok.value.optionValues.size).toBe("M");
    expect(ok.value.optionValues.material).toBe("cotton");

    expect(
      validatePhysicalVariantModel({
        sku: "TEE-RED-M",
        existingSkusOnProduct: ["tee-red-m"],
      }).ok
    ).toBe(false);

    expect(
      validatePhysicalVariantModel({
        sku: "TEE-RED-L",
        barcode: "BC0001",
        existingBarcodes: ["bc0001"],
      }).ok
    ).toBe(false);
  });

  it("supports variant-level inventory via ledger + ownership fail-closed", () => {
    const ledger = derivePhysicalInventoryLedger({
      stockQuantity: 4,
      reservedQuantity: 1,
      lowStockThreshold: 1,
    });
    expect(ledger.ok && ledger.value.availableQuantity).toBe(3);

    expect(
      assertVariantStoreOwnership({
        storeId: STORE_B,
        expectedStoreId: STORE_A,
        productId: PRODUCT_A,
      }).ok
    ).toBe(false);

    const archived = validatePhysicalVariantModel({
      sku: "OLD-1",
      status: "archived",
    });
    expect(archived.ok).toBe(true);
    if (!archived.ok) return;
    expect(assertVariantActiveForSale(archived.value.status).ok).toBe(false);
  });
});

describe("Orders / mixed classification", () => {
  it("classifies digital-only, physical-only, and mixed", () => {
    const digital = classifyOrderFulfillment([
      { productType: "digital", digitalEntitlementGranted: true },
    ]);
    expect(digital.kind).toBe("digital_only");
    expect(digital.shippingRequired).toBe(false);
    expect(digital.orderFullyFulfilled).toBe(true);
    expect(digital.physicalLaunchBlocked).toBe(false);

    const physical = classifyOrderFulfillment([
      { productType: "physical", shippingRequired: true },
    ]);
    expect(physical.kind).toBe("physical_only");
    expect(physical.shippingRequired).toBe(true);
    expect(physical.physicalLaunchBlocked).toBe(true);
    expect(physical.orderFullyFulfilled).toBe(false);

    const mixed = classifyOrderFulfillment([
      { productType: "digital", digitalEntitlementGranted: true },
      {
        productType: "physical",
        shippingRequired: true,
        physicalFulfillmentComplete: false,
      },
    ]);
    expect(mixed.kind).toBe("mixed");
    expect(mixed.shippingRequired).toBe(true);
    expect(mixed.digitalFulfillmentComplete).toBe(true);
    expect(mixed.physicalFulfillmentComplete).toBe(false);
    expect(mixed.orderFullyFulfilled).toBe(false);
    expect(mixed.capability).toBe(PHYSICAL_COMMERCE_FOUNDATION_ID);
  });

  it("does not mark mixed order fulfilled after digital entitlement only", () => {
    const mixed = classifyOrderFulfillment([
      { productType: "digital", digitalEntitlementGranted: true },
      {
        productType: "physical",
        fulfillmentRequired: true,
        physicalFulfillmentComplete: false,
      },
    ]);
    expect(mixed.orderFullyFulfilled).toBe(false);

    const both = classifyOrderFulfillment([
      { productType: "digital", digitalEntitlementGranted: true },
      {
        productType: "physical",
        fulfillmentRequired: true,
        physicalFulfillmentComplete: true,
      },
    ]);
    expect(both.orderFullyFulfilled).toBe(true);
    expect(both.physicalLaunchBlocked).toBe(true);
  });

  it("keeps physical checkout blocked and rejects client privilege fields", () => {
    const gated = resolvePhysicalAvailabilityWithLaunchGate({
      productStatus: "active",
      variantStatus: "active",
      inventory: {
        onHand: 10,
        reserved: 0,
        safetyStock: 0,
        allowBackorder: false,
      },
    });
    expect(gated.physicalLaunchGated).toBe(true);
    expect(gated.checkoutAllowed).toBe(false);
    expect(gated.availability.physicalLaunchGated).toBe(true);

    expect(
      rejectClientPhysicalPrivilegeFields({ on_hand: 99, bypassGate: true }).ok
    ).toBe(false);
  });
});
