import type { ProfileRow } from "../../../lib/supabase/database.types";
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

export function profileRowToView(row: ProfileRow): ProfileView {
  const displayName =
    (row.display_name && row.display_name.trim()) ||
    (row.full_name && row.full_name.trim()) ||
    row.username;

  return {
    source: "supabase",
    id: row.id,
    username: row.username,
    displayName,
    bio: row.bio?.trim() || "",
    city: row.city?.trim() || "",
    country: row.country?.trim() || "",
    avatarInitial: row.avatar_initial || displayName.charAt(0).toUpperCase() || "U",
    avatarUrl: row.avatar_url,
    avatarGradient: DEFAULT_AVATAR_GRADIENT,
    followersLabel: "—",
    followingLabel: "—",
    likesLabel: "—",
    isLive: false,
    videos: [],
    liveSessions: [],
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
    isLive: profile.isLive,
    liveStreamId: profile.liveStreamId,
    isFollowing: profile.isFollowing,
    videos: profile.videos,
    liveSessions: profile.liveSessions,
    about: profile.about,
  };
}
