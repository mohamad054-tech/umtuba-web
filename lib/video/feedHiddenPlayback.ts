/**
 * Phone home / lock: feed videos must stop and leave the notification player.
 * Quran audio on /hifz keeps playing when the screen locks.
 */

let feedPlaybackSuppressed = false;

export function isHifzPath(pathname: string): boolean {
  const path = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  return path === "/hifz" || path.startsWith("/hifz/");
}

/** Feed and Watch pause when the page hides. Hifz does not. */
export function shouldPauseMediaOnPageHide(pathname: string): boolean {
  return !isHifzPath(pathname);
}

export function isFeedPlaybackSuppressed(): boolean {
  return feedPlaybackSuppressed;
}

export function suppressFeedPlayback(): void {
  feedPlaybackSuppressed = true;
}

/** Only an explicit play or unmute may allow sound again. */
export function releaseFeedPlaybackSuppression(): void {
  feedPlaybackSuppressed = false;
}

export function clearFeedMediaSession(): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  const session = navigator.mediaSession;
  try {
    session.metadata = null;
  } catch {
    // Some browsers reject a null metadata assignment.
  }
  try {
    session.playbackState = "none";
  } catch {
    // playbackState is not writable on every engine.
  }
  for (const action of ["play", "pause", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as const) {
    try {
      session.setActionHandler(action, null);
    } catch {
      // Some engines reject clearing a handler that was never set.
    }
  }
}

export function pauseFeedVideosForHiddenPage(
  pathname: string = typeof window === "undefined" ? "/" : window.location.pathname
): void {
  if (!shouldPauseMediaOnPageHide(pathname)) return;
  suppressFeedPlayback();
  if (typeof document !== "undefined") {
    document.querySelectorAll("video").forEach((video) => {
      video.pause();
    });
  }
  clearFeedMediaSession();
}
