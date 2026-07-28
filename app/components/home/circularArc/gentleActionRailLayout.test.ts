import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Left Action Rail (approved drawing)", () => {
  it("uses right-rail circle chrome and fixed gentle translateX only", () => {
    const arc = readFileSync(
      join(process.cwd(), "app/components/home/circularArc/HomeCircularArc.tsx"),
      "utf8"
    );
    expect(arc).toMatch(/justify-between/);
    expect(arc).toMatch(/watch-rail-btn/);
    expect(arc).toMatch(/h-12 w-12/);
    expect(arc).toMatch(/LEFT_ARC_TRANSLATE_X_PX = \[0, -6, -11, -14, -11, -6, 0\]/);
    expect(arc).not.toMatch(/from ["'].*arcGeometry["']/);
    expect(arc).not.toMatch(/layoutCircularArcNodes/);
    expect(arc).not.toMatch(/layoutGentleActionRail/);
  });

  it("binds left rail to right rail inside DiscoverVideoCard", () => {
    const card = readFileSync(
      join(process.cwd(), "app/discover/components/DiscoverVideoCard.tsx"),
      "utf8"
    );
    expect(card).toMatch(/data-home-arc-rail="left-action"/);
    expect(card).toMatch(/data-home-action-rail="right"/);
    expect(card).toMatch(/items-end justify-between/);
    expect(card).toMatch(/left-\[5px\]/);
    expect(card).toMatch(/extendPx = 8/);
    expect(card).not.toMatch(/-translate-x-\[calc/);
  });
});
