/**
 * Human-facing Live copy for beta trust.
 * Technical details stay in server logs — never show SQL, env vars, or stacks.
 */

export const LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE =
  "Live is temporarily unavailable. Please try again in a moment.";

export const LIVE_DATABASE_UNAVAILABLE_MESSAGE =
  "Live is temporarily unavailable. Please try again in a moment.";

export const LIVE_MEDIA_UNAVAILABLE_MESSAGE =
  "Live video is temporarily unavailable. Please try again in a moment.";

export const LIVE_MEDIA_NOT_CONFIGURED_MESSAGE =
  "Live video is temporarily unavailable. Please try again later.";

const TECHNICAL_PATTERNS: RegExp[] = [
  /\.sql\b/i,
  /supabase\/migrations/i,
  /live_streaming_v\d/i,
  /live_media_v\d/i,
  /LIVEKIT_[A-Z0-9_]+/i,
  /NEXT_PUBLIC_LIVEKIT/i,
  /DATABASE_URL/i,
  /schema cache/i,
  /does not exist/i,
  /relation ["']?public\./i,
  /column .* of relation/i,
  /PGRST\d+/i,
  /postgres/i,
  /stack trace/i,
  /at\s+\w+\s+\(/i,
  /wss:\/\//i,
  /api[_-]?key/i,
  /api[_-]?secret/i,
];

const ALLOWED_PREFIXES = [
  "unable to",
  "please",
  "sign in",
  "authentication",
  "this live room",
  "live room",
  "live is",
  "live video",
  "network",
  "reconnecting",
  "realtime",
  "you cannot",
  "media room",
  "title must",
  "message must",
  "invalid",
  "reported",
];

export function isTechnicalLiveMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Map any raw Live error to safe UI copy.
 * Known short product messages pass through; technical ones are replaced.
 */
export function toLiveUserFacingMessage(
  raw: string | null | undefined,
  fallback: string = LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE
): string {
  if (raw == null) {
    return fallback;
  }

  const trimmed = String(raw).trim();
  if (!trimmed) {
    return fallback;
  }

  if (isTechnicalLiveMessage(trimmed)) {
    return fallback;
  }

  const lower = trimmed.toLowerCase();
  const looksProduct = ALLOWED_PREFIXES.some((prefix) =>
    lower.startsWith(prefix)
  );

  // Cap length and reject opaque internal blobs.
  if (trimmed.length > 180) {
    return fallback;
  }

  if (!looksProduct && /[_/[\]{}]/.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
