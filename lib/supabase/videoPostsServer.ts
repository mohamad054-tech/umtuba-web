import type { DiscoverVideo } from "../../app/discover/types";
import {
  VIDEO_FEED_PAGE_MAX,
  VIDEO_FEED_PAGE_SIZE,
} from "../../app/lib/video/feedPolicy";
import {
  decodeWatchFeedCursor,
  discoverVideoToWatchVideo,
  encodeWatchFeedCursor,
} from "../../app/watch/lib/mapWatchVideo";
import type { WatchFeedPage } from "../../app/watch/types";
import { WATCH_FEED_PAGE_SIZE } from "../../app/watch/types";
import {
  applyFollowingToDiscoverVideos,
  loadViewerFollowingSet,
} from "./follows";
import { createClient, getServerUser } from "./server";
import { loadViewerInteractionState } from "./socialInteractions";
import { listArticleTitlesByIds } from "../articles/articlesFoundation";
import {
  applyViewerStateToPosts,
  attachPlaybackUrls,
  createVideoSignedUrl,
  enrichAuthorIdentityFromProfiles,
  enrichAuthorUserIdsFromProfiles,
  isMissingArticleIdColumnError,
  mapVideoPostToDiscover,
  postColumns,
  postColumnsWithoutArticle,
  type PublicPostDTO,
  type VideoPostRow,
} from "./videoPosts";
import { isPubliclyVisibleMedia } from "../media/pipelineTypes";

export type DiscoverVideosResult =
  | {
      ok: true;
      videos: DiscoverVideo[];
      nextCursor: { createdAt: string; id: number } | null;
    }
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

export type CanonicalVideoFeedPage = {
  videos: DiscoverVideo[];
  nextCursor: { createdAt: string; id: number } | null;
};

/**
 * Canonical video feed page used by Discover and Watch.
 * - Same RLS filters, signed URLs, viewer like/save state, and follow hydration.
 * - Never exposes storage paths.
 */
export async function loadCanonicalVideoFeedPage(input?: {
  cursor?: string | null;
  limit?: number;
  focusPostId?: number | null;
}): Promise<
  | { ok: true; page: CanonicalVideoFeedPage }
  | { ok: false; message: string }
> {
  try {
    const supabase = await createClient();
    const user = await getServerUser();
    const limit = Math.min(
      Math.max(input?.limit ?? VIDEO_FEED_PAGE_SIZE, 1),
      VIDEO_FEED_PAGE_MAX
    );
    const cursor = decodeWatchFeedCursor(input?.cursor ?? null);

    const buildFeedQuery = (columns: string) => {
      let query = supabase
        .from("posts")
        .select(columns)
        .eq("post_type", "video")
        .eq("media_status", "ready")
        .not("video_path", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);
      if (cursor) {
        query = query.or(
          `and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id}),created_at.lt.${cursor.createdAt}`
        );
      }
      return query;
    };

    let { data, error } = await buildFeedQuery(postColumns);
    let useArticleColumn = true;

    // Home feed stays up before articles migration is applied (Git-only until GO).
    if (error && isMissingArticleIdColumnError(error)) {
      useArticleColumn = false;
      ({ data, error } = await buildFeedQuery(postColumnsWithoutArticle));
    }

    if (error) {
      console.error("Unable to load video feed:", error);
      return {
        ok: false,
        message: "Unable to load videos. Please try again.",
      };
    }

    let rows = (data ?? []) as unknown as VideoPostRow[];

    if (!cursor && input?.focusPostId && input.focusPostId > 0) {
      const focusedInPage = rows.some((row) => row.id === input.focusPostId);
      if (!focusedInPage) {
        const focusSelect = useArticleColumn
          ? postColumns
          : postColumnsWithoutArticle;
        const { data: focused } = await supabase
          .from("posts")
          .select(focusSelect)
          .eq("id", input.focusPostId)
          .eq("post_type", "video")
          .eq("media_status", "ready")
          .not("video_path", "is", null)
          .maybeSingle();
        if (focused) {
          rows = [focused as unknown as VideoPostRow, ...rows];
        }
      }
    }

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const withUrls = await attachPlaybackUrls(supabase, pageRows);
    const withAuthorIds = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const withAuthors = await enrichAuthorIdentityFromProfiles(
      supabase,
      withAuthorIds
    );
    const viewerState = await loadViewerInteractionState(
      supabase,
      user?.id,
      withAuthors.map((post) => post.id)
    );
    let posts = applyViewerStateToPosts(withAuthors, viewerState);
    const articleIds = posts
      .map((post) => post.article_id)
      .filter((id): id is string => Boolean(id));
    if (articleIds.length > 0) {
      const titles = await listArticleTitlesByIds(supabase, articleIds);
      posts = posts.map((post) =>
        post.article_id && titles.has(post.article_id)
          ? { ...post, article_title: titles.get(post.article_id) ?? null }
          : post
      );
    }
    let videos = posts
      .map(mapVideoPostToDiscover)
      .filter((video): video is DiscoverVideo => video !== null);

    const followingSet = await loadViewerFollowingSet(
      supabase,
      user?.id,
      videos
        .map((video) => video.creator.id)
        .filter((id): id is string => Boolean(id))
    );
    videos = applyFollowingToDiscoverVideos(videos, followingSet);

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? { createdAt: lastRow.created_at, id: lastRow.id }
        : null;

    return {
      ok: true,
      page: { videos, nextCursor },
    };
  } catch (error) {
    console.error("loadCanonicalVideoFeedPage failed:", error);
    return {
      ok: false,
      message: "Unable to load videos. Please try again.",
    };
  }
}

