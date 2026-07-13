export type ProfileVideo = {
  id: string;
  title: string;
  viewsLabel: string;
  durationLabel: string;
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
  isLive: boolean;
  liveStreamId?: string;
  isFollowing?: boolean;
  videos: ProfileVideo[];
  liveSessions: ProfileLivePreview[];
  about: ProfileAbout;
};
