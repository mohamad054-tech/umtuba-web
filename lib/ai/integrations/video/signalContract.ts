/**
 * Video recommendation signal validation — fail-closed, server-owned identity.
 */

import { AiPlatformError } from "../../contracts/errors";
import {
  VIDEO_PERSONALIZATION_SURFACES,
  VIDEO_RECOMMENDATION_SIGNAL_EVENTS,
  VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS,
  type VideoPersonalizationSurface,
  type VideoRecommendationSignalAccepted,
  type VideoRecommendationSignalClientInput,
  type VideoRecommendationSignalEvent,
} from "./types";

const EVENT_SET = new Set<string>(VIDEO_RECOMMENDATION_SIGNAL_EVENTS);
const SURFACE_SET = new Set<string>(VIDEO_PERSONALIZATION_SURFACES);
const FORBIDDEN = new Set<string>(VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * Derive bounded strength server-side.
 * Negative events use low strength so a single event cannot dominate.
 */
export function deriveVideoSignalStrength(
  event: VideoRecommendationSignalEvent,
  progressPercent: number | null
): number {
  switch (event) {
    case "impression":
      return 0.05;
    case "view_start":
      return 0.15;
    case "watch_progress": {
      const p = progressPercent ?? 0;
      return clamp01(0.1 + (p / 100) * 0.4);
    }
    case "completion":
      return 0.75;
    case "replay":
      return 0.55;
    case "like":
      return 0.45;
    case "comment":
      return 0.5;
    case "save":
      return 0.55;
    case "share":
      return 0.6;
    case "follow_creator":
      return 0.65;
    case "skip":
      return 0.12;
    case "hide":
      return 0.2;
    case "not_interested":
      return 0.25;
    case "report":
      return 0.35;
    default:
      return 0;
  }
}

export function mapVideoEventToFoundationSignalType(
  event: VideoRecommendationSignalEvent
):
  | "impression"
  | "view"
  | "completion"
  | "replay"
  | "like"
  | "comment"
  | "save"
  | "share"
  | "follow"
  | "hide"
  | "not_interested"
  | "report" {
  switch (event) {
    case "impression":
      return "impression";
    case "view_start":
    case "watch_progress":
      return "view";
    case "completion":
      return "completion";
    case "replay":
      return "replay";
    case "like":
      return "like";
    case "comment":
      return "comment";
    case "save":
      return "save";
    case "share":
      return "share";
    case "follow_creator":
      return "follow";
    case "skip":
      return "not_interested";
    case "hide":
      return "hide";
    case "not_interested":
      return "not_interested";
    case "report":
      return "report";
  }
}

/**
 * Validate client payload + bind server user identity.
 * Rejects unknown events, bad ids/progress, and forbidden internal fields.
 */
export function validateVideoRecommendationSignalInput(input: {
  raw: unknown;
  /** Must come from server auth — never from client body. */
  serverUserId: string | null;
}): VideoRecommendationSignalAccepted {
  if (!input.serverUserId || !input.serverUserId.trim()) {
    throw new AiPlatformError(
      "unauthenticated",
      "Authentication required for video personalization signals."
    );
  }
  if (!isPlainObject(input.raw)) {
    throw new AiPlatformError("invalid_input", "Signal payload must be an object.");
  }

  for (const key of Object.keys(input.raw)) {
    if (FORBIDDEN.has(key)) {
      throw new AiPlatformError(
        "invalid_input",
        `Forbidden client field rejected: ${key}`
      );
    }
  }

  const body = input.raw as VideoRecommendationSignalClientInput &
    Record<string, unknown>;
  const eventRaw = typeof body.event === "string" ? body.event.trim() : "";
  if (!EVENT_SET.has(eventRaw)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown video recommendation signal: ${eventRaw || "(empty)"}`
    );
  }
  const event = eventRaw as VideoRecommendationSignalEvent;

  const contentId =
    typeof body.contentId === "string" ? body.contentId.trim() : "";
  if (!contentId) {
    throw new AiPlatformError("invalid_input", "contentId is required.");
  }

  let progressPercent: number | null = null;
  if (body.progressPercent != null) {
    if (
      typeof body.progressPercent !== "number" ||
      !Number.isFinite(body.progressPercent) ||
      body.progressPercent < 0 ||
      body.progressPercent > 100
    ) {
      throw new AiPlatformError(
        "invalid_input",
        "progressPercent must be a finite number in [0, 100]."
      );
    }
    progressPercent = body.progressPercent;
  }

  let watchDurationMs: number | null = null;
  if (body.watchDurationMs != null) {
    if (
      typeof body.watchDurationMs !== "number" ||
      !Number.isFinite(body.watchDurationMs) ||
      body.watchDurationMs < 0 ||
      body.watchDurationMs > 24 * 60 * 60 * 1000
    ) {
      throw new AiPlatformError(
        "invalid_input",
        "watchDurationMs is out of allowed bounds."
      );
    }
    watchDurationMs = body.watchDurationMs;
  }

  let mediaDurationMs: number | null = null;
  if (body.mediaDurationMs != null) {
    if (
      typeof body.mediaDurationMs !== "number" ||
      !Number.isFinite(body.mediaDurationMs) ||
      body.mediaDurationMs <= 0 ||
      body.mediaDurationMs > 24 * 60 * 60 * 1000
    ) {
      throw new AiPlatformError(
        "invalid_input",
        "mediaDurationMs is out of allowed bounds."
      );
    }
    mediaDurationMs = body.mediaDurationMs;
  }

  if (
    watchDurationMs != null &&
    mediaDurationMs != null &&
    watchDurationMs > mediaDurationMs * 3
  ) {
    throw new AiPlatformError(
      "invalid_input",
      "watchDurationMs exceeds mediaDurationMs bounds."
    );
  }

  const surfaceRaw =
    typeof body.surface === "string" && body.surface.trim()
      ? body.surface.trim()
      : "video_feed";
  if (!SURFACE_SET.has(surfaceRaw)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown video personalization surface: ${surfaceRaw}`
    );
  }

  const occurredAt =
    typeof body.occurredAt === "string" && body.occurredAt.trim()
      ? body.occurredAt.trim()
      : new Date().toISOString();

  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim().slice(0, 128)
      : null;

  return {
    event,
    contentId,
    userId: input.serverUserId.trim(),
    occurredAt,
    progressPercent,
    watchDurationMs,
    mediaDurationMs,
    surface: surfaceRaw as VideoPersonalizationSurface,
    sessionId,
    strength: deriveVideoSignalStrength(event, progressPercent),
  };
}
