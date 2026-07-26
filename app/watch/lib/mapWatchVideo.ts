import type { DiscoverVideo } from "../../discover/types";
import type { DemoVideo } from "../../data/videos";
import type { WatchVideo } from "../types";

function titleFromCaption(caption: string): string {
  const line = caption.trim().split(/\r?\n/)[0] ?? "";
  if (!line) return "Untitled video";
  return line.length > 72 ? `${line.slice(0, 69)}…` : line;
}

export function discoverVideoToWatchVideo(video: DiscoverVideo): WatchVideo {
  const postId = Number(video.id);
  return {
    id: video.id,
    postId: Number.isInteger(postId) && postId > 0 ? postId : null,
    src: video.src,
    poster: video.poster,
    title: video.title || titleFromCaption(video.caption),
    caption: video.caption,
    location: video.location,
    music: "Original sound · UMTUBA",
    aiSummary: "Watch how this post travels — open Post Journey for live reach.",
    translation: "Open AI panel",
    author: {
      id: video.creator.id,
      name: video.creator.name,
      username: video.creator.username,
      avatar: video.creator.avatar,
      isFollowing: Boolean(video.creator.isFollowing),
    },
    stats: { ...video.stats },
    likedByMe: video.likedByMe,
    savedByMe: video.savedByMe,
    source: "supabase",
  };
}

export function demoVideoToWatchVideo(video: DemoVideo): WatchVideo {
  return {
    id: video.id,
    postId: null,
    src: video.src,
    poster: video.poster,
    title: video.title,
    caption: video.caption,
    location: video.location,
    music: video.music,
    aiSummary: video.aiSummary,
    translation: video.translation,
    author: {
      id: null,
      name: video.author.name,
      username: video.author.username,
      avatar: video.author.avatar,
    },
    stats: {
      likes: video.demoStats.likes,
      comments: video.demoStats.comments,
      shares: video.demoStats.shares,
      saves: video.demoStats.saves,
      views: 0,
    },
    likedByMe: false,
    savedByMe: false,
    source: "demo",
  };
}

export function findWatchVideoIndex(
  videos: WatchVideo[],
  postOrId: string | null | undefined
): number {
  if (!postOrId) return 0;
  const key = postOrId.trim();
  if (!key) return 0;

  const byId = videos.findIndex((video) => video.id === key);
  if (byId >= 0) return byId;

  const asNumber = Number(key);
  if (Number.isInteger(asNumber) && asNumber > 0) {
    const byPost = videos.findIndex((video) => video.postId === asNumber);
    if (byPost >= 0) return byPost;
  }

  return 0;
}

export function encodeWatchFeedCursor(cursor: {
  createdAt: string;
  id: number;
}): string {
  const json = JSON.stringify({ createdAt: cursor.createdAt, id: cursor.id });
  if (typeof Buffer !== "undefined") {
    return Buffer.from(json, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeWatchFeedCursor(
  raw: string | null | undefined
): { createdAt: string; id: number } | null {
  if (!raw?.trim()) return null;
  try {
    let json: string;
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(raw.trim(), "base64url").toString("utf8");
    } else {
      const padded = raw.trim().replace(/-/g, "+").replace(/_/g, "/");
      const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
      const binary = atob(padded + pad);
      const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      json = new TextDecoder().decode(bytes);
    }
    const parsed = JSON.parse(json) as { createdAt?: unknown; id?: unknown };
    if (
      typeof parsed.createdAt === "string" &&
      typeof parsed.id === "number" &&
      Number.isInteger(parsed.id) &&
      parsed.id > 0
    ) {
      return { createdAt: parsed.createdAt, id: parsed.id };
    }
  } catch {
    // ignore
  }
  return null;
}
