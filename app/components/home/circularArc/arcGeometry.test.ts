import { describe, expect, it } from "vitest";
import {
  ARC_MIN_NODE_SIZE,
  HOME_VIDEO_STAGE_MAX_PX,
  estimateHomeVideoLeftPx,
  layoutCircularArcNodes,
  resolveArcVideoGapPx,
} from "./arcGeometry";
import { HOME_ARC_FOUNDATION_PORTALS } from "./homeCircularArcPortals";
import {
  HOME_CIRCULAR_ARC_FOUNDATION_ENABLED,
  HOME_CIRCULAR_ARC_FOUNDATION_MODE,
} from "./homeCircularArcFlags";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const VIEWPORTS = [
  { name: "phone-narrow", width: 360, height: 640 },
  { name: "phone-tall", width: 390, height: 844 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
  { name: "narrow-desktop", width: 1024, height: 700 },
  { name: "arc-rail", width: 108, height: 780 },
] as const;

const COUNTS = [1, 2, 5, 7, 10, 15, 20] as const;

function assertSafeLayout(
  width: number,
  height: number,
  count: number,
  nodes: ReturnType<typeof layoutCircularArcNodes>["nodes"]
) {
  expect(nodes).toHaveLength(count);
  const videoLeft = estimateHomeVideoLeftPx(width);
  const gap = resolveArcVideoGapPx(width);
  const videoLimit =
    width <= 160 ? width : Math.max(0, videoLeft - gap);

  for (const node of nodes) {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isFinite(node.size)).toBe(true);
    expect(node.x - node.size / 2).toBeGreaterThanOrEqual(-0.5);
    expect(node.x + node.size / 2).toBeLessThanOrEqual(width + 0.5);
    expect(node.y - node.size / 2).toBeGreaterThanOrEqual(-0.5);
    expect(node.y + node.size / 2).toBeLessThanOrEqual(height + 0.5);
    // Discs must not enter the video stage (full-shell hosts).
    if (width > 160 && videoLeft > 40) {
      expect(node.x + node.size / 2).toBeLessThanOrEqual(videoLimit + 1);
    }
  }

  for (let i = 1; i < nodes.length; i += 1) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    expect(dist).toBeGreaterThanOrEqual(a.size * 0.95);
  }
}

describe("Home Circular Arc fail-closed flag", () => {
  it("stays disabled while Home is locked (foundation not user-facing)", () => {
    expect(HOME_CIRCULAR_ARC_FOUNDATION_ENABLED).toBe(false);
    expect(HOME_CIRCULAR_ARC_FOUNDATION_MODE).toBe("fail-closed");

    const shell = readFileSync(
      join(process.cwd(), "app/discover/components/DiscoverShell.tsx"),
      "utf8"
    );
    expect(shell).toMatch(/shouldMountHomeCircularArc/);
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(shell).toMatch(/showCircularArcPreview/);
    expect(shell).toMatch(/HomeCircularArc/);
    expect(shell).toMatch(/w-\[4\.75rem\]/);
  });
});

describe("Home Circular Arc layout final polish", () => {
  it("keeps a 24–40px gap model vs centered video stage", () => {
    expect(HOME_VIDEO_STAGE_MAX_PX).toBe(510);
    expect(resolveArcVideoGapPx(800)).toBe(24);
    expect(resolveArcVideoGapPx(1000)).toBe(32);
    expect(resolveArcVideoGapPx(1400)).toBe(40);
    expect(estimateHomeVideoLeftPx(1400)).toBe((1400 - 510) / 2);
  });

  it("returns empty nodes for invalid / edge inputs", () => {
    expect(layoutCircularArcNodes({ width: 0, height: 800, count: 7 }).nodes).toEqual(
      []
    );
    expect(layoutCircularArcNodes({ width: 390, height: 0, count: 7 }).nodes).toEqual(
      []
    );
    expect(layoutCircularArcNodes({ width: 390, height: 800, count: 0 }).nodes).toEqual(
      []
    );
    expect(
      layoutCircularArcNodes({ width: Number.NaN, height: 800, count: 7 }).nodes
    ).toEqual([]);
    expect(
      layoutCircularArcNodes({ width: 40, height: 40, count: 7 }).nodes
    ).toEqual([]);
  });

  it("handles count = 1 with calm placement", () => {
    const { nodes, meta } = layoutCircularArcNodes({
      width: 1280,
      height: 800,
      count: 1,
    });
    expect(nodes).toHaveLength(1);
    expect(meta.halfSpread).toBe(0);
    expect(Number.isFinite(nodes[0]!.x)).toBe(true);
  });

  it("uses a calm rail curve (not a half-ring)", () => {
    const { nodes, meta } = layoutCircularArcNodes({
      width: 1440,
      height: 900,
      count: HOME_ARC_FOUNDATION_PORTALS.length,
    });
    expect(nodes).toHaveLength(HOME_ARC_FOUNDATION_PORTALS.length);
    expect(meta.halfSpread).toBeLessThanOrEqual(0.82);
    expect(meta.halfSpread).toBeGreaterThan(0.2);
  });

  it("keeps nodes safe across desktop/laptop/narrow/rail × density counts", () => {
    for (const vp of VIEWPORTS) {
      for (const count of COUNTS) {
        const { nodes } = layoutCircularArcNodes({
          width: vp.width,
          height: vp.height,
          count,
        });
        assertSafeLayout(vp.width, vp.height, count, nodes);
      }
    }
  });

  it("shrinks on short height instead of stacking overlaps", () => {
    const tall = layoutCircularArcNodes({
      width: 1280,
      height: 900,
      count: 7,
    }).nodes[0]!.size;
    const short = layoutCircularArcNodes({
      width: 1280,
      height: 560,
      count: 7,
    }).nodes[0]!.size;
    expect(short).toBeLessThanOrEqual(tall + 0.01);
  });
});
