/**
 * Creator Space Accessibility Contract V1 (CREATOR_SPACE_EXPERIENCE_V1 §21).
 * Profile-only presentation helpers — no Home / Learning / Server Actions edits.
 */

/** Minimum touch target size in CSS pixels (§21). */
export const PROFILE_A11Y_MIN_TOUCH_PX = 44;

/** Additive touch-target class for Follow / Message / Share / primary CTAs. */
export const PROFILE_A11Y_TOUCH_TARGET_CLASS = "min-h-[44px]";

/** Required focus ring utility for Creator Space interactive controls. */
export const PROFILE_A11Y_FOCUS_RING_CLASS = "watch-focus-ring";

/**
 * Full class string for Message when overriding StartDirectMessageButton default
 * (that component replaces the entire className when provided).
 */
export const PROFILE_A11Y_MESSAGE_BUTTON_CLASS =
  "watch-focus-ring min-h-[44px] rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60";

export const meetsProfileTouchTargetPx = (px: number): boolean =>
  px >= PROFILE_A11Y_MIN_TOUCH_PX;
