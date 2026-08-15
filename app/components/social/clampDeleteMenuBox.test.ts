import { describe, expect, it } from "vitest";
import { clampDeleteMenuBox } from "./clampDeleteMenuBox";

const WIDTHS = [360, 390, 430, 768, 1280] as const;

function triggerAtEnd(viewportWidth: number, dir: "ltr" | "rtl") {
  const size = 44;
  const inset = 8;
  if (dir === "rtl") {
    return {
      top: 8,
      left: inset,
      right: inset + size,
      bottom: 8 + size,
    };
  }
  return {
    top: 8,
    left: viewportWidth - inset - size,
    right: viewportWidth - inset,
    bottom: 8 + size,
  };
}

describe("clampDeleteMenuBox", () => {
  for (const width of WIDTHS) {
    for (const dir of ["ltr", "rtl"] as const) {
      it(`stays inside ${width}px ${dir.toUpperCase()} viewport`, () => {
        const box = clampDeleteMenuBox({
          trigger: triggerAtEnd(width, dir),
          viewport: { width, height: 800 },
          dir,
        });
        expect(box.left).toBeGreaterThanOrEqual(12);
        expect(box.top).toBeGreaterThanOrEqual(12);
        expect(box.left + box.width).toBeLessThanOrEqual(width - 12);
        expect(box.top + 52).toBeLessThanOrEqual(800 - 12);
        expect(box.width).toBeLessThanOrEqual(width - 24);
      });
    }
  }

  it("opens above when the trigger sits on the bottom edge", () => {
    const box = clampDeleteMenuBox({
      trigger: { top: 748, left: 300, right: 344, bottom: 792 },
      viewport: { width: 360, height: 800 },
      dir: "ltr",
    });
    expect(box.top + 52).toBeLessThanOrEqual(748);
    expect(box.left).toBeGreaterThanOrEqual(12);
    expect(box.left + box.width).toBeLessThanOrEqual(348);
  });

  it("fits a 2-column profile card on 360 without leaving the viewport", () => {
    // Left column card ~162px; trigger at physical end of that card.
    const box = clampDeleteMenuBox({
      trigger: { top: 12, left: 118, right: 162, bottom: 56 },
      viewport: { width: 360, height: 800 },
      dir: "ltr",
    });
    expect(box.left).toBeGreaterThanOrEqual(12);
    expect(box.left + box.width).toBeLessThanOrEqual(348);
  });
});
