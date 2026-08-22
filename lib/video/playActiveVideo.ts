export type ActiveVideoPlayResult =
  | "played"
  | "muted_fallback"
  | "blocked";

/**
 * Start the newly active video. Respects the caller's mute preference first.
 * If the browser blocks unmuted autoplay, fall back to muted play so A→B
 * still starts and only one player is audible.
 */
export async function playActiveVideo(
  video: Pick<HTMLVideoElement, "muted" | "play">,
  muted: boolean
): Promise<ActiveVideoPlayResult> {
  video.muted = muted;

  try {
    await video.play();
    return "played";
  } catch {
    if (video.muted) {
      return "blocked";
    }

    video.muted = true;
    try {
      await video.play();
      return "muted_fallback";
    } catch {
      return "blocked";
    }
  }
}
