/**
 * Maps real video/post metadata → AiContentProfile (no invented fields).
 */

import { AiPlatformError } from "../../contracts/errors";
import type { AiContentProfile } from "../../personalization/types";
import type { VideoContentMetadata } from "./types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function freshnessFromCreatedAt(createdAt: string | null): number {
  if (!createdAt) return 0.5;
  const ts = Date.parse(createdAt);
  if (!Number.isFinite(ts)) return 0.5;
  const ageDays = Math.max(0, (Date.now() - ts) / (24 * 60 * 60 * 1000));
  // ~1.0 when fresh, approaches 0.2 after ~30 days
  return clamp01(1 - Math.min(ageDays, 30) / 37.5);
}

/**
 * Build a content profile from known video metadata only.
 * Omits language/topics when not provided.
 */
export function toVideoContentProfile(
  meta: VideoContentMetadata
): AiContentProfile {
  const contentId = meta.contentId.trim();
  if (!contentId) {
    throw new AiPlatformError("invalid_input", "contentId is required.");
  }

  const topicIds = [
    ...new Set(
      (meta.topicIds ?? [])
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const metadata: Record<string, string | number | boolean | null> = {
    domain: "video",
  };
  if (meta.mediaDurationMs != null && Number.isFinite(meta.mediaDurationMs)) {
    metadata.mediaDurationMs = meta.mediaDurationMs;
  }
  if (meta.mediaStatus) metadata.mediaStatus = meta.mediaStatus;
  if (meta.createdAt) metadata.createdAt = meta.createdAt;
  if (meta.language) metadata.language = meta.language;
  if (meta.visibility) metadata.visibility = meta.visibility;

  const safetyBlocked =
    meta.mediaStatus != null &&
    meta.mediaStatus !== "ready" &&
    meta.mediaStatus !== "published";

  return {
    contentId,
    contentType: "video",
    topicIds,
    creatorId: meta.creatorId?.trim() ? meta.creatorId.trim() : null,
    freshnessScore: freshnessFromCreatedAt(meta.createdAt),
    qualityScore: safetyBlocked ? 0.1 : 0.5,
    metadata,
    updatedAt: new Date().toISOString(),
  };
}
