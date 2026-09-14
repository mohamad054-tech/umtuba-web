/**
 * User mute intent for Home / Discover / Watch.
 * Separate from the current element's muted flag so a browser autoplay
 * rejection can play muted without forgetting that the viewer unmuted.
 */

export const FEED_AUDIO_STORAGE_KEY = "umtuba.feed.unmuted";

let preferredUnmuted = false;
let memoryHydrated = false;

function readStoredUnmuted(): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.sessionStorage.getItem(FEED_AUDIO_STORAGE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {
    // Private mode / blocked storage — keep memory only.
  }
  return null;
}

function hydrateFromStorage(): void {
  if (memoryHydrated) {
    return;
  }
  memoryHydrated = true;
  const stored = readStoredUnmuted();
  if (stored !== null) {
    preferredUnmuted = stored;
  }
}

export function readFeedUnmutedPreference(): boolean {
  hydrateFromStorage();
  return preferredUnmuted;
}

/** True when the next clip should start muted. */
export function preferredFeedMuted(): boolean {
  return !readFeedUnmutedPreference();
}

export function writeFeedUnmutedPreference(unmuted: boolean): void {
  preferredUnmuted = unmuted;
  memoryHydrated = true;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(FEED_AUDIO_STORAGE_KEY, unmuted ? "1" : "0");
  } catch {
    // Ignore quota / private-mode failures; memory still holds the choice.
  }
}

/** Test-only: drop memory + storage so cases do not leak. */
export function resetFeedAudioPreferenceForTests(): void {
  preferredUnmuted = false;
  memoryHydrated = false;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(FEED_AUDIO_STORAGE_KEY);
  } catch {
    // ignore
  }
}
