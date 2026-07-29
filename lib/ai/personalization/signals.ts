/**
 * Recommendation signal validation — fail-closed.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_PRODUCT_SURFACES,
  AI_RECOMMENDATION_SIGNAL_TYPES,
  type AiRecommendationSignal,
  type AiRecommendationSignalType,
} from "./types";

const SIGNAL_SET = new Set<string>(AI_RECOMMENDATION_SIGNAL_TYPES);
const SURFACE_SET = new Set<string>(AI_PRODUCT_SURFACES);

export function isRecommendationSignalType(
  value: string
): value is AiRecommendationSignalType {
  return SIGNAL_SET.has(value);
}

export function validateRecommendationSignal(
  input: AiRecommendationSignal
): AiRecommendationSignal {
  const signalId = input.signalId.trim();
  const userId = input.userId.trim();
  const contentId = input.contentId.trim();
  if (!signalId) {
    throw new AiPlatformError("invalid_input", "signalId is required.");
  }
  if (!userId) {
    throw new AiPlatformError("invalid_input", "userId is required.");
  }
  if (!contentId) {
    throw new AiPlatformError("invalid_input", "contentId is required.");
  }
  if (!isRecommendationSignalType(input.signalType)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown recommendation signal type: ${String(input.signalType)}`
    );
  }
  if (!SURFACE_SET.has(input.surface)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown personalization surface: ${String(input.surface)}`
    );
  }
  if (
    !Number.isFinite(input.strength) ||
    input.strength < 0 ||
    input.strength > 1
  ) {
    throw new AiPlatformError(
      "invalid_input",
      "signal strength must be a finite number in [0, 1]."
    );
  }
  if (!input.occurredAt.trim()) {
    throw new AiPlatformError("invalid_input", "occurredAt is required.");
  }
  return {
    signalId,
    userId,
    contentId,
    signalType: input.signalType,
    strength: input.strength,
    occurredAt: input.occurredAt,
    surface: input.surface,
  };
}
