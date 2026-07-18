import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Video Commerce Shelf V1 contracts", () => {
  it("allows shop panel in production without pausing playback", () => {
    const experience = read("app/watch/WatchExperience.tsx");
    expect(experience).toMatch(/PRODUCTION_WATCH_PANELS/);
    expect(experience).toMatch(/"shop"/);
    expect(experience).toMatch(/VideoShopShelf/);
    expect(experience).toMatch(/useVideoShopShelf/);
    // Shop open must not set forcePause (journey transition may still pause).
    const openShopBlock = experience.slice(
      experience.indexOf("if (panel === \"shop\""),
      experience.indexOf("setActivePanel(panel)")
    );
    expect(openShopBlock).not.toMatch(/setForcePause/);
    expect(experience).toMatch(/setActivePanel\(null\)/);
  });

  it("renders a compact badge and View Product only", () => {
    const badge = read("app/components/video/commerce/ShopBadge.tsx");
    const shelf = read("app/components/video/commerce/VideoShopShelf.tsx");
    expect(badge).toMatch(/🛍/);
    expect(badge).toMatch(/count <= 0/);
    expect(badge).toMatch(/aria-expanded/);
    expect(badge).toMatch(/aria-haspopup/);
    expect(shelf).toMatch(/View Product/);
    expect(shelf).toMatch(/aria-labelledby/);
    expect(shelf).toMatch(/prefers-reduced-motion/);
    expect(shelf).not.toMatch(/Add to Cart/);
    expect(shelf).not.toMatch(/Checkout/);
    expect(shelf).toMatch(/No ratings yet|ratingLabel/);
  });

  it("filters by timeline helpers", () => {
    const hook = read("app/components/video/commerce/useVideoShopShelf.ts");
    expect(hook).toMatch(/filterShelfItemsAtTime/);
    expect(hook).toMatch(/badge_shown/);
  });
});
