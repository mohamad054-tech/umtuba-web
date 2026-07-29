/**
 * Best-effort wiring from existing video watch/social server paths → ingest.
 * Never throws to callers. Ranking remains off. Flag-gated.
 */

import { aiPersonalizationEngine } from "../../personalization/engine";
import { isVideoPersonalizationIntegrationEnabled } from "./featureFlag";
import { ingestVideoRecommendationSignal } from "./ingest";
import { claimVideoSignalDedupeKey } from "./signalDedupe";
import {
  mapWatchSignalToPersonalizationEvents,
} from "./watchSignalMapping";
import type { WatchSignalInput } from "../../../recommendations/types";
import type { VideoRecommendationSignalEvent } from "./types";
import type { VideoPersonalizationSurface } from "./types";

export type VideoWiringSummary = {
  attempted: number;
  ingested: number;
  skipped: number;
  failed: number;
};

function emptySummary(): VideoWiringSummary {
  return { attempted: 0, ingested: 0, skipped: 0, failed: 0 };
}

/**
 * After a successful record_watch_signal RPC — map + ingest when flag ON.
 * Requires authenticated server user; anonymous watch signals are skipped.
 */
export function wireWatchSignalToPersonalization(input: {
  watchSignal: WatchSignalInput;
  serverUserId: string | null;
  enabled?: boolean;
}): VideoWiringSummary {
  const summary = emptySummary();
  try {
    const enabled =
      typeof input.enabled === "boolean"
        ? input.enabled
        : isVideoPersonalizationIntegrationEnabled();
    if (!enabled) {
      summary.skipped += 1;
      return summary;
    }
    if (!input.serverUserId?.trim()) {
      // Auth required for personalization identity — do not invent anon profiles.
      summary.skipped += 1;
      return summary;
    }

    const mapped = mapWatchSignalToPersonalizationEvents(input.watchSignal);
    for (const item of mapped) {
      summary.attempted += 1;
      const dedupeKey = [
        "watch",
        input.serverUserId,
        item.event,
        item.raw.contentId,
        item.raw.sessionId ?? "",
      ].join(":");
      if (!claimVideoSignalDedupeKey(dedupeKey)) {
        summary.skipped += 1;
        continue;
      }
      const result = ingestVideoRecommendationSignal({
        raw: item.raw,
        serverUserId: input.serverUserId,
        engine: aiPersonalizationEngine,
        enabled: true,
      });
      if (!result.ok) {
        summary.failed += 1;
        continue;
      }
      if (result.status === "ingested") summary.ingested += 1;
      else summary.skipped += 1;
    }
  } catch {
    summary.failed += 1;
  }
  return summary;
}

/**
 * Wire a single authenticated social engagement (like/save/share/comment/view).
 */
export function wireSocialEngagementToPersonalization(input: {
  event: Extract<
    VideoRecommendationSignalEvent,
    "impression" | "like" | "save" | "share" | "comment"
  >;
  contentId: string;
  serverUserId: string | null;
  surface?: VideoPersonalizationSurface;
  enabled?: boolean;
}): VideoWiringSummary {
  const summary = emptySummary();
  try {
    const enabled =
      typeof input.enabled === "boolean"
        ? input.enabled
        : isVideoPersonalizationIntegrationEnabled();
    if (!enabled) {
      summary.skipped += 1;
      return summary;
    }
    if (!input.serverUserId?.trim()) {
      summary.skipped += 1;
      return summary;
    }
    const contentId = input.contentId.trim();
    if (!contentId) {
      summary.skipped += 1;
      return summary;
    }

    summary.attempted += 1;
    const dedupeKey = [
      "social",
      input.serverUserId,
      input.event,
      contentId,
    ].join(":");
    // Shorter TTL for social — suppress accidental double submits.
    if (!claimVideoSignalDedupeKey(dedupeKey, 30_000)) {
      summary.skipped += 1;
      return summary;
    }

    const result = ingestVideoRecommendationSignal({
      raw: {
        event: input.event,
        contentId,
        surface: input.surface ?? "discover",
      },
      serverUserId: input.serverUserId,
      engine: aiPersonalizationEngine,
      enabled: true,
    });
    if (!result.ok) summary.failed += 1;
    else if (result.status === "ingested") summary.ingested += 1;
    else summary.skipped += 1;
  } catch {
    summary.failed += 1;
  }
  return summary;
}
