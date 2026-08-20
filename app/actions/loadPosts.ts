"use server";

import {
  getDiscoverVideosServer,
  getFeedPostsServer,
  getLifePostByIdServer,
  getLifePostsServer,
  type DiscoverVideosResult,
  type FeedPostsResult,
  type LifePostResult,
} from "../../lib/supabase/videoPostsServer";
import type { PublicPostDTO } from "../../lib/supabase/videoPosts";

export type {
  DiscoverVideosResult,
  FeedPostsResult,
  LifePostResult,
  PublicPostDTO,
};

/** Client-callable Discover loader (signed URLs minted on the server). */
export async function loadDiscoverVideosAction(): Promise<DiscoverVideosResult> {
  return getDiscoverVideosServer();
}

/** Client-callable feed loader (signed URLs minted on the server). */
export async function loadFeedPostsAction(): Promise<FeedPostsResult> {
  return getFeedPostsServer();
}

/** UM Life chronological feed — existing canonical posts only. */
export async function loadLifePostsAction(): Promise<FeedPostsResult> {
  return getLifePostsServer();
}

/** Focused UM Life post by canonical `posts.id`. */
export async function loadLifePostAction(
  postId: number
): Promise<LifePostResult> {
  return getLifePostByIdServer(postId);
}
