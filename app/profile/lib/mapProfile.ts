import type { ProfileRow } from "../../../lib/supabase/database.types";
import {
  formatFollowCountLabel,
  type FollowSnapshot,
} from "../../../lib/supabase/follows";
import {
  formatProfileStatLabel,
  mapContentLiveToProfileSessions,
  mapContentVideosToProfileVideos,
  type ProfileContentLiveRoom,
  type ProfileContentStats,
  type ProfileContentVideo,
} from "../../../lib/supabase/profileContent";
import type { MockProfile, ProfileView } from "../types";

const DEFAULT_AVATAR_GRADIENT = "from-blue-400 to-indigo-600";

function formatJoinedLabel(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "Joined recently";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "Joined recently";
  }

  return `Joined ${date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

export type ProfileContentBundle = {
  follow?: FollowSnapshot | null;
  followFailed?: boolean;
  stats?: ProfileContentStats | null;
  statsFailed?: boolean;
  videos?: ProfileContentVideo[];
  videosFailed?: boolean;
  hasMoreVideos?: boolean;
  posts?: import("../types").ProfilePost[];
  postsFailed?: boolean;
  articles?: import("../types").ProfileArticle[];
  articlesFailed?: boolean;
  registryItems?: import("../../../lib/content/contentRegistry").ProfileContentCard[];
  registryFailed?: boolean;
  liveRooms?: ProfileContentLiveRoom[];
  liveFailed?: boolean;
};

export function profileRowToView(
  row: ProfileRow,
  content?: ProfileContentBundle | null
): ProfileView {
  const displayName =
    (row.display_name && row.display_name.trim()) ||
    (row.full_name && row.full_name.trim()) ||
    row.username;

  const follow = content?.follow ?? null;
  const stats = content?.stats ?? null;
  const liveRooms = content?.liveRooms ?? [];
  const videos = mapContentVideosToProfileVideos(content?.videos ?? []);
  const liveSessions = mapContentLiveToProfileSessions(liveRooms);
  const activeLive = liveRooms[0];
  const statsFailed = Boolean(content?.statsFailed);
  const followFailed = Boolean(content?.followFailed);

  const videoTotalCount = stats
    ? stats.videoCount
    : Math.max(videos.length, 0);

  return {
    source: "supabase",
    id: row.id,
    username: row.username,
    displayName,
    bio: row.bio?.trim() || "",
    city: row.city?.trim() || "",
    country: row.country?.trim() || "",
    avatarInitial:
      row.avatar_initial || displayName.charAt(0).toUpperCase() || "U",
    avatarUrl: row.avatar_url,
    avatarGradient: DEFAULT_AVATAR_GRADIENT,
    followersLabel: follow
      ? formatFollowCountLabel(follow.followersCount)
      : followFailed
        ? "—"
        : "0",
    followingLabel: follow
      ? formatFollowCountLabel(follow.followingCount)
      : followFailed
        ? "—"
        : "0",
    likesLabel: stats
      ? formatProfileStatLabel(stats.likesTotal)
      : statsFailed
        ? "—"
        : "0",
    viewsLabel: stats
      ? formatProfileStatLabel(stats.viewsTotal)
      : statsFailed
        ? "—"
        : "0",
    videoTotalCount,
    isFollowing: Boolean(follow?.following),
    isLive: Boolean(activeLive),
    liveStreamId: activeLive?.roomId,
    videos,
    posts: content?.posts ?? [],
    articles: content?.articles ?? [],
    registryItems: content?.registryItems ?? [],
    registryLoadFailed: Boolean(content?.registryFailed),
    liveSessions,
    hasMoreVideos: Boolean(content?.hasMoreVideos),
    videosLoadFailed: Boolean(content?.videosFailed),
    postsLoadFailed: Boolean(content?.postsFailed),
    articlesLoadFailed: Boolean(content?.articlesFailed),
    statsLoadFailed: statsFailed || followFailed,
    liveLoadFailed: Boolean(content?.liveFailed),
    about: {
      joinedLabel: formatJoinedLabel(row.created_at),
      interests: [],
    },
  };
}

export function mockProfileToView(profile: MockProfile): ProfileView {
  return {
    source: "mock",
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    city: profile.city,
    country: profile.country,
    avatarInitial: profile.avatarInitial,
    avatarUrl: null,
    avatarGradient: profile.avatarGradient,
    followersLabel: profile.followersLabel,
    followingLabel: profile.followingLabel,
    likesLabel: profile.likesLabel,
    viewsLabel: profile.viewsLabel ?? "0",
    videoTotalCount: profile.videos.length,
    isLive: profile.isLive,
    liveStreamId: profile.liveStreamId,
    isFollowing: profile.isFollowing,
    videos: profile.videos.map((video) => ({
      ...video,
      durationLabel: video.durationLabel ?? null,
      href: video.href,
    })),
    posts: [],
    articles: [],
    registryItems: [],
    liveSessions: profile.liveSessions,
    about: profile.about,
  };
}
