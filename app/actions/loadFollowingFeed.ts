"use server";

import {
  encodeFollowingPageCursor,
  loadFollowingVideoFeedPage,
} from "../../lib/supabase/followingFeed";
import type { DiscoverVideo } from "../discover/types";

export type LoadFollowingFeedResult =
  | {
      ok: true;
      videos: DiscoverVideo[];
      nextCursor: string | null;
      followedCount: number;
    }
  | { ok: false; message: string; requiresAuth?: boolean };

/** Paginated Following feed — followed creators only, chronological. */
export async function loadFollowingFeedPageAction(input?: {
  cursor?: string | null;
  limit?: number;
}): Promise<LoadFollowingFeedResult> {
  const result = await loadFollowingVideoFeedPage({
    cursor: input?.cursor,
    limit: input?.limit,
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    videos: result.page.videos,
    nextCursor: encodeFollowingPageCursor(result.page.nextCursor),
    followedCount: result.page.followedCount,
  };
}
