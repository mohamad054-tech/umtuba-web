"use client";

import { recordQualifiedWatchAction } from "../../app/actions/watchHide";
import { rememberLocalWatchHide } from "./watchHideStorage";

const remembered = new Set<number>();

/**
 * Mark a video as watched for the 14-day hide window.
 * Always writes localStorage (guests). Signed-in users also persist server-side.
 * Does not touch record_post_view / posts.views.
 */
export async function rememberQualifiedWatch(postId: number): Promise<void> {
  if (!Number.isInteger(postId) || postId <= 0 || remembered.has(postId)) {
    return;
  }
  remembered.add(postId);
  rememberLocalWatchHide(postId);
  const result = await recordQualifiedWatchAction(postId);
  if (!result.ok) {
    remembered.delete(postId);
  }
}
