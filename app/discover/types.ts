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

export type DiscoverVideo = {
  id: string;
  src: string;
  poster?: string;
  caption: string;
  hashtags: string[];
  location: DiscoverLocation;
  creator: DiscoverCreator;
  stats: DiscoverStats;
  likedByMe: boolean;
  savedByMe: boolean;
};
