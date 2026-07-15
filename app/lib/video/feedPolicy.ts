/**
 * Canonical video-feed policy shared by Discover and Watch.
 *
 * View counting:
 * - Client records a view when a slide becomes the active (primary) video.
 * - Client session dedupe: at most one recordViewAction call per postId per
 *   page session (avoids spam while scrolling).
 * - Server RPC `record_post_view` is authoritative: dedupes per
 *   (post_id, viewer_key) within a 6-hour window and increments posts.views
 *   only when counted.
 * - Demo / non-supabase items never call the RPC.
 *
 * Interactions (likes, comments, saves, shares) use the same social actions
 * on both routes; auth redirects use the route returnPath (/discover|/watch).
 */

export const FEED_VIEW_DEDUPE_WINDOW_HOURS = 6;

/** Initial page size for Discover and Watch real feeds. */
export const VIDEO_FEED_PAGE_SIZE = 12;

/** Hard cap per request (matches Watch server clamp). */
export const VIDEO_FEED_PAGE_MAX = 30;

export type VideoFeedSurface = "discover" | "watch";
