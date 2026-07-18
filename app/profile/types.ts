import type { ActivityTierProgress } from "../../lib/activity-tiers";

export type ProfileVideo = {
  id: string;
  /** Numeric posts.id for Watch deep-link. */
  postId?: number;
  title: string;
  viewsLabel: string;
  likesLabel?: string;
  /** Null when duration is unknown — UI must not invent one. */
  durationLabel: string | null;
  href?: string;
  previewUrl?: string | null;
  gradient: string;
  accent: string;
};

export type ProfileLivePreview = {
  streamId: string;
  title: string;
  viewersLabel: string;
  city: string;
  country: string;
  previewGradient: string;
  isLiveNow?: boolean;
};

export type ProfileAbout = {
  joinedLabel: string;
  website?: string;
  interests: string[];
};

/** Local mock profile shape used only as a development fallback. */
export type MockProfile = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  city: string;
  country: string;
  avatarInitial: string;
  avatarGradient: string;
  followersLabel: string;
  followingLabel: string;
  likesLabel: string;
  viewsLabel?: string;
  isLive: boolean;
  liveStreamId?: string;
  isFollowing?: boolean;
  videos: ProfileVideo[];
  liveSessions: ProfileLivePreview[];
  about: ProfileAbout;
};

/** Unified view model for real Supabase profiles and development mocks. */
export type ProfileView = {
  source: "supabase" | "mock";
  id: string;
  username: string;
  displayName: string;
  bio: string;
  city: string;
  country: string;
  avatarInitial: string;
  avatarUrl: string | null;
  avatarGradient: string;
  followersLabel: string;
  followingLabel: string;
  likesLabel: string;
  viewsLabel: string;
  /** Total published videos (may exceed videos[] page length). */
  videoTotalCount: number;
  isLive: boolean;
  liveStreamId?: string;
  isFollowing?: boolean;
  videos: ProfileVideo[];
  liveSessions: ProfileLivePreview[];
  about: ProfileAbout;
  /** Authentic activity tier — separate from UM Points wallet. */
  activityTier?: ActivityTierProgress | null;
  /** True when more videos exist beyond the initial page. */
  hasMoreVideos?: boolean;
  /** True when video list fetch failed (not an empty catalog). */
  videosLoadFailed?: boolean;
  /** True when follow/stats aggregates failed. */
  statsLoadFailed?: boolean;
  /** True when live rooms fetch failed. */
  liveLoadFailed?: boolean;
};
