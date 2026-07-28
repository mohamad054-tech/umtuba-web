import type { ActivityTierProgress } from "../../lib/activity-tiers";
import type { ContentCardViewModel } from "../../lib/content/cards";

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

/** Live tab bucket (Creator Space §13) — structure readiness only. */
export type ProfileLiveBucket = "now" | "upcoming" | "past";

export type ProfileLivePreview = {
  streamId: string;
  title: string;
  viewersLabel: string;
  city: string;
  country: string;
  previewGradient: string;
  isLiveNow?: boolean;
  /** Explicit Now / Upcoming / Past; when omitted, derived from isLiveNow / profile.isLive. */
  bucket?: ProfileLiveBucket;
  /** Optional schedule copy for Upcoming structure (no scheduling backend). */
  scheduledLabel?: string;
};

export type ProfileAboutExperience = {
  title: string;
  detail?: string;
};

export type ProfileAboutEducation = {
  title: string;
  detail?: string;
};

export type ProfileAboutLink = {
  label: string;
  href: string;
};

/** About tab structure (Creator Space §9) — optional fields omit when empty. */
export type ProfileAbout = {
  joinedLabel: string;
  website?: string;
  interests: string[];
  specialties?: string[];
  experience?: ProfileAboutExperience[];
  education?: ProfileAboutEducation[];
  achievements?: string[];
  links?: ProfileAboutLink[];
};

export type ProfileArticle = {
  id: string;
  title: string;
  excerpt: string;
  href: string;
  publishedAt: string | null;
};

export type ProfilePost = {
  id: number;
  postType: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
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
  /** Optional All-tab cards for mock/dev structure demos. */
  contentCards?: ContentCardViewModel[];
  /** Explicit pins (1–3 soft cap) — structure readiness only. */
  pinnedContentCards?: ContentCardViewModel[];
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
  posts: ProfilePost[];
  articles: ProfileArticle[];
  liveSessions: ProfileLivePreview[];
  about: ProfileAbout;
  /** Authentic activity tier — separate from UM Points wallet. */
  activityTier?: ActivityTierProgress | null;
  /** True when more videos exist beyond the initial page. */
  hasMoreVideos?: boolean;
  /** True when video list fetch failed (not an empty catalog). */
  videosLoadFailed?: boolean;
  postsLoadFailed?: boolean;
  articlesLoadFailed?: boolean;
  /** Unified Content Foundation — Profile All feed from registry. */
  registryItems?: import("../../lib/content/contentRegistry").ProfileContentCard[];
  /** Creator Space V1 presentation cards derived from content projections. */
  contentCards?: ContentCardViewModel[];
  /**
   * Pinned Content Structure V1 — optional explicit pins (soft cap 1–3).
   * No persistence; empty → rail hidden. Chronology excludes these ids.
   */
  pinnedContentCards?: ContentCardViewModel[];
  registryLoadFailed?: boolean;
  /** True when follow/stats aggregates failed. */
  statsLoadFailed?: boolean;
  /** True when live rooms fetch failed. */
  liveLoadFailed?: boolean;
};
