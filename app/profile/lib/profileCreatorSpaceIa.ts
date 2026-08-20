/**
 * Creator Space IA Rename V1 (CREATOR_SPACE_EXPERIENCE_V1 §0 / §22 P0).
 * UX copy says “Creator Space”; route stays `/profile/[username]`.
 * No Home / Learning / migration changes.
 */

/** Product surface name for user-facing copy. */
export const CREATOR_SPACE_PRODUCT_NAME = "Creator Space";

export const CREATOR_SPACE_COPY = {
  productName: CREATOR_SPACE_PRODUCT_NAME,
  tablistAriaLabel: "Creator Space sections",
  browseCta: "Browse Creator Space",
  browsePrompt:
    "This video is linked to a full article. Open it now, or keep browsing Creator Space.",
  shareAriaLabel: "Copy Creator Space link",
  shareCopiedSr: "Creator Space link copied",
  shareError: "Couldn't copy the Creator Space link.",
  editOwnerCta: "Edit Creator Space",
  notFoundEyebrow: "Creator Space",
  notFoundBody:
    "This Creator Space is not in UMTUBA yet. Try Home or Live, or create an account to claim your username.",
  mockBanner:
    "Development mock Creator Space — not a production Supabase record.",
  videosEmptyDescription:
    "Upload a clip to show it on this Creator Space and on Discover.",
  videosShowingLatest:
    "Showing the latest videos on this Creator Space. Open any clip to watch it.",
} as const;
