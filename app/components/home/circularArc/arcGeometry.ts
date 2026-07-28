/**
 * Home Circular Arc — geometry (Layout Final Polish V1).
 *
 * Keeps the arc in a left navigation rail band that does **not** enter the
 * Home video stage (max 510px, centered). Gap to video: 24–40px by viewport.
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

/** Matches DiscoverExperience video stage `max-w-[510px]`. */
export const HOME_VIDEO_STAGE_MAX_PX = 510;

/** Minimum interactive diameter when space allows. */
export const ARC_MIN_NODE_SIZE = 48;
const MAX_NODE = 60;
/** Clear Stories / header — Micro Polish: +14px vs Layout Final. */
const TOP_SAFE_PX = 94;
/** Lift last portal slightly off the bottom edge. */
const BOTTOM_SAFE_RATIO = 0.82;
const BOTTOM_SAFE_EXTRA_PX = 14;
const LEFT_INSET_PX = 14;
const EDGE_PAD_PX = 8;
/** Fixed-ish gap factor between disc centers. */
const MIN_GAP_FACTOR = 1.18;
/** Host widths at/under this are treated as dedicated left rails (not full Home). */
const RAIL_HOST_MAX_PX = 160;

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

/** Gap between arc column (right edge) and video stage (left edge). */
export function resolveArcVideoGapPx(width: number): number {
  if (width < 900) return 24;
  if (width < 1200) return 32;
  return 40;
}

/** Estimated left edge of the centered Home video stage within `width`. */
export function estimateHomeVideoLeftPx(width: number): number {
  const videoW = Math.min(HOME_VIDEO_STAGE_MAX_PX, width);
  return Math.max(0, (width - videoW) / 2);
}

/**
 * Right limit for portal centers' containing band (before size/2 inset).
 * Never advances into the video stage; keeps a stable gap.
 */
export function resolveArcBandMaxX(width: number, minX: number): number {
  if (width <= RAIL_HOST_MAX_PX) {
    return Math.max(minX + 24, width - EDGE_PAD_PX);
  }

  const videoLeft = estimateHomeVideoLeftPx(width);
  const gap = resolveArcVideoGapPx(width);
  const fromVideo = videoLeft - gap;

  // Narrow full-bleed: keep a thin left gutter only (still not over mid-video).
  const gutterFallback = Math.min(width * 0.2, 96);
  const maxX = fromVideo > minX + 40 ? fromVideo : Math.max(minX + 48, gutterFallback);

  return Math.min(maxX, width - EDGE_PAD_PX);
}

