"use server";

import {
  type RecommendationSurface,
  type WatchSignalInput,
} from "../../lib/recommendations";
import {
  recordWatchSignal,
  type RecordWatchSignalResult,
} from "../../lib/supabase/recommendations";
import { createClient } from "../../lib/supabase/server";

export type RecordWatchSignalActionInput = {
  postId: number;
  sessionId: string;
  surface?: RecommendationSurface;
  watchDurationMs?: number;
  watchPercent?: number;
  completed?: boolean;
  rewatchCount?: number;
  liked?: boolean;
  saved?: boolean;
  shared?: boolean;
  commented?: boolean;
  followAfterWatch?: boolean;
  skippedEarly?: boolean | null;
  viewerKey?: string | null;
};

/**
 * Server action for Discover/Watch watch-signal telemetry.
 * Additive — does not alter like/save/share/view reward RPCs.
 */
export async function recordWatchSignalAction(
  input: RecordWatchSignalActionInput
): Promise<RecordWatchSignalResult> {
  const payload: WatchSignalInput = {
    postId: input.postId,
    sessionId: input.sessionId,
    surface: input.surface === "watch" ? "watch" : "discover",
    watchDurationMs: input.watchDurationMs ?? 0,
    watchPercent: input.watchPercent ?? 0,
    completed: Boolean(input.completed),
    rewatchCount: input.rewatchCount ?? 0,
    liked: Boolean(input.liked),
    saved: Boolean(input.saved),
    shared: Boolean(input.shared),
    commented: Boolean(input.commented),
    followAfterWatch: Boolean(input.followAfterWatch),
    skippedEarly: input.skippedEarly,
    viewerKey: input.viewerKey ?? null,
  };

  const supabase = await createClient();
  return recordWatchSignal(supabase, payload);
}
