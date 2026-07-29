/**
 * Maps an existing candidate video list → Personalization candidate contracts.
 */

import { AiPlatformError } from "../../contracts/errors";
import type { AiRecommendationCandidate } from "../../personalization/types";
import type { VideoCandidateInput } from "./types";

export function toVideoRecommendationCandidates(
  videos: VideoCandidateInput[]
): AiRecommendationCandidate[] {
  if (!Array.isArray(videos)) {
    throw new AiPlatformError("invalid_input", "videos must be an array.");
  }
  const out: AiRecommendationCandidate[] = [];
  const seen = new Set<string>();
  const n = videos.length;
  videos.forEach((video, index) => {
    const contentId =
      typeof video.contentId === "string" ? video.contentId.trim() : "";
    if (!contentId) {
      throw new AiPlatformError(
        "invalid_input",
        `contentId is required at index ${index}.`
      );
    }
    if (seen.has(contentId)) return;
    seen.add(contentId);

    let baseScore = 0.5;
    if (video.baseScore != null) {
      if (
        typeof video.baseScore !== "number" ||
        !Number.isFinite(video.baseScore) ||
        video.baseScore < 0 ||
        video.baseScore > 1
      ) {
        throw new AiPlatformError(
          "invalid_input",
          `baseScore out of range for ${contentId}.`
        );
      }
      baseScore = video.baseScore;
    } else if (n > 1) {
      // Preserve chronological preference as a soft prior when enabled later.
      baseScore = clamp01(1 - index / n);
    }

    out.push({
      contentId,
      sourceId: video.sourceId ?? "new",
      baseScore,
    });
  });
  return out;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
