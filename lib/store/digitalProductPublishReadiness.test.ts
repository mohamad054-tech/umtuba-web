/**
 * Focused tests — Commerce Digital Product Publish Readiness V1.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildStoreDigitalProductAssetPath,
  isOwnedStoreDigitalProductAssetPath,
} from "./mediaConstants";
import {
  DIGITAL_PRODUCT_PUBLISH_READINESS_ID,
  evaluateDigitalProductPublishReadiness,
} from "./digitalProductPublishReadiness";
import { collectProductMarketplaceBlockers } from "./marketplaceEligibility";
import { evaluateMarketplaceEligibility } from "./marketplaceSupplierSeller";

const ROOT = join(__dirname, "../..");
const PRODUCT = "66666666-6666-4666-8666-666666666666";
const STORE = "77777777-7777-4777-8777-777777777777";
const OTHER = "22222222-2222-4222-8222-222222222222";
const FILE = "88888888-8888-4888-8888-888888888888";
const SAFE_PATH = buildStoreDigitalProductAssetPath(STORE, PRODUCT, FILE, "pdf");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const eligibleBase = {
  marketplaceSupplierEnabled: true,
  supplierStoreStatus: "active",
  supplierVerificationStatus: "verified",
  marketplaceEligible: true,
  productStatus: "active",
  moderationStatus: "approved",
  priceAmountMinor: 1000,
  priceCurrency: "USD",
};

describe("Digital publish readiness — contracts", () => {
  it("exposes capability id and documents the gate", () => {
    expect(DIGITAL_PRODUCT_PUBLISH_READINESS_ID).toMatch(
      /product_publish_readiness/
    );
    expect(
      existsSync(
        join(
          ROOT,
          "docs/store/implementation/DIGITAL_PRODUCT_PUBLISH_READINESS_V1.md"
        )
      )
    ).toBe(true);
    const doc = read(
      "docs/store/implementation/DIGITAL_PRODUCT_PUBLISH_READINESS_V1.md"
    );
    expect(doc).toMatch(/active/i);
    expect(doc).toMatch(/owned/i);
    expect(doc).not.toMatch(/db push|--include-all/i);
  });
});

describe("Digital publish readiness — evaluate", () => {
  it("marks physical products not applicable and ready", () => {
    const result = evaluateDigitalProductPublishReadiness({
      productType: "physical",
      storeId: STORE,
      productId: PRODUCT,
      asset: null,
    });
    expect(result.applicable).toBe(false);
    expect(result.ready).toBe(true);
    expect(result.code).toBe("not_applicable");
  });

  it("blocks digital products with no asset", () => {
    const result = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: null,
    });
    expect(result.ready).toBe(false);
    expect(result.uiState).toBe("asset_missing");
    expect(result.code).toBe("asset_missing");
  });

  it("blocks inactive assets", () => {
    const result = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: STORE,
        productId: PRODUCT,
        status: "inactive",
        storagePath: SAFE_PATH,
      },
    });
    expect(result.ready).toBe(false);
    expect(result.uiState).toBe("asset_invalid");
    expect(result.code).toBe("asset_inactive");
  });

  it("blocks malformed and cross-store paths", () => {
    const malformed = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: STORE,
        productId: PRODUCT,
        status: "active",
        storagePath: `stores/${STORE}/products/${PRODUCT}/digital/../x.pdf`,
      },
    });
    expect(malformed.ready).toBe(false);
    expect(malformed.code).toBe("asset_invalid_path");
    expect(
      isOwnedStoreDigitalProductAssetPath(
        STORE,
        PRODUCT,
        `stores/${STORE}/products/${PRODUCT}/digital/../x.pdf`
      )
    ).toBe(false);

    const crossStore = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: OTHER,
        productId: PRODUCT,
        status: "active",
        storagePath: buildStoreDigitalProductAssetPath(
          OTHER,
          PRODUCT,
          FILE,
          "pdf"
        ),
      },
    });
    expect(crossStore.ready).toBe(false);
    expect(crossStore.code).toBe("asset_store_mismatch");

    const crossProduct = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: STORE,
        productId: OTHER,
        status: "active",
        storagePath: SAFE_PATH,
      },
    });
    expect(crossProduct.ready).toBe(false);
    expect(crossProduct.code).toBe("asset_product_mismatch");
  });

  it("accepts a valid active owned asset as ready", () => {
    const result = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: STORE,
        productId: PRODUCT,
        status: "active",
        storagePath: SAFE_PATH,
      },
    });
    expect(result.ready).toBe(true);
    expect(result.uiState).toBe("asset_ready");
    expect(result.code).toBe("ready");
  });

  it("ignores client-forged readiness by requiring server asset snapshot", () => {
    const forged = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: null,
    });
    expect(forged.ready).toBe(false);
    expect(forged).not.toHaveProperty("clientReady");
  });
});

describe("Digital publish readiness — marketplace fail-closed", () => {
  it("excludes unready digital products from marketplace blockers and eligibility", () => {
    const blockers = collectProductMarketplaceBlockers({
      ...eligibleBase,
      productType: "digital",
      digitalPublishReady: false,
    });
    expect(blockers.some((b) => b.code === "digital_asset_not_ready")).toBe(
      true
    );

    const gate = evaluateMarketplaceEligibility({
      productStatus: "active",
      moderationStatus: "approved",
      marketplaceEligible: true,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: OTHER,
      supplierStoreId: STORE,
      priceAmountMinor: 1000,
      priceCurrency: "USD",
      productType: "digital",
      digitalPublishReady: false,
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("digital_asset_not_ready");
  });

  it("keeps ready digital products eligible under existing rules", () => {
    const blockers = collectProductMarketplaceBlockers({
      ...eligibleBase,
      productType: "digital",
      digitalPublishReady: true,
    });
    expect(blockers.some((b) => b.code === "digital_asset_not_ready")).toBe(
      false
    );

    const gate = evaluateMarketplaceEligibility({
      productStatus: "active",
      moderationStatus: "approved",
      marketplaceEligible: true,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: OTHER,
      supplierStoreId: STORE,
      priceAmountMinor: 1000,
      priceCurrency: "USD",
      productType: "digital",
      digitalPublishReady: true,
    });
    expect(gate.ok).toBe(true);
  });

  it("leaves physical product marketplace behavior unchanged", () => {
    const blockers = collectProductMarketplaceBlockers({
      ...eligibleBase,
      productType: "physical",
    });
    expect(blockers).toHaveLength(0);

    const gate = evaluateMarketplaceEligibility({
      productStatus: "active",
      moderationStatus: "approved",
      marketplaceEligible: true,
      supplierStoreStatus: "active",
      supplierVerificationStatus: "verified",
      marketplaceSupplierEnabled: true,
      sellerStoreStatus: "active",
      sellerVerificationStatus: "verified",
      sellerStoreId: OTHER,
      supplierStoreId: STORE,
      priceAmountMinor: 1000,
      priceCurrency: "USD",
      productType: "physical",
    });
    expect(gate.ok).toBe(true);
  });
});

describe("Digital publish readiness — surface wiring", () => {
  it("gates submit and marketplace eligibility in sellerStore", () => {
    const sellerStore = read("lib/store/sellerStore.ts");
    expect(sellerStore).toMatch(/resolveDigitalProductPublishReadiness/);
    expect(sellerStore).toMatch(/submitProductForReview/);
    expect(sellerStore).toMatch(/updateProductMarketplaceEligibility/);
    expect(sellerStore).toMatch(/if \(!readiness\.ready\)/);
  });

  it("blocks submit UI and shows readiness on the product editor", () => {
    const page = read(
      "app/seller/store/products/[productId]/edit/page.tsx"
    );
    expect(page).toMatch(/digitalPublishReadiness/);
    expect(page).toMatch(/canSubmitDigital/);
    expect(page).toMatch(/Publish readiness/);
    expect(page).toMatch(/Digital deliverable section/);
    expect(page).not.toMatch(/learning|ai.?tutor|creator space/i);
  });

  it("filters marketplace discovery fail-closed for unready digital products", () => {
    const queries = read("lib/store/marketplaceSupplierSellerQueries.ts");
    expect(queries).toMatch(/mapDigitalPublishReadinessByProductId/);
    expect(queries).toMatch(/product_type/);
    expect(queries).toMatch(/digitalPublishReady/);
  });
});
