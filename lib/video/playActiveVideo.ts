export type ActiveVideoPlayResult =
  | "played"
  | "muted_fallback"
  | "blocked";

type PauseableVideo = Pick<HTMLVideoElement, "muted" | "pause">;
type PlayableVideo = Pick<HTMLVideoElement, "muted" | "play"> &
  Partial<Pick<HTMLVideoElement, "pause">>;

let claimedVideo: PlayableVideo | null = null;
let playEpoch = 0;

/**
 * Stop a departing Watch/Home player immediately, including audio.
 * Mute first so a stale play() cannot keep the previous clip audible.
 */
export function pauseInactiveVideo(video: PauseableVideo): void {
  video.muted = true;
  video.pause();
  if (claimedVideo === video) {
    claimedVideo = null;
  }
}

function releaseIfClaimed(video: PlayableVideo): void {
  if (claimedVideo === video && typeof video.pause === "function") {
    pauseInactiveVideo(video as PauseableVideo);
    return;
  }
  if (claimedVideo === video) {
    claimedVideo = null;
  }
}

/**
 * Start the newly active video. Respects the caller's mute preference first.
 * If the browser blocks unmuted autoplay, fall back to muted play so A→B
 * still starts and only one player is audible.
 * Always pauses the previously claimed player first so two clips cannot
 * stay playing after a Watch transition.
 */
export async function playActiveVideo(
  video: PlayableVideo,
  muted: boolean
): Promise<ActiveVideoPlayResult> {
  if (claimedVideo && claimedVideo !== video && typeof claimedVideo.pause === "function") {
    pauseInactiveVideo(claimedVideo as PauseableVideo);
  }

  claimedVideo = video;
  const epoch = ++playEpoch;
  video.muted = muted;

  const finish = (result: ActiveVideoPlayResult): ActiveVideoPlayResult => {
    if (playEpoch !== epoch || claimedVideo !== video) {
      if (typeof video.pause === "function") {
        pauseInactiveVideo(video as PauseableVideo);
      }
      return result === "blocked" ? "blocked" : result;
    }
    return result;
  };

  try {
    await video.play();
    return finish("played");
  } catch {
    if (video.muted) {
      return finish("blocked");
    }

    video.muted = true;
    try {
      await video.play();
      return finish("muted_fallback");
    } catch {
      releaseIfClaimed(video);
      return "blocked";
    }
  }
}
