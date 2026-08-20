/**
 * Creator Space Loading States V1 (CREATOR_SPACE_EXPERIENCE_V1 §19).
 * Skeleton anatomy for Hero → Stats → Tabs → panel — no Home / Learning edits.
 */

/** Timeline / list panel skeleton card count (§19: 3–6). */
export const PROFILE_LOADING_TIMELINE_SKELETON_COUNT = 4;

/** Stats strip placeholder cell count (Followers / Following / Likes / Views). */
export const PROFILE_LOADING_STATS_CELL_COUNT = 4;

/** Tab-rail chip placeholders while counts may resolve late. */
export const PROFILE_LOADING_TAB_CHIP_COUNT = 5;

/** Shared pulse surface — honors prefers-reduced-motion via motion-reduce. */
export const PROFILE_LOADING_PULSE_CLASS =
  "animate-pulse bg-white/10 motion-reduce:animate-none motion-reduce:bg-white/[0.08]";

export const PROFILE_LOADING_COPY = {
  ariaLabel: "Loading Creator Space",
  fallbackStatus: "Opening Creator Space…",
} as const;
