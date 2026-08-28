import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, BRAND_ASSETS } from "./brand";

const ROOT = process.cwd();

const PUBLIC_FILES = [
  BRAND_ASSETS.stackedLogo,
  BRAND_ASSETS.symbol,
  BRAND_ASSETS.appIcon1024,
  BRAND_ASSETS.icon16,
  BRAND_ASSETS.icon32,
  BRAND_ASSETS.icon48,
  BRAND_ASSETS.icon64,
  BRAND_ASSETS.icon96,
  BRAND_ASSETS.icon144,
  BRAND_ASSETS.icon180,
  BRAND_ASSETS.icon192,
  BRAND_ASSETS.icon512,
  BRAND_ASSETS.favicon16,
  BRAND_ASSETS.favicon32,
] as const;

function publicPath(url: string): string {
  return join(ROOT, "public", ...url.replace(/^\//, "").split("/"));
}

describe("approved video logo assets", () => {
  it("keeps the stacked lockup as the primary logo path", () => {
    expect(BRAND_ASSETS.stackedLogo).toBe(
      "/brand/umtuba_logo_stacked_from_approved_video.png"
    );
    expect(BRAND_ASSETS.stackedLogoWidth).toBe(788);
    expect(BRAND_ASSETS.stackedLogoHeight).toBe(776);
    expect(BRAND.name).toBe("UMTUBA");
  });

  it("ships every referenced public brand file", () => {
    const missing = PUBLIC_FILES.filter((url) => !existsSync(publicPath(url)));
    expect(missing).toEqual([]);
    expect(existsSync(join(ROOT, "app", "favicon.ico"))).toBe(true);
    expect(existsSync(join(ROOT, "app", "icon.png"))).toBe(true);
    expect(existsSync(join(ROOT, "app", "apple-icon.png"))).toBe(true);
    expect(existsSync(join(ROOT, "public", "favicon.ico"))).toBe(true);
  });

  it("does not introduce V2/V3/V4 artwork paths", () => {
    const serialized = JSON.stringify(BRAND_ASSETS);
    expect(serialized).not.toMatch(/V2|V3|V4|OFFICIAL_BRAND_V4/i);
  });

  it("keeps extracted PNG signatures on the stacked lockup and 1024 icon", () => {
    const stacked = readFileSync(publicPath(BRAND_ASSETS.stackedLogo));
    const appIcon = readFileSync(publicPath(BRAND_ASSETS.appIcon1024));
    expect(stacked.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      true
    );
    expect(appIcon.length).toBeGreaterThan(1000);
  });
});
