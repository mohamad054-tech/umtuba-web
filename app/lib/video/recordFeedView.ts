"use client";

import { recordViewAction } from "../../actions/socialInteractions";
import { getOrCreateViewerKey } from "../social/shareAndViews";

export type RecordFeedViewResult =
  | { ok: true; views: number; counted: boolean }
  | { ok: false };

/**
 * Shared client view recorder for Discover and Watch.
 * Session Set prevents duplicate RPC calls; server enforces the 6h window.
 */
export async function recordFeedViewOnce(
  postId: number,
  sessionSeen: Set<number>
): Promise<RecordFeedViewResult> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false };
  }
  if (sessionSeen.has(postId)) {
    return { ok: false };
  }
  sessionSeen.add(postId);

  const result = await recordViewAction(postId, getOrCreateViewerKey());
  if (!result.ok) {
    // Allow a later retry if the RPC soft-failed (network); remove from set.
    sessionSeen.delete(postId);
    return { ok: false };
  }

  return {
    ok: true,
    views: result.views,
    counted: Boolean(result.counted),
  };
}
