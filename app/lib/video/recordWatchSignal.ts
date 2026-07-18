"use client";

import { recordWatchSignalAction } from "../../actions/recommendations";
import type { RecommendationSurface } from "../../../lib/recommendations";
import { getOrCreateViewerKey } from "../social/shareAndViews";

export type WatchSessionEngagement = {
  liked?: boolean;
  saved?: boolean;
  shared?: boolean;
  commented?: boolean;
  followAfterWatch?: boolean;
};

export type WatchSessionSnapshot = {
  postId: number;
  sessionId: string;
  surface: RecommendationSurface;
  watchDurationMs: number;
  watchPercent: number;
  completed: boolean;
  rewatchCount: number;
  engagement: WatchSessionEngagement;
};

/**
 * Client-side accumulator for a single active video session.
 * Flushes via recordWatchSignalAction when the slide deactivates.
 */
export function createWatchSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyWatchSession(
  postId: number,
  surface: RecommendationSurface
): WatchSessionSnapshot {
  return {
    postId,
    sessionId: createWatchSessionId(),
    surface,
    watchDurationMs: 0,
    watchPercent: 0,
    completed: false,
    rewatchCount: 0,
    engagement: {},
  };
}

export function mergeWatchProgress(
  session: WatchSessionSnapshot,
  progress: {
    currentTimeMs: number;
    durationMs: number;
    completed?: boolean;
    loopCount?: number;
  }
): WatchSessionSnapshot {
  const durationMs = Math.max(0, progress.durationMs);
  const currentTimeMs = Math.max(0, progress.currentTimeMs);
  const percent =
    durationMs > 0
      ? Math.min(100, (currentTimeMs / durationMs) * 100)
      : session.watchPercent;

  return {
    ...session,
    watchDurationMs: Math.max(session.watchDurationMs, currentTimeMs),
    watchPercent: Math.max(session.watchPercent, percent),
    completed: session.completed || Boolean(progress.completed),
    rewatchCount: Math.max(
      session.rewatchCount,
      Math.max(0, Math.floor(progress.loopCount ?? 0))
    ),
  };
}

export async function flushWatchSession(
  session: WatchSessionSnapshot | null | undefined
): Promise<boolean> {
  if (!session || !Number.isInteger(session.postId) || session.postId <= 0) {
    return false;
  }

  // Ignore empty impressions with no meaningful watch time.
  if (session.watchDurationMs < 250 && session.watchPercent < 1) {
    return false;
  }

  const result = await recordWatchSignalAction({
    postId: session.postId,
    sessionId: session.sessionId,
    surface: session.surface,
    watchDurationMs: Math.round(session.watchDurationMs),
    watchPercent: Number(session.watchPercent.toFixed(2)),
    completed: session.completed,
    rewatchCount: session.rewatchCount,
    liked: Boolean(session.engagement.liked),
    saved: Boolean(session.engagement.saved),
    shared: Boolean(session.engagement.shared),
    commented: Boolean(session.engagement.commented),
    followAfterWatch: Boolean(session.engagement.followAfterWatch),
    viewerKey: getOrCreateViewerKey(),
  });

  return result.ok;
}
