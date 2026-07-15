import type { SupabaseClient } from "@supabase/supabase-js";
import { formatFollowCountLabel } from "./follows";
import {
  attachPlaybackUrls,
  postColumns,
  type VideoPostRow,
} from "./videoPosts";

/** Initial grid page — not an unbounded history load. */
export const PROFILE_VIDEO_PAGE_SIZE = 24;

export type ProfileContentStats = {
  videoCount: number;
  likesTotal: number;
  viewsTotal: number;
};

export type ProfileContentVideo = {
  postId: number;
  title: string;
  views: number;
  likes: number;
  previewUrl: string | null;
  href: string;
  createdAt: string;
};

export type ProfileContentLiveRoom = {
  roomId: string;
  title: string;
  viewerCount: number;
  city: string;
  country: string;
  status: "live";
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseNonNegInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function gradientForPostId(postId: number): { gradient: string; accent: string } {
  const palettes = [
    { gradient: "from-blue-600/70 via-indigo-700/50 to-[#080816]", accent: "bg-sky-400/40" },
    { gradient: "from-violet-600/60 via-blue-800/40 to-[#080816]", accent: "bg-violet-400/35" },
    { gradient: "from-cyan-700/50 via-slate-800/50 to-[#080816]", accent: "bg-cyan-300/30" },
    { gradient: "from-indigo-700/60 via-fuchsia-900/30 to-[#080816]", accent: "bg-indigo-300/30" },
  ] as const;
  return palettes[Math.abs(postId) % palettes.length]!;
}

function liveGradientForRoomId(roomId: string): string {
  const palettes = [
    "from-red-700/60 via-rose-900/40 to-[#080816]",
    "from-orange-700/50 via-red-900/40 to-[#080816]",
    "from-rose-700/55 via-purple-900/35 to-[#080816]",
  ] as const;
  let hash = 0;
  for (let i = 0; i < roomId.length; i += 1) {
    hash = (hash + roomId.charCodeAt(i) * (i + 1)) % 997;
  }
  return palettes[hash % palettes.length]!;
}

async function loadProfileContentStatsFromTable(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileContentStats> {
  const { data, error } = await supabase
    .from("posts")
    .select("likes, views")
    .eq("user_id", userId)
    .eq("post_type", "video")
    .not("video_path", "is", null);

  if (error) {
    console.error("loadProfileContentStatsFromTable failed:", error);
    return { videoCount: 0, likesTotal: 0, viewsTotal: 0 };
  }

  let likesTotal = 0;
  let viewsTotal = 0;
  for (const row of data ?? []) {
    likesTotal += parseNonNegInt(row.likes);
    viewsTotal += parseNonNegInt(row.views);
  }

  return {
    videoCount: (data ?? []).length,
    likesTotal,
    viewsTotal,
  };
}

function isMissingRpcError(error: { message?: string; code?: string }): boolean {
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
}

/**
 * Authoritative aggregates for a profile's published videos.
 * Likes = sum(posts.likes); Views = sum(posts.views) for video posts with a path.
 */
export async function getProfileContentStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileContentStats> {
  const { data, error } = await supabase.rpc("get_profile_content_stats", {
    p_user_id: userId,
  });

  if (error) {
    if (isMissingRpcError(error)) {
      return loadProfileContentStatsFromTable(supabase, userId);
    }
    console.error("get_profile_content_stats failed:", error);
    return loadProfileContentStatsFromTable(supabase, userId);
  }

  const row = asRecord(data);
  return {
    videoCount: parseNonNegInt(row?.videoCount),
    likesTotal: parseNonNegInt(row?.likesTotal),
    viewsTotal: parseNonNegInt(row?.viewsTotal),
  };
}

/**
 * Published videos owned by the profile (RLS: posts are publicly selectable).
 * Paths never leave the server — only short-lived signed preview URLs.
 */
export async function listProfileVideos(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number }
): Promise<{
  videos: ProfileContentVideo[];
  hasMore: boolean;
}> {
  const limit = Math.min(
    Math.max(options?.limit ?? PROFILE_VIDEO_PAGE_SIZE, 1),
    48
  );

  const { data, error } = await supabase
    .from("posts")
    .select(postColumns)
    .eq("user_id", userId)
    .eq("post_type", "video")
    .not("video_path", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (error) {
    console.error("listProfileVideos failed:", error);
    return { videos: [], hasMore: false };
  }

  const rows = (data ?? []) as VideoPostRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const withUrls = await attachPlaybackUrls(supabase, pageRows);

  const videos: ProfileContentVideo[] = withUrls.map((post) => ({
    postId: post.id,
    title: post.content?.trim() || "Untitled video",
    views: parseNonNegInt(post.views),
    likes: parseNonNegInt(post.likes),
    previewUrl: post.video_url,
    href: `/watch?post=${post.id}`,
    createdAt: post.created_at,
  }));

  return { videos, hasMore };
}

/**
 * Currently live public rooms for this host.
 * Past/ended rooms are not publicly selectable under current RLS — do not invent history.
 */
export async function listProfileActiveLiveRooms(
  supabase: SupabaseClient,
  hostId: string
): Promise<ProfileContentLiveRoom[]> {
  const { data, error } = await supabase
    .from("live_rooms")
    .select("id, title, viewer_count, city, country, status, visibility, host_id")
    .eq("host_id", hostId)
    .eq("status", "live")
    .eq("visibility", "public")
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(6);

  if (error) {
    console.error("listProfileActiveLiveRooms failed:", error);
    return [];
  }

  return (data ?? [])
    .filter((row) => typeof row.id === "string" && row.status === "live")
    .map((row) => ({
      roomId: row.id as string,
      title: (row.title as string)?.trim() || "Live now",
      viewerCount: parseNonNegInt(row.viewer_count),
      city: (row.city as string)?.trim() || "",
      country: (row.country as string)?.trim() || "",
      status: "live" as const,
    }));
}

export function mapContentVideosToProfileVideos(
  videos: ProfileContentVideo[]
): import("../../app/profile/types").ProfileVideo[] {
  return videos.map((video) => {
    const palette = gradientForPostId(video.postId);
    return {
      id: String(video.postId),
      postId: video.postId,
      title: video.title,
      viewsLabel: formatFollowCountLabel(video.views),
      likesLabel: formatFollowCountLabel(video.likes),
      durationLabel: null,
      href: video.href,
      previewUrl: video.previewUrl,
      gradient: palette.gradient,
      accent: palette.accent,
    };
  });
}

export function mapContentLiveToProfileSessions(
  rooms: ProfileContentLiveRoom[]
): import("../../app/profile/types").ProfileLivePreview[] {
  return rooms.map((room) => ({
    streamId: room.roomId,
    title: room.title,
    viewersLabel: formatFollowCountLabel(room.viewerCount),
    city: room.city || "Unknown",
    country: room.country || "World",
    previewGradient: liveGradientForRoomId(room.roomId),
    isLiveNow: true,
  }));
}

export function formatProfileStatLabel(total: number): string {
  return formatFollowCountLabel(total);
}
