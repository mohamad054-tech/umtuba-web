import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Platform shell single-H1 contract (World / Games stub / Saved)", () => {
  const surfaces: Array<{ rel: string; navTitle: string }> = [
    { rel: "app/world/page.tsx", navTitle: "World Discovery" },
    { rel: "app/world/search/page.tsx", navTitle: "World Search" },
    { rel: "app/world/city/[citySlug]/page.tsx", navTitle: "World City" },
    { rel: "app/world/place/[placeSlug]/page.tsx", navTitle: "World Place" },
    { rel: "app/games/page.tsx", navTitle: "Games" },
    { rel: "app/saved/page.tsx", navTitle: "Saved" },
  ];

  it("keeps AppTopNav as the sole document H1 owner on World/Games/Saved surfaces", () => {
    for (const { rel, navTitle } of surfaces) {
      const src = read(rel);
      expect(src.includes("AppTopNav"), `${rel} uses AppTopNav`).toBe(true);
      expect(src.includes(`title="${navTitle}"`) || src.includes("title={"), `${rel} titles nav`).toBe(
        true
      );
      expect(src.includes("<h1"), `${rel} must not declare nested <h1>`).toBe(
        false
      );
    }

    const savedExperience = read("app/saved/SavedExperience.tsx");
    expect(savedExperience.includes("<h1")).toBe(false);
    expect(savedExperience).toMatch(/Saved posts<\/h2>/);
  });
});

describe("Seller hub platform chrome contract", () => {
  it("keeps AppTopNav full-bleed and demotes hub intros to h2", () => {
    const src = read("app/seller/page.tsx");
    const navIdx = src.indexOf("<AppTopNav");
    const constrainIdx = src.indexOf('className="mx-auto max-w-2xl');
    expect(navIdx).toBeGreaterThan(-1);
    expect(constrainIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(constrainIdx);
    expect(src.includes("<h1")).toBe(false);
    expect(src).toMatch(/Set up your store\s*<\/h2>/);
  });
});
