/**
 * Signed playback remint policy — one automatic remint per video id,
 * then surface a user-facing error (manual retry may remint again).
 */

export const PLAYBACK_EXPIRED_MESSAGE = "Playback link expired.";
export const PLAYBACK_UNAVAILABLE_MESSAGE = "Unable to play this video.";
export const PLAYBACK_DELETED_MESSAGE = "This video was deleted.";

export function shouldAutoRemintPlayback(input: {
  hasPostId: boolean;
  autoRemintAttempted: boolean;
}): boolean {
  return input.hasPostId && !input.autoRemintAttempted;
}

export function playbackStatusAfterRemintFailure(deleted?: boolean):
  | "deleted"
  | "expired" {
  return deleted ? "deleted" : "expired";
}