/**
 * Layout portal centers along a calm left C-arc (modern nav rail — not a half-ring).
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
  const minX = LEFT_INSET_PX + EDGE_PAD_PX;
  const minY = TOP_SAFE_PX;
  const maxY = Math.min(
    height * BOTTOM_SAFE_RATIO,
    height - EDGE_PAD_PX - BOTTOM_SAFE_EXTRA_PX
  );
  const maxX = resolveArcBandMaxX(width, minX);

  if (maxX - minX < 28 || maxY - minY < 28) {
    return { nodes: [], meta: emptyMeta() };
  }

  const bandH = maxY - minY;
  const bandW = maxX - minX;

  // Size from width, then shrink for short viewports to preserve gap (no pile-up).
  const densityScale = Math.max(0.55, 1 - Math.max(0, count - 6) * 0.036);
  const requested =
    input.nodeSize !== undefined && Number.isFinite(input.nodeSize)
      ? input.nodeSize
      : Math.min(MAX_NODE, Math.max(ARC_MIN_NODE_SIZE, Math.min(bandW, height) * 0.42)) *
        densityScale;

  let size = Math.min(MAX_NODE, Math.max(26, requested));
  if (count > 1) {
    const maxByGap = (bandH - (count - 1) * (size * (MIN_GAP_FACTOR - 1))) / count;
    // Prefer keeping gap: reduce size so centers fit with MIN_GAP_FACTOR.
    const maxSizeForGap = bandH / ((count - 1) * MIN_GAP_FACTOR + 1);
    size = Math.min(size, Math.max(22, maxSizeForGap));
    void maxByGap;
  }

  // Calm rail curve — not a vertical list, not a dramatic half-circle.
  const halfSpread =
    count === 1 ? 0 : Math.min(0.82, 0.32 + (count - 1) * 0.035);

  let centerX = minX - bandW * 0.45;
  let centerY = (minY + maxY) / 2;

  let iMinX = minX + size / 2;
  let iMaxX = maxX - size / 2;
  let iMinY = minY + size / 2;
  let iMaxY = maxY - size / 2;

  if (iMaxX <= iMinX || iMaxY <= iMinY) {
    size = Math.max(22, size * 0.75);
    iMinX = minX + size / 2;
    iMaxX = maxX - size / 2;
    iMinY = minY + size / 2;
    iMaxY = maxY - size / 2;
  }

  if (iMaxX <= iMinX || iMaxY <= iMinY) {
    return { nodes: [], meta: emptyMeta() };
  }

  centerY = (iMinY + iMaxY) / 2;
  const maxRFromY =
    halfSpread < 1e-6
      ? iMaxY - iMinY
      : Math.min(centerY - iMinY, iMaxY - centerY) / Math.sin(halfSpread);
  const maxRFromX = Math.max(10, iMaxX - centerX);
  let radius = Math.min(maxRFromY, maxRFromX, bandH * 0.55, bandW * 2.2);
  radius = Math.max(radius, size * 0.95);

  if (count > 1) {
    const delta = (2 * halfSpread) / (count - 1);
    const sinHalf = Math.sin(delta / 2);
    if (sinHalf > 1e-6) {
      const need = size * MIN_GAP_FACTOR;
      const chord = 2 * radius * sinHalf;
      if (chord < need) {
        const neededR = need / (2 * sinHalf);
        if (neededR <= maxRFromY * 1.02 && neededR <= maxRFromX * 1.02) {
          radius = Math.min(neededR, maxRFromY, maxRFromX);
        } else {
          size = Math.max(22, chord / MIN_GAP_FACTOR);
        }
      }
    }
  }

  const jMinX = minX + size / 2;
  const jMaxX = maxX - size / 2;
  const jMinY = minY + size / 2;
  const jMaxY = maxY - size / 2;
  if (jMaxX <= jMinX || jMaxY <= jMinY) {
    return { nodes: [], meta: emptyMeta() };
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
      x: Math.min(jMaxX, Math.max(jMinX, x)),
      y: Math.min(jMaxY, Math.max(jMinY, y)),
      size,
      angle,
    };
  });

  // If clamp flattened spacing, redistribute with fixed Y gap + soft C bulge in X.
  if (count > 1) {
    let minDist = Infinity;
    for (let i = 1; i < nodes.length; i += 1) {
      minDist = Math.min(
        minDist,
        Math.hypot(nodes[i]!.x - nodes[i - 1]!.x, nodes[i]!.y - nodes[i - 1]!.y)
      );
    }
    if (minDist < size * 0.98) {
      const span = jMaxY - jMinY;
      const step = span / (count - 1);
      if (step < size * MIN_GAP_FACTOR) {
        size = Math.max(22, step / MIN_GAP_FACTOR);
      }
      for (let i = 0; i < nodes.length; i += 1) {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const bulge = Math.sin(Math.PI * t);
        nodes[i]!.y = jMinY + t * span;
        nodes[i]!.x = Math.min(
          jMaxX,
          Math.max(jMinX, jMinX + (jMaxX - jMinX) * (0.25 + 0.5 * bulge))
        );
        nodes[i]!.size = size;
      }
    }
  }

  return {
    nodes,
    meta: { centerX, centerY, radius, halfSpread },
  };
}
