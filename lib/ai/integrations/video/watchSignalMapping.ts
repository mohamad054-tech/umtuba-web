/**
 * Maps existing WatchSignalInput fields → video personalization events.
 * Only maps signals that already exist on the watch-signal flush path.
 * Does not invent hide / not_interested / report flows.
 */

import { normalizeWatchSignal } from "../../../recommendations/signals";
import type { WatchSignalInput } from "../../../recommendations/types";
import type {
  VideoPersonalizationSurface,
  VideoRecommendationSignalClientInput,
  VideoRecommendationSignalEvent,
} from "./types";

export type MappedWatchPersonalizationEvent = {
  event: VideoRecommendationSignalEvent;
  raw: VideoRecommendationSignalClientInput;
};

function mapSurface(
  surface: WatchSignalInput["surface"]
): VideoPersonalizationSurface {
  return surface === "watch" ? "video_feed" : "discover";
}

/**
 * Meaningful watch activity threshold — matches client flush filter intent
 * (ignore empty impressions) and EARLY_SKIP bounds for skip derivation.
 */
export const WATCH_VIEW_START_MIN_DURATION_MS = 250;
export const WATCH_VIEW_START_MIN_PERCENT = 1;

/**
 * Expand one persisted watch-signal session into zero-or-more personalization
 * client payloads (still validated later with server-owned userId).
 */
export function mapWatchSignalToPersonalizationEvents(
  input: WatchSignalInput
): MappedWatchPersonalizationEvent[] {
  const signal = normalizeWatchSignal(input);
  const contentId = String(signal.postId);
  const surface = mapSurface(signal.surface);
  const sessionId = signal.sessionId.trim();
  const mediaDurationMs = null;
  const out: MappedWatchPersonalizationEvent[] = [];

  const push = (
    event: VideoRecommendationSignalEvent,
    extra?: Partial<VideoRecommendationSignalClientInput>
  ) => {
    out.push({
      event,
      raw: {
        event,
        contentId,
        surface,
        sessionId,
        progressPercent: signal.watchPercent,
        watchDurationMs: signal.watchDurationMs,
        mediaDurationMs,
        ...extra,
      },
    });
  };

  const meaningfulWatch =
    signal.watchDurationMs >= WATCH_VIEW_START_MIN_DURATION_MS ||
    signal.watchPercent >= WATCH_VIEW_START_MIN_PERCENT;

  if (meaningfulWatch) {
    push("view_start");
    if (signal.watchPercent > 0) {
      push("watch_progress");
    }
  }

  // Completion only when existing pipeline marked completed=true.
  if (signal.completed) {
    push("completion");
  }

  // Replay only with explicit rewatch_count evidence.
  if (signal.rewatchCount > 0) {
    push("replay");
  }

  if (signal.skippedEarly) {
    push("skip");
  }

  if (signal.liked) push("like");
  if (signal.saved) push("save");
  if (signal.shared) push("share");
  if (signal.commented) push("comment");
  if (signal.followAfterWatch) push("follow_creator");

  return out;
}

/** Events available on the organic video watch/social paths today. */
export const VIDEO_WIRING_AVAILABLE_EVENTS = [
  "impression",
  "view_start",
  "watch_progress",
  "completion",
  "replay",
  "like",
  "comment",
  "save",
  "share",
  "follow_creator",
  "skip",
] as const;

/** Contract events with no organic video source yet — do not fabricate UI/flows. */
export const VIDEO_WIRING_UNWIRED_EVENTS = [
  "hide",
  "not_interested",
  "report",
] as const;
