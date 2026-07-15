import type { DiscoverVideo } from "../../app/discover/types";
import {
  decodeWatchFeedCursor,
  discoverVideoToWatchVideo,
  encodeWatchFeedCursor,
} from "../../app/watch/lib/mapWatchVideo";
import type { WatchFeedPage, WatchVideo } from "../../app/watch/types";
import { WATCH_FEED_PAGE_SIZE } from "../../app/watch/types";
import { createClient, getServerUser } from "./server";
import { loadViewerInteractionState } from "./socialInteractions";
import {
  applyViewerStateToPosts,
  attachPlaybackUrls,
  createVideoSignedUrl,
  enrichAuthorUserIdsFromProfiles,
  mapVideoPostToDiscover,
  postColumns,
  type PublicPostDTO,
  type VideoPostRow,
} from "./videoPosts";

export type DiscoverVideosResult =
  | { ok: true; videos: DiscoverVideo[] }
  | { ok: false; message: string };

export type FeedPostsResult =
  | { ok: true; posts: PublicPostDTO[] }
  | { ok: false; message: string };

export type WatchVideosPageResult =
  | { ok: true; page: WatchFeedPage }
  | { ok: false; message: string };

export type WatchPlaybackUrlResult =
  | { ok: true; src: string }
  | { ok: false; message: string; deleted?: boolean };

/**
 * Server-side Discover feed: posts RLS + short-lived signed playback URLs.
 * Storage paths are never returned to the client.
 */
export async function getDiscoverVideosServer(): Promise<DiscoverVideosResult> {
  try {
    const supabase = await createClient();
    const user = await getServerUser();

    const { data, error } = await supabase
      .from("posts")
      .select(postColumns)
      .eq("post_type", "video")
      .not("video_path", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load discover videos:", error);
      return {
        ok: false,
        message: "Unable to load discover videos. Please try again.",
      };
    }

    const rows = (data ?? []) as VideoPostRow[];
    const withUrls = await attachPlaybackUrls(supabase, rows);
    const withAuthors = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const viewerState = await loadViewerInteractionState(
      supabase,
      user?.id,
      withAuthors.map((post) => post.id)
    );
    const posts = applyViewerStateToPosts(withAuthors, viewerState);
    const videos = posts
      .map(mapVideoPostToDiscover)
      .filter((video): video is DiscoverVideo => video !== null);

    return { ok: true, videos };
  } catch (error) {
    console.error("getDiscoverVideosServer failed:", error);
    return {
      ok: false,
      message: "Unable to load discover videos. Please try again.",
    };
  }
}

/**
 * Paginated Watch feed of published video posts with signed playback URLs.
 * Never exposes storage paths. Cursor is opaque (created_at + id).
 */
export async function getWatchVideosPageServer(input?: {
  cursor?: string | null;
  limit?: number;
  focusPostId?: number | null;
}): Promise<WatchVideosPageResult> {
  try {
    const supabase = await createClient();
    const user = await getServerUser();
    const limit = Math.min(
      Math.max(input?.limit ?? WATCH_FEED_PAGE_SIZE, 1),
      30
    );
    const cursor = decodeWatchFeedCursor(input?.cursor ?? null);

    let query = supabase
      .from("posts")
      .select(postColumns)
      .eq("post_type", "video")
      .not("video_path", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.or(
        `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}),created_at.lt.${cursor.createdAt}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("Unable to load watch videos:", error);
      return {
        ok: false,
        message: "Unable to load the Watch feed. Please try again.",
      };
    }

    let rows = (data ?? []) as VideoPostRow[];

    if (!cursor && input?.focusPostId && input.focusPostId > 0) {
      const focusedInPage = rows.some((row) => row.id === input.focusPostId);
      if (!focusedInPage) {
        const { data: focused } = await supabase
          .from("posts")
          .select(postColumns)
          .eq("id", input.focusPostId)
          .eq("post_type", "video")
          .not("video_path", "is", null)
          .maybeSingle();
        if (focused) {
          rows = [focused as VideoPostRow, ...rows];
        }
      }
    }

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const withUrls = await attachPlaybackUrls(supabase, pageRows);
    const withAuthors = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const viewerState = await loadViewerInteractionState(
      supabase,
      user?.id,
      withAuthors.map((post) => post.id)
    );
    const posts = applyViewerStateToPosts(withAuthors, viewerState);
    const videos: WatchVideo[] = posts
      .map(mapVideoPostToDiscover)
      .filter((video): video is DiscoverVideo => video !== null)
      .map(discoverVideoToWatchVideo);

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null;

    return {
      ok: true,
      page: {
        videos,
        nextCursor,
        usedDemoFallback: false,
      },
    };
  } catch (error) {
    console.error("getWatchVideosPageServer failed:", error);
    return {
      ok: false,
      message: "Unable to load the Watch feed. Please try again.",
    };
  }
}

/** Remint a short-lived signed URL for an existing published video post. */
export async function refreshWatchPlaybackUrlServer(
  postId: number
): Promise<WatchPlaybackUrlResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, video_path, video_url, post_type")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      return { ok: false, message: "Unable to refresh playback." };
    }

    if (!data) {
      return { ok: false, message: "This video was deleted.", deleted: true };
    }

    const path =
      typeof data.video_path === "string" ? data.video_path.trim() : "";
    if (path) {
      const signed = await createVideoSignedUrl(supabase, path);
      if (!signed) {
        return { ok: false, message: "Playback link expired. Try again." };
      }
      return { ok: true, src: signed };
    }

    const legacy =
      typeof data.video_url === "string" ? data.video_url.trim() : "";
    if (legacy.startsWith("http://") || legacy.startsWith("https://")) {
      return { ok: true, src: legacy };
    }

    return { ok: false, message: "This video is unavailable.", deleted: true };
  } catch (error) {
    console.error("refreshWatchPlaybackUrlServer failed:", error);
    return { ok: false, message: "Unable to refresh playback." };
  }
}

export function encodeWatchPageCursor(
  cursor: { createdAt: string; id: number } | null
): string | null {
  if (!cursor) return null;
  return encodeWatchFeedCursor(cursor);
}

/**
 * Server-side feed posts with signed video URLs (no storage paths exposed).
 */
export async function getFeedPostsServer(): Promise<FeedPostsResult> {
  try {
    const supabase = await createClient();
    const user = await getServerUser();

    const { data, error } = await supabase
      .from("posts")
      .select(postColumns)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Unable to load feed posts:", error);
      return {
        ok: false,
        message: "Unable to load posts. Please try again.",
      };
    }

    const rows = (data ?? []) as VideoPostRow[];
    const withUrls = await attachPlaybackUrls(supabase, rows);
    const withAuthors = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const viewerState = await loadViewerInteractionState(
      supabase,
      user?.id,
      withAuthors.map((post) => post.id)
    );
    const posts = applyViewerStateToPosts(withAuthors, viewerState);

    return { ok: true, posts };
  } catch (error) {
    console.error("getFeedPostsServer failed:", error);
    return {
      ok: false,
      message: "Unable to load posts. Please try again.",
    };
  }
}
