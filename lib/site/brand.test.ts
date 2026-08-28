import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, BRAND_COLORS, BRAND_KEYWORDS } from "./brand";
import { BRAND_ASSETS, brandMarkSrc } from "./brandAssets";

const ROOT = process.cwd();

describe("official V3 brand identity", () => {
  it("locks the approved stacked tagline and gold tokens", () => {
    expect(BRAND.tagline).toBe("LEARN · CREATE · SHARE");
    expect(BRAND_KEYWORDS).toContain("LEARN · CREATE · SHARE");
    expect(BRAND_COLORS.accent).toBe("#D4AF37");
    expect(BRAND_COLORS.goldPrimary).toBe("#D4AF37");
    expect(BRAND_COLORS.goldLight).toBe("#FFD86A");
    expect(BRAND_COLORS.goldDark).toBe("#B8860B");
  });

  it("serves exact stacked masters and never a horizontal lockup", () => {
    expect(brandMarkSrc("stacked", "dark")).toBe(
      BRAND_ASSETS.lockupStackedTransparentSvg
    );
    expect(brandMarkSrc("stacked", "light")).toBe(
      BRAND_ASSETS.lockupStackedLightSvg
    );
    expect(brandMarkSrc("symbol")).toBe(BRAND_ASSETS.symbolMasterSvg);

    const stacked = readFileSync(
      join(ROOT, "brand/official-v3/svg/logo_stacked_transparent.svg"),
      "utf8"
    );
    expect(stacked).toContain(">UMTUBA</text>");
    expect(stacked).toContain("LEARN · CREATE · SHARE");
    expect(stacked).toMatch(/viewBox="0 0 1200 1500"/);
    expect(stacked).not.toMatch(/horizontal/i);

    const tokens = JSON.parse(
      readFileSync(join(ROOT, "brand/official-v3/brand_tokens.json"), "utf8")
    ) as {
      primary_lockup: string;
      tagline: string;
      horizontal_lockup: string;
    };
    expect(tokens.primary_lockup).toBe("stacked_only");
    expect(tokens.tagline).toBe("LEARN · CREATE · SHARE");
    expect(tokens.horizontal_lockup).toBe("forbidden");
  });
});
