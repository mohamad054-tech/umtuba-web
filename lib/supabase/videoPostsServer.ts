import type { DiscoverVideo } from "../../app/discover/types";
import {
  VIDEO_FEED_PAGE_MAX,
  VIDEO_FEED_PAGE_SIZE,
} from "../../app/lib/video/feedPolicy";
import {
  firstPlayableVideoSignIndexes,
  resolveWatchSignIndexes,
  type WatchSignPolicy,
} from "../../app/lib/video/playbackFetchPolicy";
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
import {
  applyViewerVisibility,
  isPostVisibleToViewer,
  postsSelectVisible,
} from "./postVisibility";
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
import { loadRecentWatchCompletions } from "./watchCompletions";
import {
  MIN_UNWATCHED_FEED,
  recentHiddenPostIds,
  sanitizeWatchHideEntries,
  type WatchHideEntry,
} from "../video/watchHidePolicy";

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

export type LifePostResult =
  | { ok: true; post: PublicPostDTO }
  | { ok: false; message: string; notFound?: boolean };

const LIFE_CANONICAL_POST_TYPES = ["text", "image", "video"] as const;
const LIFE_FEED_LIMIT = 50;

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
  signPolicy?: WatchSignPolicy;
  guestWatched?: WatchHideEntry[] | null;
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
    const hideEntries = sanitizeWatchHideEntries([
      ...(input?.guestWatched ?? []),
      ...(await loadRecentWatchCompletions(supabase, user?.id)),
    ]);
    const hiddenIds = recentHiddenPostIds(hideEntries);
    const keepPostId =
      input?.focusPostId && input.focusPostId > 0 ? input.focusPostId : null;
    const fetchLimit = Math.min(
      limit + 1 + Math.min(hiddenIds.size, 40),
      80
    );

    const buildFeedQuery = (
      columns: string,
      pageCursor: { createdAt: string; id: number } | null,
      take: number
    ) => {
      let query = supabase
        .from("posts")
        .select(postsSelectVisible(columns))
        .eq("post_type", "video")
        .eq("media_status", "ready")
        .not("video_path", "is", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(take);
      if (pageCursor) {
        query = query.or(
          `and(created_at.eq.${pageCursor.createdAt},id.lt.${pageCursor.id}),created_at.lt.${pageCursor.createdAt}`
        );
      }
      return applyViewerVisibility(query, user?.id);
    };

    let { data, error } = await buildFeedQuery(postColumns, cursor, fetchLimit);
    let useArticleColumn = true;

    // Home feed stays up before articles migration is applied (Git-only until GO).
    if (error && isMissingArticleIdColumnError(error)) {
      useArticleColumn = false;
      ({ data, error } = await buildFeedQuery(
        postColumnsWithoutArticle,
        cursor,
        fetchLimit
      ));
    }

    if (error) {
      console.error(
        "Unable to load video feed:",
        `code=${error.code ?? "unknown"}`,
        `message=${error.message ?? ""}`
      );
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
        const { data: focused } = await applyViewerVisibility(
          supabase
            .from("posts")
            .select(postsSelectVisible(focusSelect))
            .eq("id", input.focusPostId)
            .eq("post_type", "video")
            .eq("media_status", "ready")
            .not("video_path", "is", null),
          user?.id
        ).maybeSingle();
        if (
          focused &&
          isPostVisibleToViewer(focused as unknown as VideoPostRow, user?.id)
        ) {
          rows = [focused as unknown as VideoPostRow, ...rows];
        }
      }
    }

    const isHidden = (id: number) => hiddenIds.has(id) && id !== keepPostId;
    const rawHadMore = rows.length >= fetchLimit;
    let visibleRows = rows.filter((row) => !isHidden(row.id));

    if (visibleRows.length <= limit && rawHadMore) {
      const lastRaw = rows[rows.length - 1];
      const extraSelect = useArticleColumn
        ? postColumns
        : postColumnsWithoutArticle;
      const extra = await buildFeedQuery(extraSelect, {
        createdAt: lastRaw.created_at,
        id: lastRaw.id,
      }, fetchLimit);
      if (!extra.error && extra.data) {
        const extraRows = extra.data as unknown as VideoPostRow[];
        const seen = new Set(visibleRows.map((row) => row.id));
        for (const row of extraRows) {
          if (!isHidden(row.id) && !seen.has(row.id)) {
            visibleRows.push(row);
            seen.add(row.id);
          }
        }
      }
    }

    if (!cursor && visibleRows.length < MIN_UNWATCHED_FEED) {
      const already = new Set(visibleRows.map((row) => row.id));
      const backfillIds = hideEntries
        .filter((entry) => entry.postId !== keepPostId && !already.has(entry.postId))
        .sort((a, b) => a.watchedAt - b.watchedAt)
        .map((entry) => entry.postId)
        .slice(0, MIN_UNWATCHED_FEED - visibleRows.length);
      if (backfillIds.length > 0) {
        const backfillSelect = useArticleColumn
          ? postColumns
          : postColumnsWithoutArticle;
        const { data: backfillData } = await applyViewerVisibility(
          supabase
            .from("posts")
            .select(postsSelectVisible(backfillSelect))
            .in("id", backfillIds)
            .eq("post_type", "video")
            .eq("media_status", "ready")
            .not("video_path", "is", null),
          user?.id
        );
        const order = new Map(backfillIds.map((id, index) => [id, index]));
        const backfillRows = ((backfillData ?? []) as unknown as VideoPostRow[])
          .filter((row) => isPostVisibleToViewer(row, user?.id))
          .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        visibleRows = [...visibleRows, ...backfillRows];
      }
    }

    const hasMore = visibleRows.length > limit || rawHadMore;
    const pageRows = visibleRows.length > limit ? visibleRows.slice(0, limit) : visibleRows;
    const focusIndex = (() => {
      if (input?.focusPostId && input.focusPostId > 0) {
        const found = pageRows.findIndex((row) => row.id === input.focusPostId);
        if (found >= 0) return found;
      }
      return 0;
    })();
    const signIndexes =
      input?.signPolicy === "all"
        ? undefined
        : new Set(
            resolveWatchSignIndexes({
              length: pageRows.length,
              focusIndex,
              isContinuationPage: Boolean(cursor),
            })
          );
    const withUrls = await attachPlaybackUrls(supabase, pageRows, {
      signIndexes,
    });
    const withAuthorIds = await enrichAuthorUserIdsFromProfiles(
      supabase,
      withUrls
    );
    const articleIds = withAuthorIds
      .map((post) => post.article_id)
      .filter((id): id is string => Boolean(id));
    const creatorIds = withAuthorIds
      .map((post) => post.user_id)
      .filter((id): id is string => Boolean(id));

    const [withAuthors, viewerState, titles, followingSet] = await Promise.all([
      enrichAuthorIdentityFromProfiles(supabase, withAuthorIds),
      loadViewerInteractionState(
        supabase,
        user?.id,
        withAuthorIds.map((post) => post.id)
      ),
      articleIds.length > 0
        ? listArticleTitlesByIds(supabase, articleIds)
        : Promise.resolve(new Map<string, string>()),
      loadViewerFollowingSet(supabase, user?.id, creatorIds),
    ]);

    let posts = applyViewerStateToPosts(withAuthors, viewerState);
    if (titles.size > 0) {
      posts = posts.map((post) =>
        post.article_id && titles.has(post.article_id)
          ? { ...post, article_title: titles.get(post.article_id) ?? null }
          : post
      );
    }
    const videos = applyFollowingToDiscoverVideos(
      posts
        .map(mapVideoPostToDiscover)
        .filter((video): video is DiscoverVideo => video !== null),
      followingSet
    );

    const lastFreshOnPage = [...pageRows]
      .reverse()
      .find((row) => !isHidden(row.id));
    const nextCursor =
      hasMore && lastFreshOnPage
        ? { createdAt: lastFreshOnPage.created_at, id: lastFreshOnPage.id }
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
  guestWatched?: WatchHideEntry[] | null;
}): Promise<DiscoverVideosResult> {
  const result = await loadCanonicalVideoFeedPage({
    focusPostId: input?.focusPostId,
    limit: input?.limit ?? VIDEO_FEED_PAGE_SIZE,
    signPolicy: "first-active",
    guestWatched: input?.guestWatched,
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
  guestWatched?: WatchHideEntry[] | null;
}): Promise<WatchVideosPageResult> {
  const result = await loadCanonicalVideoFeedPage({
    cursor: input?.cursor,
    limit: input?.limit ?? WATCH_FEED_PAGE_SIZE,
    focusPostId: input?.focusPostId,
    signPolicy: "active-window",
    guestWatched: input?.guestWatched,
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
    const user = await getServerUser();
    const { data, error } = await applyViewerVisibility(
      supabase
        .from("posts")
        .select(
          postsSelectVisible(
            "id, user_id, video_path, video_url, post_type, media_status, deleted_at"
          )
        )
        .eq("id", postId),
      user?.id
    ).maybeSingle();

    if (error) {
      return { ok: false, message: "Unable to refresh playback." };
    }

    if (!data || !isPostVisibleToViewer(data, user?.id)) {
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

    const { data, error } = await applyViewerVisibility(
      supabase
        .from("posts")
        .select(postsSelectVisible(postColumns))
        .order("created_at", { ascending: false }),
      user?.id
    );

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
    const withUrls = await attachPlaybackUrls(supabase, rows, {
      signIndexes: firstPlayableVideoSignIndexes(rows),
    });
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

function isLifeCanonicalPostType(postType: string): boolean {
  return (LIFE_CANONICAL_POST_TYPES as readonly string[]).includes(postType);
}

async function hydrateLifePosts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | undefined,
  rows: VideoPostRow[],
  options?: { signAll?: boolean; signNone?: boolean }
): Promise<PublicPostDTO[]> {
  const visible = rows.filter((row) => {
    if (!isLifeCanonicalPostType(row.post_type)) {
      return false;
    }
    if (row.post_type !== "video") {
      return true;
    }
    return isPubliclyVisibleMedia({
      postType: row.post_type,
      mediaStatus: row.media_status,
      videoPath: row.video_path,
    });
  });
  const signIndexes = options?.signAll
    ? undefined
    : options?.signNone
      ? new Set<number>()
      : firstPlayableVideoSignIndexes(visible);
  const withUrls = await attachPlaybackUrls(supabase, visible, {
    signIndexes,
  });
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
    userId,
    withAuthors.map((post) => post.id)
  );
  return applyViewerStateToPosts(withAuthors, viewerState);
}

/**
 * UM Life chronological feed — existing `posts` rows only (text / image / video).
 * Does not insert rows or copy media.
 */
export async function getLifePostsServer(options?: {
  /** Anonymous visibility for sitemap / public index. */
  indexableOnly?: boolean;
}): Promise<FeedPostsResult> {
  try {
    const supabase = await createClient();
    const user = options?.indexableOnly ? null : await getServerUser();

    const { data, error } = await applyViewerVisibility(
      supabase
        .from("posts")
        .select(postsSelectVisible(postColumns))
        .in("post_type", [...LIFE_CANONICAL_POST_TYPES])
        .order("created_at", { ascending: false })
        .limit(LIFE_FEED_LIMIT),
      user?.id ?? null
    );

    if (error) {
      console.error("Unable to load UM Life posts:", error);
      return {
        ok: false,
        message: "Unable to load posts. Please try again.",
      };
    }

    const posts = await hydrateLifePosts(
      supabase,
      user?.id,
      (data ?? []) as VideoPostRow[],
      { signNone: Boolean(options?.indexableOnly) }
    );
    return { ok: true, posts };
  } catch (error) {
    console.error("getLifePostsServer failed:", error);
    return {
      ok: false,
      message: "Unable to load posts. Please try again.",
    };
  }
}

/** Focused UM Life post by canonical `posts.id`. */
export async function getLifePostByIdServer(
  postId: number
): Promise<LifePostResult> {
  try {
    const supabase = await createClient();
    const user = await getServerUser();

    const { data, error } = await applyViewerVisibility(
      supabase
        .from("posts")
        .select(postsSelectVisible(postColumns))
        .eq("id", postId),
      user?.id
    ).maybeSingle();

    if (error) {
      console.error("Unable to load UM Life post:", error);
      return {
        ok: false,
        message: "Unable to load this post. Please try again.",
      };
    }

    if (
      !data ||
      !isPostVisibleToViewer(data as unknown as VideoPostRow, user?.id)
    ) {
      return {
        ok: false,
        message: "This post is unavailable.",
        notFound: true,
      };
    }

    const posts = await hydrateLifePosts(supabase, user?.id, [
      data as VideoPostRow,
    ]);
    const post = posts[0];
    if (!post) {
      return {
        ok: false,
        message: "This post is unavailable.",
        notFound: true,
      };
    }

    return { ok: true, post };
  } catch (error) {
    console.error("getLifePostByIdServer failed:", error);
    return {
      ok: false,
      message: "Unable to load this post. Please try again.",
    };
  }
}
