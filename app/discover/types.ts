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
  stats: DiscoverStats;
  likedByMe: boolean;
  savedByMe: boolean;
};
