export type MenuBoxRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type ClampedDeleteMenuBox = {
  top: number;
  left: number;
  width: number;
};

const DEFAULT_MENU_WIDTH = 192;
const DEFAULT_MENU_HEIGHT = 52;
const DEFAULT_GUTTER = 12;

/**
 * Viewport-clamped fixed coordinates for the owner delete menu.
 * Keeps the panel fully visible at 360/390/430/768/desktop in LTR and RTL.
 */
export function clampDeleteMenuBox(input: {
  trigger: MenuBoxRect;
  viewport: { width: number; height: number };
  dir: "ltr" | "rtl";
  menuWidth?: number;
  menuHeight?: number;
  gutter?: number;
}): ClampedDeleteMenuBox {
  const gutter = input.gutter ?? DEFAULT_GUTTER;
  const menuHeight = input.menuHeight ?? DEFAULT_MENU_HEIGHT;
  const viewportWidth = Math.max(0, input.viewport.width);
  const viewportHeight = Math.max(0, input.viewport.height);
  const maxWidth = Math.max(1, viewportWidth - gutter * 2);
  const width = Math.min(input.menuWidth ?? DEFAULT_MENU_WIDTH, maxWidth);

  const maxLeft = Math.max(gutter, viewportWidth - width - gutter);
  let left =
    input.dir === "rtl" ? input.trigger.left : input.trigger.right - width;
  left = Math.min(Math.max(gutter, left), maxLeft);

  const spaceBelow = viewportHeight - input.trigger.bottom - gutter;
  const spaceAbove = input.trigger.top - gutter;
  const placeAbove = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;

  const maxTop = Math.max(gutter, viewportHeight - menuHeight - gutter);
  let top = placeAbove
    ? input.trigger.top - menuHeight - 8
    : input.trigger.bottom + 8;
  top = Math.min(Math.max(gutter, top), maxTop);

  return { top, left, width };
}
