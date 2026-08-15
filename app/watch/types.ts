import type { DiscoverStats } from "../discover/types";
import type { VideoOverlayElement } from "../../lib/media/videoOverlays";
import { VIDEO_FEED_PAGE_SIZE } from "../lib/video/feedPolicy";

export type WatchVideoSource = "supabase" | "demo";

export type WatchVideoAuthor = {
  id: string | null;
  name: string;
  username: string;
  avatar: string;
  /** Authoritative follow state for the current viewer (hydrated server-side). */
  isFollowing?: boolean;
};

export type WatchVideo = {
  id: string;
  /** Numeric post id when source is supabase; null for demo. */
  postId: number | null;
  src: string;
  poster?: string;
  title: string;
  caption: string;
  location: { city: string; country: string };
  music: string;
  aiSummary: string;
  translation: string;
  author: WatchVideoAuthor;
  stats: DiscoverStats;
  likedByMe: boolean;
  savedByMe: boolean;
  source: WatchVideoSource;
  /** Pre-publish overlays (text + stickers) rendered over playback. */
  overlays?: VideoOverlayElement[];
  /** Linked published article (teaser video). */
  articleId?: string | null;
  articleTitle?: string | null;
  articleHref?: string | null;
};

export type WatchFeedCursor = {
  createdAt: string;
  id: number;
};

export type WatchFeedPage = {
  videos: WatchVideo[];
  nextCursor: WatchFeedCursor | null;
  usedDemoFallback: boolean;
};

export const WATCH_FEED_PAGE_SIZE = VIDEO_FEED_PAGE_SIZE;
