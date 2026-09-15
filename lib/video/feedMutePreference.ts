/**
 * Shared Watch / Home / Learning Hub feed sound preference.
 *
 * userWantsSound is the visitor's intent. Only an explicit unmute/mute
 * control may change it. Persist it in a client-readable cookie so a
 * returning visitor keeps sound on without a server roundtrip.
 *
 * isCurrentlyMuted lives on each <video> — never write autoplay fallback
 * into this cookie.
 *
 * Cold visit (no cookie) => userWantsSound false. Browsers require muted
 * autoplay until a gesture.
 */

export const FEED_SOUND_COOKIE_NAME = "umtuba_feed_sound";
export const FEED_SOUND_COOKIE_ON = "1";
export const FEED_SOUND_COOKIE_OFF = "0";
export const FEED_SOUND_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function feedSoundCookieOptions(
  maxAge = FEED_SOUND_COOKIE_MAX_AGE_SECONDS
) {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function parseFeedSoundCookieValue(
  value: string | null | undefined
): boolean | null {
  if (value === FEED_SOUND_COOKIE_ON) return true;
  if (value === FEED_SOUND_COOKIE_OFF) return false;
  return null;
}

export function readDocumentCookie(
  name: string,
  cookieHeader?: string | null
): string | null {
  const raw =
    cookieHeader ??
    (typeof document === "undefined" ? "" : document.cookie);
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

/** Missing / invalid cookie => cold visit => sound off. */
export function readUserWantsSound(
  cookieHeader?: string | null
): boolean {
  return (
    parseFeedSoundCookieValue(
      readDocumentCookie(FEED_SOUND_COOKIE_NAME, cookieHeader)
    ) === true
  );
}

/** New <video> elements start muted unless the visitor already asked for sound. */
export function initialElementMuted(userWantsSound: boolean): boolean {
  return !userWantsSound;
}

export function buildFeedSoundDocumentCookie(userWantsSound: boolean): string {
  const opts = feedSoundCookieOptions();
  const parts = [
    `${FEED_SOUND_COOKIE_NAME}=${
      userWantsSound ? FEED_SOUND_COOKIE_ON : FEED_SOUND_COOKIE_OFF
    }`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

const feedSoundListeners = new Set<() => void>();

export function subscribeFeedSoundPreference(listener: () => void): () => void {
  feedSoundListeners.add(listener);
  return () => {
    feedSoundListeners.delete(listener);
  };
}

function notifyFeedSoundListeners(): void {
  feedSoundListeners.forEach((listener) => listener());
}

export function persistUserWantsSound(userWantsSound: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = buildFeedSoundDocumentCookie(userWantsSound);
  notifyFeedSoundListeners();
}
