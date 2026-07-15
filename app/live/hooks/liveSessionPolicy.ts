import type { LiveMediaConnectionState } from "../types";

/** LiveKit JWT TTL (seconds) — keep in sync with lib/livekit/server.ts */
export const LIVE_MEDIA_TOKEN_TTL_SECONDS = 60 * 12;

/** Remint this many seconds before token expiry. */
export const LIVE_MEDIA_TOKEN_REFRESH_LEAD_SECONDS = 90;

/** Max automatic SFU reconnect attempts after unexpected disconnect. */
export const LIVE_MEDIA_MAX_RECONNECT_ATTEMPTS = 8;

export const LIVE_MEDIA_RECONNECT_BASE_MS = 1_200;
export const LIVE_MEDIA_RECONNECT_MAX_MS = 12_000;

/** Stale DB participant threshold for prepared prune migration. */
export const LIVE_PARTICIPANT_STALE_SECONDS = 120;

export function liveMediaReconnectDelayMs(attempt: number): number {
  const capped = Math.min(Math.max(attempt, 0), 5);
  return Math.min(
    LIVE_MEDIA_RECONNECT_MAX_MS,
    LIVE_MEDIA_RECONNECT_BASE_MS * 2 ** capped
  );
}

/** ms until proactive remint; null if expiry unknown or already past lead. */
export function liveMediaTokenRefreshDelayMs(
  expiresAtUnixSeconds: number,
  nowMs: number = Date.now()
): number | null {
  if (!Number.isFinite(expiresAtUnixSeconds) || expiresAtUnixSeconds <= 0) {
    return null;
  }
  const refreshAtMs =
    expiresAtUnixSeconds * 1000 - LIVE_MEDIA_TOKEN_REFRESH_LEAD_SECONDS * 1000;
  const delay = refreshAtMs - nowMs;
  if (delay <= 0) {
    return 0;
  }
  return delay;
}

export function liveMediaConnectionLabel(
  state: LiveMediaConnectionState,
  quality: "excellent" | "good" | "poor" | "unknown" = "unknown"
): string {
  switch (state) {
    case "connecting":
      return "Connecting…";
    case "reconnecting":
      return "Reconnecting…";
    case "error":
      return "Network interrupted";
    case "connected":
      if (quality === "poor") return "Poor";
      if (quality === "good") return "Good";
      if (quality === "excellent") return "Excellent";
      return "Live";
    case "idle":
    default:
      return "Offline";
  }
}

export function isIntentionalLiveDisconnectReason(
  reason: string | null | undefined
): boolean {
  if (!reason) return false;
  const lower = reason.toLowerCase();
  return (
    lower.includes("client initiated") ||
    lower.includes("room ended") ||
    lower.includes("session ended")
  );
}
