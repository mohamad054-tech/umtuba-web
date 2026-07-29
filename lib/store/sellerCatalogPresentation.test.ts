import { describe, expect, it } from "vitest";
import {
  buildOptionValuesPayload,
  canSellerEditProductFields,
  canSellerEditVariants,
  canSellerSubmitForReview,
  deriveSellerCatalogBulkActions,
  filterSellerCatalogItems,
  productMatchesCatalogFilter,
  sellerProductStatusLabel,
  sellerPublishingWorkflowSteps,
  sellerSeoPreview,
} from "./sellerCatalogPresentation";

describe("sellerCatalogPresentation — labels and filters", () => {
  it("maps trusted statuses without inventing published enum", () => {
    expect(sellerProductStatusLabel("active")).toBe("Published");
    expect(sellerProductStatusLabel("draft")).toBe("Draft");
    expect(sellerProductStatusLabel("in_review")).toBe("In review");
    expect(sellerProductStatusLabel("hidden")).toBe("Hidden");
  });

  it("filters draft/published/hidden/archived buckets", () => {
    expect(productMatchesCatalogFilter("draft", "draft")).toBe(true);
    expect(productMatchesCatalogFilter("rejected", "draft")).toBe(true);
    expect(productMatchesCatalogFilter("active", "published")).toBe(true);
    expect(productMatchesCatalogFilter("paused", "hidden")).toBe(true);
    expect(productMatchesCatalogFilter("archived", "archived")).toBe(true);
    expect(productMatchesCatalogFilter("active", "draft")).toBe(false);
  });

  it("searches and sorts catalog items", () => {
    const items = [
      {
        id: "1",
        title: "Amber Lamp",
        slug: "amber-lamp",
        status: "draft",
        moderationStatus: "pending",
        productType: "physical",
        updatedAt: "2026-01-02T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "2",
        title: "Blue Vase",
        slug: "blue-vase",
        status: "active",
        moderationStatus: "approved",
        productType: "physical",
        updatedAt: "2026-01-03T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    expect(
      filterSellerCatalogItems(items, { query: "amber", bucket: "all" }).map(
        (i) => i.id
      )
    ).toEqual(["1"]);
    expect(
      filterSellerCatalogItems(items, {
        bucket: "published",
        sort: "title_asc",
      }).map((i) => i.id)
    ).toEqual(["2"]);
  });
});

describe("sellerCatalogPresentation — workflow and actions", () => {
  it("builds honest publishing rail", () => {
    const steps = sellerPublishingWorkflowSteps({
      status: "in_review",
      moderationStatus: "pending",
    });
    expect(steps.find((s) => s.id === "review")?.state).toBe("current");
    expect(steps.find((s) => s.id === "published")?.state).toBe("upcoming");
  });

  it("gates edit/submit by trusted status", () => {
    expect(canSellerEditProductFields("draft")).toBe(true);
    expect(canSellerEditProductFields("active")).toBe(false);
    expect(canSellerEditVariants("in_review")).toBe(true);
    expect(canSellerEditVariants("rejected")).toBe(false);
    expect(canSellerSubmitForReview("rejected")).toBe(true);
  });

  it("derives bulk actions only when selection is eligible", () => {
    expect(
      deriveSellerCatalogBulkActions({ selectedStatuses: [] })[0]?.enabled
    ).toBe(false);
    expect(
      deriveSellerCatalogBulkActions({
        selectedStatuses: ["draft", "rejected"],
      }).find((a) => a.id === "submit_review")?.enabled
    ).toBe(true);
    expect(
      deriveSellerCatalogBulkActions({
        selectedStatuses: ["draft", "active"],
      }).find((a) => a.id === "submit_review")?.enabled
    ).toBe(false);
  });

  it("builds option values and SEO preview without inventing storage", () => {
    expect(
      buildOptionValuesPayload({
        color: "Sand",
        size: "M",
        capacity: "",
      })
    ).toEqual({ Color: "Sand", Size: "M" });
    const seo = sellerSeoPreview({
      title: "Handmade Bowl",
      shortDescription: "Stoneware bowl for daily table.",
      slug: "handmade-bowl",
    });
    expect(seo.title).toContain("Handmade");
    expect(seo.note.toLowerCase()).toContain("not stored separately");
  });
});
