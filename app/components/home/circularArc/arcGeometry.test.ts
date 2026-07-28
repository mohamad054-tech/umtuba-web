import { describe, expect, it } from "vitest";
import {
  ARC_MIN_NODE_SIZE,
  layoutCircularArcNodes,
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
  { name: "tablet", width: 768, height: 1024 },
  { name: "foldable-wide", width: 884, height: 1100 },
] as const;

const COUNTS = [1, 2, 5, 7, 10, 15, 20] as const;

function assertSafeLayout(
  width: number,
  height: number,
  count: number,
  nodes: ReturnType<typeof layoutCircularArcNodes>["nodes"]
) {
  expect(nodes).toHaveLength(count);
  const maxX = Math.min(width * 0.4, width - 72);
  const maxY = height * 0.86;

  for (const node of nodes) {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isFinite(node.size)).toBe(true);
    expect(Number.isNaN(node.x)).toBe(false);
    expect(node.x - node.size / 2).toBeGreaterThanOrEqual(-0.5);
    expect(node.x + node.size / 2).toBeLessThanOrEqual(width + 0.5);
    expect(node.y - node.size / 2).toBeGreaterThanOrEqual(-0.5);
    expect(node.y + node.size / 2).toBeLessThanOrEqual(height + 0.5);
    expect(node.x).toBeLessThanOrEqual(maxX + 1);
    expect(node.y).toBeLessThanOrEqual(maxY + 1);
  }

  for (let i = 1; i < nodes.length; i += 1) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    // Allow tiny float slack after clamp/nudge.
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
    expect(shell).toMatch(/HOME_CIRCULAR_ARC_FOUNDATION_ENABLED/);
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(shell).toMatch(
      /HOME_CIRCULAR_ARC_FOUNDATION_ENABLED \? <HomeCircularArc/
    );
  });
});

describe("Home Circular Arc geometry foundation", () => {
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
      layoutCircularArcNodes({ width: 390, height: Number.POSITIVE_INFINITY, count: 7 })
        .nodes
    ).toEqual([]);
    expect(
      layoutCircularArcNodes({ width: 390, height: 800, count: Number.NaN }).nodes
    ).toEqual([]);
    expect(
      layoutCircularArcNodes({ width: 390, height: 800, count: -3 }).nodes
    ).toEqual([]);
    expect(
      layoutCircularArcNodes({ width: 40, height: 40, count: 7 }).nodes
    ).toEqual([]);
  });

  it("handles count = 1", () => {
    const { nodes, meta } = layoutCircularArcNodes({
      width: 390,
      height: 844,
      count: 1,
    });
    expect(nodes).toHaveLength(1);
    expect(meta.halfSpread).toBe(0);
    expect(Number.isFinite(nodes[0]!.x)).toBe(true);
    expect(nodes[0]!.size).toBeGreaterThanOrEqual(ARC_MIN_NODE_SIZE);
  });

  it("floors fractional counts and ignores non-finite nodeSize override safely", () => {
    const { nodes } = layoutCircularArcNodes({
      width: 390,
      height: 844,
      count: 2.9,
    });
    expect(nodes).toHaveLength(2);

    const withBadSize = layoutCircularArcNodes({
      width: 390,
      height: 844,
      count: 3,
      nodeSize: Number.NaN,
    });
    expect(withBadSize.nodes).toHaveLength(3);
    expect(withBadSize.nodes.every((n) => Number.isFinite(n.size))).toBe(true);
  });

  it("places foundation portals on a left C-arc opening toward the video", () => {
    const { nodes, meta } = layoutCircularArcNodes({
      width: 390,
      height: 844,
      count: HOME_ARC_FOUNDATION_PORTALS.length,
    });

    expect(nodes).toHaveLength(HOME_ARC_FOUNDATION_PORTALS.length);
    expect(meta.radius).toBeGreaterThan(0);
    expect(meta.centerX).toBeLessThan(nodes[0]!.x);

    for (let i = 1; i < nodes.length; i += 1) {
      expect(nodes[i]!.y).toBeGreaterThanOrEqual(nodes[i - 1]!.y - 0.5);
    }

    for (const node of nodes) {
      expect(node.x).toBeLessThan(390 * 0.45);
      expect(node.size).toBeGreaterThanOrEqual(ARC_MIN_NODE_SIZE * 0.85);
    }
  });

  it("keeps nodes safe across phone/tablet/foldable × density counts", () => {
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

  it("shrinks nodes as count grows to 10/15/20", () => {
    const baseline = layoutCircularArcNodes({
      width: 430,
      height: 920,
      count: 7,
    }).nodes[0]!.size;

    for (const count of [10, 15, 20] as const) {
      const { nodes, meta } = layoutCircularArcNodes({
        width: 430,
        height: 920,
        count,
      });
      expect(nodes).toHaveLength(count);
      expect(meta.halfSpread).toBeLessThanOrEqual(1.25);
      expect(nodes[0]!.size).toBeLessThanOrEqual(baseline + 0.01);
    }
  });
});
