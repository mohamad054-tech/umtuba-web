/**
 * Home Circular Arc Navigation Foundation V1 — geometry only.
 * Pure layout math: left C-arc overlay positions for N portals (supports 1…20+).
 *
 * Safe-area fitting keeps nodes on-screen, left of the engagement rail, spaced apart,
 * and clear of the bottom caption/creator band — without collapsing into overlaps.
 */

export type ArcLayoutInput = {
  width: number;
  height: number;
  count: number;
  /** Override node diameter (px). When omitted, scales with viewport + density. */
  nodeSize?: number;
};

export type ArcNodeLayout = {
  /** Portal center X relative to overlay container */
  x: number;
  /** Portal center Y relative to overlay container */
  y: number;
  /** Portal diameter in px */
  size: number;
  /** Angle on the arc (radians), 0 = toward +X (into the video) */
  angle: number;
};

export type ArcGeometryMeta = {
  centerX: number;
  centerY: number;
  radius: number;
  halfSpread: number;
};

/** Minimum interactive diameter (a11y hit target floor when viewport allows). */
export const ARC_MIN_NODE_SIZE = 44;
const MAX_NODE = 56;
/** Keep portals in the left band — away from right engagement rail. */
const MAX_X_RATIO = 0.4;
/** Leave bottom band for creator/caption chrome. */
const BOTTOM_SAFE_RATIO = 0.86;
const TOP_SAFE_PX = 8;
const EDGE_PAD_PX = 4;
const MIN_GAP_FACTOR = 1.08;

function emptyMeta(): ArcGeometryMeta {
  return { centerX: 0, centerY: 0, radius: 0, halfSpread: 0 };
}

function sanitizeCount(count: number): number {
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.min(64, Math.floor(count));
}

function sanitizeViewport(width: number, height: number): {
  width: number;
  height: number;
} | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/**
 * Layout portal centers along a left concave C-arc that opens toward the video.
 * Overlay-only: does not reserve layout space from the feed.
 */
