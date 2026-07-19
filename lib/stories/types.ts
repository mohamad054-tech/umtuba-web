export type StoryMediaType = "image" | "video";

export type StoryRow = {
  id: string;
  owner_id: string;
  media_path: string;
  media_type: StoryMediaType;
  caption: string | null;
  created_at: string;
  expires_at: string;
};

export type StoryOwnerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  avatar_initial: string;
};

export type StoryItem = {
  id: string;
  ownerId: string;
  mediaType: StoryMediaType;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  /** Short-lived signed URL for playback (may be null until minted). */
  mediaUrl: string | null;
  owner: StoryOwnerProfile;
  /** True when the current viewer has a story_views row for this story. */
  viewedByMe: boolean;
  /** Present for owner rail/viewer context. */
  viewCount?: number;
};

/** One rail cell = one owner with one or more active stories. */
export type StoryRailGroup = {
  ownerId: string;
  owner: StoryOwnerProfile;
  stories: StoryItem[];
  /** True when at least one story in the group is unread by the viewer. */
  hasUnread: boolean;
  /** Latest story created_at in the group (ISO). */
  latestCreatedAt: string;
  isOwn: boolean;
};

export type StoryViewerRow = {
  viewerId: string;
  firstViewedAt: string;
  lastViewedAt: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  avatarInitial: string;
};

export type CreateStoryInput = {
  mediaPath: string;
  mediaType: StoryMediaType;
  caption?: string | null;
  mimeType: string;
  byteSize: number;
};
