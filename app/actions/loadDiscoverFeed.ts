"use server";

import {
  encodeWatchPageCursor,
  loadCanonicalVideoFeedPage,
} from "../../lib/supabase/videoPostsServer";
import type { DiscoverVideo } from "../discover/types";

export type LoadDiscoverFeedResult =
  | {
      ok: true;
      videos: DiscoverVideo[];
      nextCursor: string | null;
    }
  | { ok: false; message: string };

/** Paginated Discover feed — same canonical loader as Watch. */
export async function loadDiscoverFeedPageAction(input?: {
  cursor?: string | null;
  limit?: number;
  focusPostId?: number | null;
}): Promise<LoadDiscoverFeedResult> {
  const result = await loadCanonicalVideoFeedPage({
    cursor: input?.cursor,
    limit: input?.limit,
    focusPostId: input?.focusPostId,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    videos: result.page.videos,
    nextCursor: encodeWatchPageCursor(result.page.nextCursor),
  };
}
