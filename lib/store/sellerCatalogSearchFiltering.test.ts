import { describe, expect, it } from "vitest";
import {
  buildSellerCatalogSearchItems,
  filterSellerCatalogSearchItems,
  indexVariantSearchTokens,
  productMatchesCatalogSearchQuery,
  type SellerCatalogSearchItem,
} from "./sellerCatalogSearchFiltering";

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";

function item(
  overrides: Partial<SellerCatalogSearchItem> &
    Pick<SellerCatalogSearchItem, "id" | "title">
): SellerCatalogSearchItem {
  return {
    storeId: STORE_A,
    slug: "slug",
    status: "draft",
    moderationStatus: "pending",
    productType: "digital",
    updatedAt: "2026-01-02T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    shortDescription: null,
    skus: [],
    barcodes: [],
    healthCodes: [],
    ...overrides,
  };
}

describe("Seller Catalog Search & Filtering Foundation V1", () => {
  it("treats empty search as match-all", () => {
    const row = item({ id: "p1", title: "Alpha" });
    expect(productMatchesCatalogSearchQuery(row, "")).toBe(true);
    expect(productMatchesCatalogSearchQuery(row, "   ")).toBe(true);
  });

  it("supports exact and partial case-insensitive title/id search", () => {
    const row = item({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      title: "Amber Lamp Kit",
    });
    expect(productMatchesCatalogSearchQuery(row, "AMBER LAMP KIT")).toBe(true);
    expect(productMatchesCatalogSearchQuery(row, "amber")).toBe(true);
    expect(
      productMatchesCatalogSearchQuery(row, "aaaaaaaa-aaaa-4aaa-8aaa")
    ).toBe(true);
    expect(productMatchesCatalogSearchQuery(row, "zzz")).toBe(false);
  });

  it("matches SKU and barcode when present", () => {
    const row = item({
      id: "p2",
      title: "Widget",
      skus: ["SKU-RED-1"],
      barcodes: ["BC998877"],
    });
    expect(productMatchesCatalogSearchQuery(row, "sku-red")).toBe(true);
    expect(productMatchesCatalogSearchQuery(row, "bc998")).toBe(true);
  });

  it("filters by status including ready and needs attention", () => {
    const draft = item({
      id: "d1",
      title: "Draft",
      status: "draft",
      moderationStatus: "pending",
      healthCodes: ["draft", "missing_images"],
    });
    const published = item({
      id: "p1",
      title: "Live",
      status: "active",
      moderationStatus: "approved",
      healthCodes: ["published", "complete"],
    });
    const ready = item({
      id: "r1",
      title: "Ready",
      status: "draft",
      moderationStatus: "pending",
      healthCodes: ["draft", "ready_to_publish"],
    });
    const rejected = item({
      id: "x1",
      title: "Rejected",
      status: "rejected",
      moderationStatus: "rejected",
      healthCodes: ["rejected"],
    });
    const pending = item({
      id: "v1",
      title: "Review",
      status: "in_review",
      moderationStatus: "pending",
      healthCodes: ["pending_review"],
    });

    const all = [draft, published, ready, rejected, pending];
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "draft",
      }).map((i) => i.id)
    ).toEqual(["d1", "r1"]);
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "published",
      }).map((i) => i.id)
    ).toEqual(["p1"]);
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "pending_review",
      }).map((i) => i.id)
    ).toEqual(["v1"]);
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "rejected",
      }).map((i) => i.id)
    ).toEqual(["x1"]);
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "ready",
      }).map((i) => i.id)
    ).toEqual(["p1", "r1"]);
    expect(
      filterSellerCatalogSearchItems(all, {
        storeId: STORE_A,
        status: "needs_attention",
      }).map((i) => i.id)
    ).toEqual(["d1", "x1"]);
  });

  it("filters by health codes and product type", () => {
    const digital = item({
      id: "dig",
      title: "Dig",
      productType: "digital",
      healthCodes: ["missing_digital_asset"],
    });
    const physical = item({
      id: "phy",
      title: "Phy",
      productType: "physical",
      healthCodes: ["missing_physical_metadata", "missing_inventory"],
    });
    const mixed = item({
      id: "mix",
      title: "Mix",
      productType: "service",
      healthCodes: ["missing_pricing"],
    });

    expect(
      filterSellerCatalogSearchItems([digital, physical, mixed], {
        storeId: STORE_A,
        health: "missing_inventory",
      }).map((i) => i.id)
    ).toEqual(["phy"]);
    expect(
      filterSellerCatalogSearchItems([digital, physical, mixed], {
        storeId: STORE_A,
        productType: "digital",
      }).map((i) => i.id)
    ).toEqual(["dig"]);
    expect(
      filterSellerCatalogSearchItems([digital, physical, mixed], {
        storeId: STORE_A,
        productType: "other",
      }).map((i) => i.id)
    ).toEqual(["mix"]);
  });

  it("sorts newest/oldest/name without inventing sales or views", () => {
    const a = item({
      id: "a",
      title: "Beta",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-05T00:00:00Z",
    });
    const b = item({
      id: "b",
      title: "Alpha",
      createdAt: "2026-01-03T00:00:00Z",
      updatedAt: "2026-01-04T00:00:00Z",
    });
    expect(
      filterSellerCatalogSearchItems([a, b], {
        storeId: STORE_A,
        sort: "newest",
      }).map((i) => i.id)
    ).toEqual(["b", "a"]);
    expect(
      filterSellerCatalogSearchItems([a, b], {
        storeId: STORE_A,
        sort: "oldest",
      }).map((i) => i.id)
    ).toEqual(["a", "b"]);
    expect(
      filterSellerCatalogSearchItems([a, b], {
        storeId: STORE_A,
        sort: "title_asc",
      }).map((i) => i.id)
    ).toEqual(["b", "a"]);
  });

  it("combines query + status + health + type", () => {
    const keep = item({
      id: "keep",
      title: "Sand Bowl",
      productType: "physical",
      status: "draft",
      skus: ["BOWL-1"],
      healthCodes: ["draft", "missing_images"],
    });
    const drop = item({
      id: "drop",
      title: "Sand Bowl Digital",
      productType: "digital",
      status: "draft",
      healthCodes: ["draft", "missing_images"],
    });
    expect(
      filterSellerCatalogSearchItems([keep, drop], {
        storeId: STORE_A,
        query: "bowl",
        status: "needs_attention",
        health: "missing_images",
        productType: "physical",
      }).map((i) => i.id)
    ).toEqual(["keep"]);
  });

  it("blocks cross-store leakage", () => {
    const foreign = item({
      id: "foreign",
      title: "Foreign",
      storeId: STORE_B,
      healthCodes: ["complete"],
    });
    const owned = item({ id: "owned", title: "Owned" });
    expect(
      filterSellerCatalogSearchItems([foreign, owned], {
        storeId: STORE_A,
        query: "foreign",
      })
    ).toEqual([]);
    expect(
      filterSellerCatalogSearchItems([foreign, owned], {
        storeId: STORE_A,
      }).map((i) => i.id)
    ).toEqual(["owned"]);
  });

  it("indexes variant tokens and builds search items safely", () => {
    const index = indexVariantSearchTokens(
      [
        { productId: "p1", sku: "A", barcode: "1" },
        { productId: "p1", sku: "A", barcode: "2" },
        { productId: "p2", sku: "B", barcode: null },
        { productId: "evil", sku: "X", barcode: "9" },
      ],
      ["p1", "p2"]
    );
    expect(index.get("p1")).toEqual({ skus: ["A"], barcodes: ["1", "2"] });
    expect(index.has("evil")).toBe(false);

    const built = buildSellerCatalogSearchItems({
      storeId: STORE_A,
      items: [
        {
          id: "p1",
          title: "One",
          slug: "one",
          status: "draft",
          moderationStatus: "pending",
          productType: "digital",
          updatedAt: "2026-01-02T00:00:00Z",
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      variantTokens: index,
      healthCodesByProductId: new Map([["p1", ["missing_pricing"]]]),
    });
    expect(built[0]?.skus).toEqual(["A"]);
    expect(built[0]?.healthCodes).toEqual(["missing_pricing"]);
  });
});
