/**
 * Creator Space Tab Overflow Fade V1 (CREATOR_SPACE_EXPERIENCE_V1 §5).
 * Horizontal tab rail fade edges when content overflows — no hamburger.
 * Edges are logical (inline-start / inline-end) so LTR and RTL mirror.
 */

/** Fade edge width (px) for start/end overflow hints. */
export const PROFILE_TAB_OVERFLOW_FADE_PX = 28;

/** Scroll epsilon before treating an edge as scrolled away. */
export const PROFILE_TAB_OVERFLOW_SCROLL_EPSILON_PX = 2;

/** Start-edge fade: physical left in LTR, physical right in RTL. */
export const PROFILE_TAB_OVERFLOW_FADE_START_CLASS =
  "pointer-events-none absolute inset-y-0 start-0 z-[1] bg-gradient-to-r from-[#080816] to-transparent rtl:bg-gradient-to-l";

/** End-edge fade: physical right in LTR, physical left in RTL. */
export const PROFILE_TAB_OVERFLOW_FADE_END_CLASS =
  "pointer-events-none absolute inset-y-0 end-0 z-[1] bg-gradient-to-l from-[#080816] to-transparent rtl:bg-gradient-to-r";

export type ProfileTabOverflowEdges = {
  showStartFade: boolean;
  showEndFade: boolean;
};

/**
 * Compute which fade edges should show for a horizontal scroll rail.
 * End fade when content overflows or more content exists toward inline-end.
 * Start fade only after the user has scrolled away from inline-start.
 *
 * Chromium RTL reports negative `scrollLeft`; Firefox RTL stays non-negative.
 * Distance from start is therefore `abs(scrollLeft)`.
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
  const distanceFromStart = Math.abs(input.scrollLeft);
  const showStartFade = overflow && distanceFromStart > epsilon;
  const showEndFade =
    overflow && distanceFromStart < maxScroll - epsilon;
  return { showStartFade, showEndFade };
}
