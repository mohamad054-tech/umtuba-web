export type DiscoverCreator = {
  /** Auth user UUID for messaging; null when the peer has no real user id. */
  id: string | null;
  name: string;
  username: string;
  avatar: string;
  isFollowing?: boolean;
};

export type DiscoverLocation = {
  city: string;
  country: string;
};

/**
 * Optional real destination attached to a post.
 * Present only when the post payload includes a place, course, or product.
 * Not inferred from the placeholder location written in the video mapper.
 */
export type DiscoverFeedLink =
  | { kind: "place"; city: string }
  | { kind: "course"; title: string; href: string }
  | { kind: "product"; title: string; href: string };

export type DiscoverStats = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
};

import type { VideoOverlayElement } from "../../lib/media/videoOverlays";

export type DiscoverVideo = {
  id: string;
  src: string;
  poster?: string;
  /** Pre-publish overlays (text + stickers) rendered over playback. */
  overlays?: VideoOverlayElement[];
  /** Short title shown on the card (article title when teaser). */
  title: string;
  caption: string;
  hashtags: string[];
  location: DiscoverLocation;
  creator: DiscoverCreator;
  /** Set when this clip is an Article Teaser. */
  articleId?: string | null;
  articleTitle?: string | null;
  articleHref?: string | null;
  /**
   * Place, course, or product chip. Null until posts carry those fields.
   * Do not fill this from the placeholder location.
   */
  link?: DiscoverFeedLink | null;
  stats: DiscoverStats;
  likedByMe: boolean;
  savedByMe: boolean;
  /** Owner-only: taken-down post still shown with a removed state. */
  removed?: boolean;
};
