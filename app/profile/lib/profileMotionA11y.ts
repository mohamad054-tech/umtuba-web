/**
 * Creator Space Motion / A11y Pass V1 (CREATOR_SPACE_EXPERIENCE_V1 §15 + §21).
 * Profile-only presentation — no Home / Watch changes.
 */

/** Collapse sticky compact header after this scroll Y (within §15 80–120px). */
export const PROFILE_HERO_COLLAPSE_SCROLL_PX = 96;

/** Page-enter / tab cross-fade target duration (ms). */
export const PROFILE_MOTION_DURATION_MS = 220;

export const PROFILE_PAGE_ENTER_CLASS =
  "motion-safe:animate-[profilePageEnter_220ms_ease-out] motion-reduce:animate-none";

export const PROFILE_TAB_PANEL_FADE_CLASS =
  "motion-safe:animate-[profileTabFade_220ms_ease-out] motion-reduce:animate-none";

export const PROFILE_HOVER_LIFT_CLASS =
  "transition hover:border-white/20 hover:brightness-[1.03] motion-reduce:transition-none motion-reduce:hover:brightness-100";
