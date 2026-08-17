/**
 * Viewport collision for the desktop Share popover.
 * Flip (end ↔ start, above ↔ below) then shift so the menu stays on-screen.
 * Does not resize or clip actions.
 */

export type ShareMenuAlign = "left" | "right" | "center";
export type WritingDir = "ltr" | "rtl";
export type ShareMenuPlacement = "above" | "below";
export type PhysicalAlign = "left" | "right" | "center";

export type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type ViewportBox = {
  width: number;
  height: number;
};

export const SHARE_MENU_WIDTH_PX = 208; // Tailwind w-52
export const SHARE_MENU_GAP_PX = 12; // 0.75rem
export const SHARE_MENU_VIEWPORT_PADDING_PX = 8;

export type PlaceShareMenuInput = {
  anchor: RectBox;
  menu: { width: number; height: number };
  viewport: ViewportBox;
  align?: ShareMenuAlign;
  dir?: WritingDir;
  padding?: number;
  gap?: number;
};

export type PlaceShareMenuResult = {
  top: number;
  left: number;
  placement: ShareMenuPlacement;
  physicalAlign: PhysicalAlign;
  flippedInline: boolean;
  flippedBlock: boolean;
  shifted: boolean;
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * `align="right"` means inline-end (rail-inward on Watch/Discover).
 * RTL maps end → physical left so a left-side rail opens inward.
 */
export function resolvePreferredPhysicalAlign(
  align: ShareMenuAlign,
  dir: WritingDir
): PhysicalAlign {
  if (align === "center") {
    return "center";
  }

  const wantsEnd = align === "right";
  if (dir === "rtl") {
    return wantsEnd ? "left" : "right";
  }
  return wantsEnd ? "right" : "left";
}

function leftForAlign(
  anchor: RectBox,
  menuWidth: number,
  physical: PhysicalAlign
): number {
  if (physical === "center") {
    return anchor.left + anchor.width / 2 - menuWidth / 2;
  }
  if (physical === "left") {
    return anchor.left;
  }
  return anchor.left + anchor.width - menuWidth;
}

function flipPhysicalAlign(physical: PhysicalAlign): PhysicalAlign {
  if (physical === "center") {
    return "center";
  }
  return physical === "right" ? "left" : "right";
}

export function placeShareMenu(input: PlaceShareMenuInput): PlaceShareMenuResult {
  const align = input.align ?? "right";
  const dir = input.dir ?? "ltr";
  const padding = input.padding ?? SHARE_MENU_VIEWPORT_PADDING_PX;
  const gap = input.gap ?? SHARE_MENU_GAP_PX;
  const { anchor, menu, viewport } = input;

  const minLeft = padding;
  const maxLeft = viewport.width - padding - menu.width;
  const minTop = padding;
  const maxTop = viewport.height - padding - menu.height;

  let physicalAlign = resolvePreferredPhysicalAlign(align, dir);
  let left = leftForAlign(anchor, menu.width, physicalAlign);
  let flippedInline = false;

  const overflowsLeft = left < minLeft;
  const overflowsRight = left > maxLeft;

  if ((overflowsLeft || overflowsRight) && physicalAlign !== "center") {
    const flipped = flipPhysicalAlign(physicalAlign);
    const flippedLeft = leftForAlign(anchor, menu.width, flipped);
    const flippedFits =
      flippedLeft >= minLeft && flippedLeft <= maxLeft;
    const flippedOverflow = Math.max(
      0,
      minLeft - flippedLeft,
      flippedLeft - maxLeft
    );
    const currentOverflow = Math.max(0, minLeft - left, left - maxLeft);

    if (flippedFits || flippedOverflow < currentOverflow) {
      physicalAlign = flipped;
      left = flippedLeft;
      flippedInline = true;
    }
  }

  const shiftedLeft = clamp(left, minLeft, maxLeft);
  const shifted = shiftedLeft !== left;
  left = shiftedLeft;

  let placement: ShareMenuPlacement = "above";
  let top = anchor.top - gap - menu.height;
  let flippedBlock = false;

  if (top < minTop) {
    const below = anchor.top + anchor.height + gap;
    if (below <= maxTop || below > top) {
      placement = "below";
      top = below;
      flippedBlock = true;
    }
  }

  if (top > maxTop) {
    const above = anchor.top - gap - menu.height;
    if (!flippedBlock && above >= minTop) {
      placement = "above";
      top = above;
    } else {
      const clamped = clamp(top, minTop, maxTop);
      if (clamped !== top) {
        top = clamped;
      }
    }
  }

  if (top < minTop) {
    top = clamp(top, minTop, maxTop);
  }

  return {
    top,
    left,
    placement,
    physicalAlign,
    flippedInline,
    flippedBlock,
    shifted: shifted || left !== leftForAlign(anchor, menu.width, physicalAlign),
  };
}

export function readDocumentDir(
  dirAttr: string | null | undefined
): WritingDir {
  return dirAttr === "rtl" ? "rtl" : "ltr";
}
