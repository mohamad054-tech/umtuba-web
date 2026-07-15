import type { WatchVideo } from "../../watch/types";
import {
  buildPostJourneyHref,
  captureElementOriginRect,
  createJourneyHandoff,
  type JourneyHandoffPayload,
  type JourneyHandoffOriginRect,
} from "../../lib/journey/handoff";
import { resolveJourneyLocation } from "../../lib/journey/resolveLocation";
import {
  resolveMotionProfile,
  type MotionProfile,
  type MotionTransitionResult,
  type StartTransitionOptions,
} from "../../lib/motion";
import { WATCH_TO_JOURNEY_TRANSITION_ID } from "../../motion/transitions/watch-to-journey";
import type { JourneyTransitionPhase } from "../../lib/journey/transitionPhases";

export const WATCH_TO_JOURNEY_OVERLAY_PHASES = [
  "idle",
  "pause_video",
  "fade_ui",
  "zoom_out_stage",
  "morph_to_globe",
  "navigate_handoff",
  "complete",
] as const;

export function isWatchToJourneyOverlayPhase(
  value: string
): value is JourneyTransitionPhase {
  return (WATCH_TO_JOURNEY_OVERLAY_PHASES as readonly string[]).includes(value);
}

export function mapEnginePhaseToOverlayPhase(
  phaseId: string
): JourneyTransitionPhase {
  if (isWatchToJourneyOverlayPhase(phaseId)) {
    return phaseId;
  }

  return "fade_ui";
}

export function resolveWatchToJourneyProfile(
  matchMedia?: (query: string) => { matches: boolean }
): MotionProfile {
  // Preserve pre-migration timing: normal durations, or reduced when OS asks.
  return resolveMotionProfile("normal", { matchMedia });
}

export function buildWatchToJourneyHandoff(
  video: Pick<WatchVideo, "id" | "title" | "author" | "location" | "postId">,
  stageElement: HTMLElement | null
): JourneyHandoffPayload {
  const location = resolveJourneyLocation(video.location);
  const originRect: JourneyHandoffOriginRect | null =
    captureElementOriginRect(stageElement);

  return createJourneyHandoff({
    videoId: video.postId ? String(video.postId) : video.id,
    title: video.title,
    authorName: video.author.name,
    location,
    originRect,
  });
}

export function buildWatchToJourneyStartOptions(input: {
  handoff: JourneyHandoffPayload;
  profile: MotionProfile;
  onComplete: () => void;
  onFail: () => void;
  onCancel: () => void;
}): StartTransitionOptions<JourneyHandoffPayload> {
  return {
    type: WATCH_TO_JOURNEY_TRANSITION_ID,
    profile: input.profile,
    payload: input.handoff,
    from: "watch",
    to: "post-journey",
    concurrency: "reject",
    onComplete: input.onComplete,
    onFail: input.onFail,
    onCancel: input.onCancel,
  };
}

export function shouldUnlockWatchAfterMotionResult(
  result: MotionTransitionResult
) {
  return result.status === "failed" || result.status === "cancelled";
}

export function buildWatchToJourneyHref(handoff: JourneyHandoffPayload) {
  return buildPostJourneyHref(handoff);
}

/** Hard navigation fallback bound (engine total for normal path + buffer). */
export function getWatchToJourneyHardFallbackMs(reducedMotion: boolean) {
  if (reducedMotion) {
    return 40 + 180 + 40 + 400;
  }

  return 80 + 320 + 520 + 480 + 40 + 400;
}
