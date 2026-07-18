import { describe, expect, it } from "vitest";
import {
  buildProductHref,
  filterShelfItemsAtTime,
  isAttachmentActiveAtTime,
  VIDEO_COMMERCE_EVENT_TYPES,
  VIDEO_COMMERCE_NO_RATING_LABEL,
} from "./videoCommerce";

describe("videoCommerce timeline", () => {
  it("treats null windows as always active", () => {
    expect(
      isAttachmentActiveAtTime({ startMs: null, endMs: null }, 0)
    ).toBe(true);
    expect(
      isAttachmentActiveAtTime({ startMs: null, endMs: null }, 12_000)
    ).toBe(true);
  });

  it("hides future products before start_ms", () => {
    expect(
      isAttachmentActiveAtTime({ startMs: 5_000, endMs: null }, 4_999)
    ).toBe(false);
    expect(
      isAttachmentActiveAtTime({ startMs: 5_000, endMs: null }, 5_000)
    ).toBe(true);
  });

  it("hides products at or after end_ms", () => {
    expect(
      isAttachmentActiveAtTime({ startMs: 0, endMs: 10_000 }, 9_999)
    ).toBe(true);
    expect(
      isAttachmentActiveAtTime({ startMs: 0, endMs: 10_000 }, 10_000)
    ).toBe(false);
  });

  it("filters shelf items by playhead without mutating source", () => {
    const items = [
      { id: "a", startMs: null, endMs: null },
      { id: "b", startMs: 8_000, endMs: 12_000 },
      { id: "c", startMs: 15_000, endMs: null },
    ];

    expect(filterShelfItemsAtTime(items, 9_000).map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterShelfItemsAtTime(items, 1_000).map((i) => i.id)).toEqual([
      "a",
    ]);
    expect(items).toHaveLength(3);
  });
});

describe("videoCommerce helpers", () => {
  it("builds PDP href from store and product slugs", () => {
    expect(buildProductHref("acme", "kick-ball")).toBe(
      "/store/acme/product/kick-ball"
    );
  });

  it("does not invent ratings", () => {
    expect(VIDEO_COMMERCE_NO_RATING_LABEL).toBe("No ratings yet");
  });

  it("tracks only V1 analytics events (no purchase)", () => {
    expect(VIDEO_COMMERCE_EVENT_TYPES).toEqual([
      "badge_shown",
      "badge_opened",
      "product_viewed",
    ]);
    expect(VIDEO_COMMERCE_EVENT_TYPES).not.toContain("purchase");
  });
});
