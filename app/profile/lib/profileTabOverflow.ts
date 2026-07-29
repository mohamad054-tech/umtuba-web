/**
 * Creator Space Tab Overflow Fade V1 (CREATOR_SPACE_EXPERIENCE_V1 §5).
 * Horizontal tab rail fade edges when content overflows — no hamburger.
 */

/** Fade edge width (px) for left/right overflow hints. */
export const PROFILE_TAB_OVERFLOW_FADE_PX = 28;

/** Scroll epsilon before treating an edge as scrolled away. */
export const PROFILE_TAB_OVERFLOW_SCROLL_EPSILON_PX = 2;

export const PROFILE_TAB_OVERFLOW_FADE_LEFT_CLASS =
  "pointer-events-none absolute inset-y-0 left-0 z-[1] bg-gradient-to-r from-[#080816] to-transparent";

export const PROFILE_TAB_OVERFLOW_FADE_RIGHT_CLASS =
  "pointer-events-none absolute inset-y-0 right-0 z-[1] bg-gradient-to-l from-[#080816] to-transparent";

export type ProfileTabOverflowEdges = {
  showLeftFade: boolean;
  showRightFade: boolean;
};

/**
 * Compute which fade edges should show for a horizontal scroll rail.
 * Right fade when content overflows or more content exists to the right.
 * Left fade only after the user has scrolled away from the start.
 */
export function getProfileTabOverflowEdges(input: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  epsilonPx?: number;
}): ProfileTabOverflowEdges {
  const epsilon = input.epsilonPx ?? PROFILE_TAB_OVERFLOW_SCROLL_EPSILON_PX;
  const maxScroll = Math.max(0, input.scrollWidth - input.clientWidth);
  const overflow = maxScroll > epsilon;
  const showLeftFade = overflow && input.scrollLeft > epsilon;
  const showRightFade =
    overflow && input.scrollLeft < maxScroll - epsilon;
  return { showLeftFade, showRightFade };
}
