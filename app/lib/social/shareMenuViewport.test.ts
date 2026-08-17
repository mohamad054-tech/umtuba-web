import { describe, expect, it } from "vitest";
import {
  SHARE_MENU_GAP_PX,
  SHARE_MENU_VIEWPORT_PADDING_PX,
  SHARE_MENU_WIDTH_PX,
  placeShareMenu,
  readDocumentDir,
  resolvePreferredPhysicalAlign,
  type RectBox,
} from "./shareMenuViewport";

const MENU = { width: SHARE_MENU_WIDTH_PX, height: 188 };
const PADDING = SHARE_MENU_VIEWPORT_PADDING_PX;
const DESKTOP_WIDTHS = [1440, 1280, 1024, 768] as const;
const MOBILE_WEB_WIDTH = 390;

function anchorAt(left: number, top = 420, width = 48, height = 56): RectBox {
  return { left, top, width, height };
}

function expectInside(
  placed: { top: number; left: number },
  viewport: { width: number; height: number },
  menu = MENU
) {
  expect(placed.left).toBeGreaterThanOrEqual(PADDING);
  expect(placed.top).toBeGreaterThanOrEqual(PADDING);
  expect(placed.left + menu.width).toBeLessThanOrEqual(viewport.width - PADDING);
  expect(placed.top + menu.height).toBeLessThanOrEqual(
    viewport.height - PADDING
  );
}

describe("share menu viewport collision", () => {
  it("maps align=right to inline-end (physical right in LTR, left in RTL)", () => {
    expect(resolvePreferredPhysicalAlign("right", "ltr")).toBe("right");
    expect(resolvePreferredPhysicalAlign("right", "rtl")).toBe("left");
    expect(resolvePreferredPhysicalAlign("left", "ltr")).toBe("left");
    expect(resolvePreferredPhysicalAlign("left", "rtl")).toBe("right");
    expect(resolvePreferredPhysicalAlign("center", "rtl")).toBe("center");
  });

  it("reads document dir without treating missing as RTL", () => {
    expect(readDocumentDir("rtl")).toBe("rtl");
    expect(readDocumentDir("ltr")).toBe("ltr");
    expect(readDocumentDir(null)).toBe("ltr");
    expect(readDocumentDir("")).toBe("ltr");
  });

  it.each(DESKTOP_WIDTHS)(
    "LTR: keeps the menu inside a %ipx viewport at both edges",
    (width) => {
      const viewport = { width, height: 800 };
      const rightRail = placeShareMenu({
        anchor: anchorAt(width - 24 - 48),
        menu: MENU,
        viewport,
        align: "right",
        dir: "ltr",
      });
      const leftEdge = placeShareMenu({
        anchor: anchorAt(8),
        menu: MENU,
        viewport,
        align: "right",
        dir: "ltr",
      });
      const center = placeShareMenu({
        anchor: anchorAt(width / 2 - 24),
        menu: MENU,
        viewport,
        align: "center",
        dir: "ltr",
      });

      expectInside(rightRail, viewport);
      expectInside(leftEdge, viewport);
      expectInside(center, viewport);
      expect(rightRail.left + MENU.width).toBeLessThanOrEqual(width - PADDING);
      expect(leftEdge.left).toBeGreaterThanOrEqual(PADDING);
    }
  );

  it.each(DESKTOP_WIDTHS)(
    "RTL: keeps the menu inside a %ipx viewport at both edges",
    (width) => {
      const viewport = { width, height: 800 };
      const leftRail = placeShareMenu({
        anchor: anchorAt(16),
        menu: MENU,
        viewport,
        align: "right",
        dir: "rtl",
      });
      const rightEdge = placeShareMenu({
        anchor: anchorAt(width - 16 - 48),
        menu: MENU,
        viewport,
        align: "right",
        dir: "rtl",
      });

      expectInside(leftRail, viewport);
      expectInside(rightEdge, viewport);
      expect(leftRail.physicalAlign).toBe("left");
      expect(leftRail.left).toBeGreaterThanOrEqual(PADDING);
    }
  );

  it("flips inline when the preferred side would overflow", () => {
    const viewport = { width: 1280, height: 800 };
    const placed = placeShareMenu({
      anchor: anchorAt(16),
      menu: MENU,
      viewport,
      align: "right",
      dir: "ltr",
    });

    expect(placed.flippedInline).toBe(true);
    expect(placed.physicalAlign).toBe("left");
    expectInside(placed, viewport);
  });

  it("shifts when flip still collides (center near the right edge)", () => {
    const viewport = { width: 1024, height: 800 };
    const placed = placeShareMenu({
      anchor: anchorAt(viewport.width - 40),
      menu: MENU,
      viewport,
      align: "center",
      dir: "ltr",
    });

    expect(placed.shifted).toBe(true);
    expectInside(placed, viewport);
  });

  it("flips below when there is not enough room above the trigger", () => {
    const viewport = { width: 1280, height: 800 };
    const placed = placeShareMenu({
      anchor: { left: 600, top: 24, width: 48, height: 56 },
      menu: MENU,
      viewport,
      align: "right",
      dir: "ltr",
    });

    expect(placed.placement).toBe("below");
    expect(placed.flippedBlock).toBe(true);
    expect(placed.top).toBe(24 + 56 + SHARE_MENU_GAP_PX);
    expectInside(placed, viewport);
  });

  it("does not resize the menu (no hidden actions)", () => {
    const viewport = { width: 768, height: 700 };
    const placed = placeShareMenu({
      anchor: anchorAt(viewport.width - 20 - 48),
      menu: MENU,
      viewport,
      align: "right",
      dir: "ltr",
    });

    expect(MENU.width).toBe(SHARE_MENU_WIDTH_PX);
    expect(placed.left + MENU.width).toBeLessThanOrEqual(
      viewport.width - PADDING
    );
    expect(placed.top + MENU.height).toBeLessThanOrEqual(
      viewport.height - PADDING
    );
  });

  it("mobile web 390px: menu stays fully inside LTR and RTL", () => {
    const viewport = { width: MOBILE_WEB_WIDTH, height: 844 };
    const ltr = placeShareMenu({
      anchor: anchorAt(viewport.width - 16 - 48),
      menu: MENU,
      viewport,
      align: "right",
      dir: "ltr",
    });
    const rtl = placeShareMenu({
      anchor: anchorAt(12),
      menu: MENU,
      viewport,
      align: "right",
      dir: "rtl",
    });

    expectInside(ltr, viewport);
    expectInside(rtl, viewport);
  });
});
