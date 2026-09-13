import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resetGalleryIndexForProduct,
  selectedGalleryUrl,
  visibleGalleryUrls,
} from "./productImageGallery";

const pdp = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/[slug]/page.tsx"),
  "utf8"
);
const gallery = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/ProductImageGallery.tsx"),
  "utf8"
);

const SAMPLE = [
  "https://cdn.example/a.jpg",
  "https://cdn.example/b.jpg",
  "https://cdn.example/c.jpg",
] as const;

describe("visibleGalleryUrls", () => {
  it("skips empty, blank, and non-http URLs without inventing images", () => {
    expect(
      visibleGalleryUrls([
        "https://cdn.example/a.jpg",
        "",
        "   ",
        null,
        undefined,
        "ftp://cdn.example/x.jpg",
        "/local/x.jpg",
        "https://cdn.example/b.jpg",
      ])
    ).toEqual(["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"]);
  });

  it("preserves original order and duplicate URLs", () => {
    const dup = [
      "https://cdn.example/a.jpg",
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.jpg",
    ];
    const input = [...dup];
    expect(visibleGalleryUrls(dup)).toEqual(dup);
    expect(dup).toEqual(input);
  });
});

describe("selectedGalleryUrl", () => {
  it("maps thumbnail 1/2/3 to the matching main image", () => {
    expect(selectedGalleryUrl(SAMPLE, 0)).toBe(SAMPLE[0]);
    expect(selectedGalleryUrl(SAMPLE, 1)).toBe(SAMPLE[1]);
    expect(selectedGalleryUrl(SAMPLE, 2)).toBe(SAMPLE[2]);
  });

  it("falls back to the first valid image for out-of-range or empty input", () => {
    expect(selectedGalleryUrl(SAMPLE, -1)).toBe(SAMPLE[0]);
    expect(selectedGalleryUrl(SAMPLE, 99)).toBe(SAMPLE[0]);
    expect(selectedGalleryUrl(["", "not-a-url"], 0)).toBeNull();
  });
});

describe("resetGalleryIndexForProduct", () => {
  it("resets when opening another product", () => {
    expect(
      resetGalleryIndexForProduct("sink-drain-strainer-aaa", "hair-clip-bbb")
    ).toBe(true);
    expect(
      resetGalleryIndexForProduct("sink-drain-strainer-aaa", "sink-drain-strainer-aaa")
    ).toBe(false);
  });
});

describe("cj-launch PDP gallery wiring", () => {
  it("keeps the PDP a Server Component and extracts a client gallery", () => {
    expect(pdp).not.toMatch(/^["']use client["']/m);
    expect(pdp).toMatch(/ProductImageGallery/);
    expect(pdp).toMatch(/productKey=\{draft\.customer\.slug\}/);
    expect(gallery).toMatch(/^["']use client["']/m);
    expect(gallery).toMatch(/useState/);
    expect(gallery).toMatch(/setSelectedIndex/);
    expect(gallery).toMatch(/type="button"/);
    expect(gallery).toMatch(/aria-pressed/);
    expect(gallery).toMatch(/aria-current/);
    expect(gallery).not.toMatch(/<Link/);
    expect(gallery).not.toMatch(/router\.(push|replace)/);
  });
});
