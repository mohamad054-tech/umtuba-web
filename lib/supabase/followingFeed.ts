import {
  VIDEO_FEED_PAGE_MAX,
  VIDEO_FEED_PAGE_SIZE,
} from "../../app/lib/video/feedPolicy";
import {
  decodeWatchFeedCursor,
  encodeWatchFeedCursor,
} from "../../app/watch/lib/mapWatchVideo";
import type { DiscoverVideo } from "../../app/discover/types";
import { listArticleTitlesByIds } from "../articles/articlesFoundation";
import {
  applyFollowingToDiscoverVideos,
  loadViewerFollowingSet,
} from "./follows";
import { createClient, getServerUser } from "./server";
import { loadViewerInteractionState } from "./socialInteractions";
import {
  applyViewerStateToPosts,
  attachPlaybackUrls,
  enrichAuthorIdentityFromProfiles,
  enrichAuthorUserIdsFromProfiles,
  isMissingArticleIdColumnError,
  mapVideoPostToDiscover,
  postColumns,
  postColumnsWithoutArticle,
  type VideoPostRow,
} from "./videoPosts";

export const FOLLOWING_AUTHOR_ID_CAP = 400;

export type FollowingFeedPage = {
  videos: DiscoverVideo[];
  nextCursor: { createdAt: string; id: number } | null;
  followedCount: number;
};

export type FollowingFeedResult =
  | { ok: true; page: FollowingFeedPage }
  | { ok: false; message: string; requiresAuth?: boolean };

/**
 * Authoritative followed creator ids for the signed-in viewer.
 * Caps the IN-filter so the feed stays bounded. Chronological only.
 */
export async function loadViewerFollowingAuthorIds(
  viewerId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .limit(FOLLOWING_AUTHOR_ID_CAP);

  if (error) {
    console.error("loadViewerFollowingAuthorIds failed:", error);
    return [];
  }

  return [
    ...new Set(
      (data ?? [])
        .map((row) =>
          typeof row.following_id === "string" ? row.following_id : null
        )
        .filter((id): id is string => Boolean(id))
    ),
  ];
}

/**
 * Following feed: ready videos from followed creators, created_at DESC.
 * Same video/post hydration as Home/Watch. Chronological only — no ranking.
 */
export async function loadFollowingVideoFeedPage(input?: {
  cursor?: string | null;
  limit?: number;
}): Promise<FollowingFeedResult> {
  try {
    const user = await getServerUser();
    if (!user?.id) {
      return {
        ok: false,
        message: "Please sign in to see posts from creators you follow.",
        requiresAuth: true,
      };
    }

    const authorIds = await loadViewerFollowingAuthorIds(user.id);
    if (authorIds.length === 0) {
      return {
        ok: true,
        page: { videos: [], nextCursor: null, followedCount: 0 },
      };
    }

    const supabase = await createClient();
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
        .in("user_id", authorIds)
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
    if (error && isMissingArticleIdColumnError(error)) {
      ({ data, error } = await buildFeedQuery(postColumnsWithoutArticle));
    }

    if (error) {
      console.error("Unable to load following feed:", error);
      return {
        ok: false,
        message: "Unable to load posts from people you follow. Please try again.",
      };
    }

    const rows = (data ?? []) as unknown as VideoPostRow[];
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
      user.id,
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
      user.id,
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
      page: {
        videos,
        nextCursor,
        followedCount: authorIds.length,
      },
    };
  } catch (error) {
    console.error("loadFollowingVideoFeedPage failed:", error);
    return {
      ok: false,
      message: "Unable to load posts from people you follow. Please try again.",
    };
  }
}

export function encodeFollowingPageCursor(
  cursor: { createdAt: string; id: number } | null
): string | null {
  if (!cursor) return null;
  return encodeWatchFeedCursor(cursor);
}