/**
 * Discover first page (bounded). Same interaction/follow truth as Watch.
 */
export async function getDiscoverVideosServer(input?: {
  focusPostId?: number | null;
  limit?: number;
}): Promise<DiscoverVideosResult> {
  const result = await loadCanonicalVideoFeedPage({
    focusPostId: input?.focusPostId,
    limit: input?.limit ?? VIDEO_FEED_PAGE_SIZE,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: "Unable to load discover videos. Please try again.",
    };
  }

  return {
    ok: true,
    videos: result.page.videos,
    nextCursor: result.page.nextCursor,
  };
}

/**
 * Paginated Watch feed — maps canonical DiscoverVideo → WatchVideo.
 */
export async function getWatchVideosPageServer(input?: {
  cursor?: string | null;
  limit?: number;
  focusPostId?: number | null;
}): Promise<WatchVideosPageResult> {
  const result = await loadCanonicalVideoFeedPage({
    cursor: input?.cursor,
    limit: input?.limit ?? WATCH_FEED_PAGE_SIZE,
    focusPostId: input?.focusPostId,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: "Unable to load the Watch feed. Please try again.",
    };
  }

  return {
    ok: true,
    page: {
      videos: result.page.videos.map(discoverVideoToWatchVideo),
      nextCursor: result.page.nextCursor,
      usedDemoFallback: false,
    },
  };
}

/** Remint a short-lived signed URL for an existing published video post. */
export async function refreshWatchPlaybackUrlServer(
  postId: number
): Promise<WatchPlaybackUrlResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("posts")
      .select("id, video_path, video_url, post_type, media_status")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      return { ok: false, message: "Unable to refresh playback." };
    }

    if (!data) {
      return { ok: false, message: "This video was deleted.", deleted: true };
    }

    if (data.post_type === "video" && data.media_status && data.media_status !== "ready") {
      return { ok: false, message: "This video is still processing.", deleted: false };
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
 * Legacy /feed surface — not the Discover/Watch canonical path.
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

    const rows = ((data ?? []) as VideoPostRow[]).filter((row) => {
      if (row.post_type !== "video") {
        return true;
      }
      return isPubliclyVisibleMedia({
        postType: row.post_type,
        mediaStatus: row.media_status,
        videoPath: row.video_path,
      });
    });
    const withUrls = await attachPlaybackUrls(supabase, rows);
    const withAuthorIds = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const withAuthors = await enrichAuthorIdentityFromProfiles(
      supabase,
      withAuthorIds
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
