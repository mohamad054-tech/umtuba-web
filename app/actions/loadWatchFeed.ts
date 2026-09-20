"use server";

import {
  encodeWatchPageCursor,
  getWatchVideosPageServer,
  refreshWatchPlaybackUrlServer,
} from "../../lib/supabase/videoPostsServer";
import type { WatchVideo } from "../watch/types";
import type { WatchHideEntry } from "../../lib/video/watchHidePolicy";

export type LoadWatchFeedResult =
  | {
      ok: true;
      videos: WatchVideo[];
      nextCursor: string | null;
      usedDemoFallback: boolean;
    }
  | { ok: false; message: string };

export async function loadWatchFeedPageAction(input?: {
  cursor?: string | null;
  limit?: number;
  focusPostId?: number | null;
  guestWatched?: WatchHideEntry[] | null;
}): Promise<LoadWatchFeedResult> {
  const result = await getWatchVideosPageServer({
    cursor: input?.cursor,
    limit: input?.limit,
    focusPostId: input?.focusPostId,
    guestWatched: input?.guestWatched,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    videos: result.page.videos,
    nextCursor: encodeWatchPageCursor(result.page.nextCursor),
    usedDemoFallback: result.page.usedDemoFallback,
  };
}

export async function refreshWatchPlaybackAction(
  postId: number
): Promise<
  | { ok: true; src: string }
  | { ok: false; message: string; deleted?: boolean }
> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Invalid video." };
  }
  return refreshWatchPlaybackUrlServer(postId);
}
