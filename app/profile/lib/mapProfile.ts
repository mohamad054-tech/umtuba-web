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
import type { RichProfileBundle } from "../../../lib/supabase/richProfile";
import { formatYearRange } from "../../../lib/supabase/richProfile";
import type { MockProfile, ProfileView } from "../types";

const DEFAULT_AVATAR_GRADIENT = "from-blue-400 to-indigo-600";

function formatJoinedLabel(isoDate: string | null | undefined): string {
  // Keep the English "Joined …" contract out of the serialized profile HTML.
  // Header / About format from `joinedAt` via formatLocalizedJoinedLine.
  void isoDate;
  return "";
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
  contentCards?: import("../../../lib/content/cards").ContentCardViewModel[];
  pinnedContentCards?: import("../../../lib/content/cards").ContentCardViewModel[];
  courses?: import("../types").ProfileCoursePreview[];
  products?: import("../types").ProfileProductPreview[];
  registryFailed?: boolean;
  liveRooms?: ProfileContentLiveRoom[];
  liveFailed?: boolean;
  rich?: RichProfileBundle | null;
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

  const rich = content?.rich ?? null;
  const website = row.website_url?.trim() || "";
  const skillTags =
    rich?.tags.filter((tag) => tag.kind === "skill").map((tag) => tag.label) ??
    [];
  const interestTags =
    rich?.tags
      .filter((tag) => tag.kind === "interest" || tag.kind === "hobby")
      .map((tag) => tag.label) ?? [];
  const languageTags =
    rich?.tags
      .filter((tag) => tag.kind === "language")
      .map((tag) => tag.label) ?? [];
  const workItems =
    rich?.work.map((item) => ({
      title: item.organization
        ? `${item.title} · ${item.organization}`
        : item.title,
      detail: [
        formatYearRange(item.start_year, item.end_year, item.is_current, "Present"),
        item.location_label,
        item.description,
      ]
        .filter(Boolean)
        .join(" · "),
    })) ?? [];
  const educationItems =
    rich?.education.map((item) => ({
      title: item.institution,
      detail: [item.credential, item.field_of_study, item.location_label]
        .filter(Boolean)
        .join(" · "),
    })) ?? [];
  const achievementTitles =
    rich?.milestones
      .filter((item) => item.category === "achievement")
      .map((item) => item.title) ?? [];
  const linkItems =
    rich?.links.map((item) => ({ label: item.label, href: item.url })) ?? [];

  return {
    source: "supabase",
    id: row.id,
    username: row.username,
    displayName,
    bio: row.bio?.trim() || "",
    bioLong: row.bio_long?.trim() || "",
    city: row.city?.trim() || "",
    country: row.country?.trim() || "",
    avatarInitial:
      row.avatar_initial || displayName.charAt(0).toUpperCase() || "U",
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url ?? null,
    rich: rich ?? undefined,
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
    contentCards: content?.contentCards ?? [],
    pinnedContentCards: content?.pinnedContentCards ?? [],
    courses: content?.courses ?? [],
    products: content?.products ?? [],
    registryLoadFailed: Boolean(content?.registryFailed),
    liveSessions,
    hasMoreVideos: Boolean(content?.hasMoreVideos),
    videosLoadFailed: Boolean(content?.videosFailed),
    postsLoadFailed: Boolean(content?.postsFailed),
    articlesLoadFailed: Boolean(content?.articlesFailed),
    statsLoadFailed: statsFailed || followFailed,
    liveLoadFailed: Boolean(content?.liveFailed),
    joinedAt: row.created_at ?? null,
    about: {
      joinedLabel: formatJoinedLabel(row.created_at),
      website: website || undefined,
      interests: interestTags,
      specialties: [...skillTags, ...languageTags],
      experience: workItems.length > 0 ? workItems : undefined,
      education: educationItems.length > 0 ? educationItems : undefined,
      achievements: achievementTitles.length > 0 ? achievementTitles : undefined,
      links: linkItems.length > 0 ? linkItems : undefined,
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
    contentCards: profile.contentCards ?? [],
    pinnedContentCards: profile.pinnedContentCards ?? [],
    courses: profile.courses ?? [],
    products: profile.products ?? [],
    liveSessions: profile.liveSessions,
    about: profile.about,
  };
}