export function layoutCircularArcNodes(
  input: ArcLayoutInput
): { nodes: ArcNodeLayout[]; meta: ArcGeometryMeta } {
  const viewport = sanitizeViewport(input.width, input.height);
  const count = sanitizeCount(input.count);

  if (!viewport || count <= 0) {
    return { nodes: [], meta: emptyMeta() };
  }

  const { width, height } = viewport;

  const maxX = Math.min(width * MAX_X_RATIO, width - 72);
  const minX = EDGE_PAD_PX;
  const minY = TOP_SAFE_PX;
  const maxY = Math.min(height * BOTTOM_SAFE_RATIO, height - EDGE_PAD_PX);

  if (maxX - minX < 24 || maxY - minY < 24) {
    return { nodes: [], meta: emptyMeta() };
  }

  const densityScale = Math.max(0.5, 1 - Math.max(0, count - 6) * 0.04);
  const requested =
    input.nodeSize !== undefined && Number.isFinite(input.nodeSize)
      ? input.nodeSize
      : Math.min(MAX_NODE, Math.max(ARC_MIN_NODE_SIZE, Math.min(width, height) * 0.09)) *
        densityScale;

  let size = Math.min(MAX_NODE, Math.max(28, requested));

  // Prefer 44px when the safe band can host the arc.
  const bandH = maxY - minY;
  const bandW = maxX - minX;
  if (bandH >= ARC_MIN_NODE_SIZE * 2 && bandW >= ARC_MIN_NODE_SIZE) {
    size = Math.max(Math.min(ARC_MIN_NODE_SIZE, bandW * 0.5), size);
    size = Math.max(ARC_MIN_NODE_SIZE * 0.85, Math.min(MAX_NODE, size));
  }

  const halfSpread =
    count === 1 ? 0 : Math.min(1.2, 0.38 + (count - 1) * 0.042);

  // Arc center left of the safe band; radius fitted so raw points stay inside.
  let centerX = minX - bandW * 0.35;
  let centerY = (minY + maxY) / 2;

  const pad = size / 2 + 2;
  const innerMinX = minX + pad;
  const innerMaxX = maxX - pad;
  const innerMinY = minY + pad;
  const innerMaxY = maxY - pad;

  if (innerMaxX <= innerMinX || innerMaxY <= innerMinY) {
    size = Math.max(24, size * 0.7);
  }

  const iMinX = minX + size / 2 + 1;
  const iMaxX = maxX - size / 2 - 1;
  const iMinY = minY + size / 2 + 1;
  const iMaxY = maxY - size / 2 - 1;

  if (iMaxX <= iMinX || iMaxY <= iMinY) {
    return { nodes: [], meta: emptyMeta() };
  }

  centerY = (iMinY + iMaxY) / 2;
  const maxRFromY =
    halfSpread < 1e-6
      ? iMaxY - iMinY
      : Math.min(centerY - iMinY, iMaxY - centerY) / Math.sin(halfSpread);
  const maxRFromX = Math.max(8, iMaxX - centerX);
  let radius = Math.min(
    maxRFromY,
    maxRFromX,
    height * 0.4,
    Math.max(width * 0.28, height * 0.22)
  );
  radius = Math.max(radius, size * 0.9);

  // If chord spacing too tight, shrink size (keep arc shape stable).
  if (count > 1) {
    const delta = (2 * halfSpread) / (count - 1);
    const sinHalf = Math.sin(delta / 2);
    if (sinHalf > 1e-6) {
      const chord = 2 * radius * sinHalf;
      const need = size * MIN_GAP_FACTOR;
      if (chord < need) {
        size = Math.max(24, chord / MIN_GAP_FACTOR);
        // Recompute vertical fit with new size
        const yPad = size / 2 + 1;
        const y0 = minY + yPad;
        const y1 = maxY - yPad;
        if (y1 > y0) {
          centerY = (y0 + y1) / 2;
          const rY =
            halfSpread < 1e-6
              ? y1 - y0
              : Math.min(centerY - y0, y1 - centerY) / Math.sin(halfSpread);
          radius = Math.min(radius, rY, Math.max(8, iMaxX - centerX));
        }
      }
    }
  }

  const angles: number[] =
    count === 1
      ? [0]
      : Array.from({ length: count }, (_, i) => {
          const t = i / (count - 1);
          return -halfSpread + t * (2 * halfSpread);
        });

  const nodes: ArcNodeLayout[] = angles.map((angle) => {
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return {
      x: Math.min(iMaxX, Math.max(iMinX, x)),
      y: Math.min(iMaxY, Math.max(iMinY, y)),
      size,
      angle,
    };
  });

  // Prefer a11y-sized nodes when the vertical safe band can host them.
  if (count > 1) {
    const ySpan = iMaxY - iMinY;
    const needForA11y = (count - 1) * ARC_MIN_NODE_SIZE * MIN_GAP_FACTOR;
    if (ySpan >= needForA11y && size < ARC_MIN_NODE_SIZE) {
      size = ARC_MIN_NODE_SIZE;
      for (const n of nodes) n.size = size;
    }
  } else if (size < ARC_MIN_NODE_SIZE && iMaxY - iMinY >= ARC_MIN_NODE_SIZE) {
    size = ARC_MIN_NODE_SIZE;
    nodes[0]!.size = size;
  }

  // If clamping caused near-duplicates, redistribute Y evenly in-band (keep X).
  if (count > 1) {
    let minDist = Infinity;
    for (let i = 1; i < nodes.length; i += 1) {
      minDist = Math.min(
        minDist,
        Math.hypot(nodes[i]!.x - nodes[i - 1]!.x, nodes[i]!.y - nodes[i - 1]!.y)
      );
    }
    if (minDist < size * 0.98) {
      const span = iMaxY - iMinY;
      for (let i = 0; i < nodes.length; i += 1) {
        const t = i / (nodes.length - 1);
        nodes[i]!.y = iMinY + t * span;
        nodes[i]!.x = Math.min(iMaxX, Math.max(iMinX, nodes[i]!.x));
        nodes[i]!.size = size;
      }
      const step = span / (count - 1);
      if (step < size * MIN_GAP_FACTOR) {
        const nextSize = Math.max(22, step / MIN_GAP_FACTOR);
        size = nextSize;
        for (const n of nodes) n.size = nextSize;
      }
    }
  }

  return {
    nodes,
    meta: { centerX, centerY, radius, halfSpread },
  };
}
