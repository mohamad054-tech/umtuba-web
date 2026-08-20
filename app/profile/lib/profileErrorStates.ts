/**
 * Creator Space Error States V1 (CREATOR_SPACE_EXPERIENCE_V1 §20).
 * Soft secondary-fetch failures — never blank the whole Creator Space.
 */

export const PROFILE_ERROR_STATES_COPY = {
  statsSoftBanner:
    "Some profile stats couldn't be loaded. Counts may be incomplete.",
  allPanel: "Content couldn't be loaded right now.",
  articlesPanel: "Articles couldn't be loaded right now.",
  videosPanel: "Videos couldn't be loaded right now.",
  photosPanel: "Photos couldn't be loaded right now.",
  livePanel: "Live sessions couldn't be loaded right now.",
  retryCta: "Try again",
  shareError: "Couldn't copy the Creator Space link.",
} as const;

/** Soft amber banner — page remains usable (§20 Stats / panel errors). */
export const PROFILE_ERROR_SOFT_BANNER_CLASS =
  "rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100";

export const shouldShowProfileErrorRetry = (
  onRetry?: (() => void) | null
): boolean => typeof onRetry === "function";
