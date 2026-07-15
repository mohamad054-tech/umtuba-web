import type { DiscoverVideo } from "../../app/discover/types";
import { createClient, getServerUser } from "./server";
import { loadViewerInteractionState } from "./socialInteractions";
import {
  applyViewerStateToPosts,
  attachPlaybackUrls,
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
