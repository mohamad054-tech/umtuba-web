"use server";

import {
  getDiscoverVideosServer,
  getFeedPostsServer,
  type DiscoverVideosResult,
  type FeedPostsResult,
} from "../../lib/supabase/videoPostsServer";
import type { PublicPostDTO } from "../../lib/supabase/videoPosts";

export type { DiscoverVideosResult, FeedPostsResult, PublicPostDTO };

/** Client-callable Discover loader (signed URLs minted on the server). */
export async function loadDiscoverVideosAction(): Promise<DiscoverVideosResult> {
  return getDiscoverVideosServer();
}

/** Client-callable feed loader (signed URLs minted on the server). */
export async function loadFeedPostsAction(): Promise<FeedPostsResult> {
  return getFeedPostsServer();
}
