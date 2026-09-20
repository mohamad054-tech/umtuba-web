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
 * 14-day hide after a qualified watch (Home + /watch):
 * - Separate table `post_watch_completions` + guest localStorage.
 * - A video is hidden for 14 days only after 5 consecutive seconds of play.
 * - Fast skip does not qualify. Does not change posts.views / record_post_view.
 * - If unwatched videos drop below 10, the feed backfills oldest watched rows.
 *
 * Watch-signal telemetry (Recommendation Infrastructure V1):
 * - Separate from view counting. Records watch_duration_ms, watch_percent,
 *   completed, rewatch_count, like/save/share/comment/follow_after_watch,
 *   and skipped_early via `record_watch_signal`.
 * - Does not change chronological feed ordering (Discover/Watch stay
 *   created_at DESC). Ranking helpers live in `lib/recommendations`.
 *
 * Interactions (likes, comments, saves, shares) use the same social actions
 * on both routes; auth redirects use the route returnPath (/discover|/watch).
 */

export const FEED_VIEW_DEDUPE_WINDOW_HOURS = 6;

/** Re-export hide-window so feed contracts stay in one file. */
export { WATCH_HIDE_WINDOW_DAYS } from "../../../lib/video/watchHidePolicy";

/** Initial page size for Discover and Watch real feeds. */
export const VIDEO_FEED_PAGE_SIZE = 12;

/** Hard cap per request (matches Watch server clamp). */
export const VIDEO_FEED_PAGE_MAX = 30;

export type VideoFeedSurface = "discover" | "watch";
