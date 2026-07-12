"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { DemoVideo } from "../../data/videos";
import { writeJourneyHandoff } from "../../lib/journey/handoff";
import type { JourneyTransitionPhase } from "../../lib/journey/transitionPhases";
import { useMotionApi } from "../motion/useMotion";
import WatchToJourneyOverlay from "./WatchToJourneyOverlay";
import {
  buildWatchToJourneyHandoff,
  buildWatchToJourneyHref,
  buildWatchToJourneyStartOptions,
  getWatchToJourneyHardFallbackMs,
  mapEnginePhaseToOverlayPhase,
  resolveWatchToJourneyProfile,
  shouldUnlockWatchAfterMotionResult,
} from "./watchToJourneyMotion";
import { WATCH_TO_JOURNEY_TRANSITION_ID } from "../../motion/transitions/watch-to-journey";

type JourneyTransitionDirectorProps = {
  active: boolean;
  video: DemoVideo;
  stageRef: RefObject<HTMLElement | null>;
  onPauseVideo: () => void;
  onSettled?: () => void;
  onNavigateFailed?: () => void;
};

/**
 * Thin adapter: Motion Engine owns timing; this component maps events → overlay
 * and owns Watch-specific pause / handoff / navigation.
 */
export default function JourneyTransitionDirector({
  active,
  video,
  stageRef,
  onPauseVideo,
  onSettled,
  onNavigateFailed,
}: JourneyTransitionDirectorProps) {
  const router = useRouter();
  const { startTransition, subscribe, cancel: cancelMotion } = useMotionApi();
  const [phase, setPhase] = useState<JourneyTransitionPhase>("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cityLabel, setCityLabel] = useState(video.location.city);
  const navigatedRef = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const hardFallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      navigatedRef.current = false;
      runIdRef.current = null;
      if (hardFallbackTimerRef.current !== null) {
        window.clearTimeout(hardFallbackTimerRef.current);
        hardFallbackTimerRef.current = null;
      }
      const resetFrame = requestAnimationFrame(() => {
        setPhase("idle");
      });
      return () => cancelAnimationFrame(resetFrame);
    }

    let cancelled = false;
    navigatedRef.current = false;
    runIdRef.current = null;

    const profile = resolveWatchToJourneyProfile();
    const isReduced = profile === "reduced";
    const handoff = buildWatchToJourneyHandoff(video, stageRef.current);
    const href = buildWatchToJourneyHref(handoff);

    const metaFrame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      setReducedMotion(isReduced);
      setCityLabel(handoff.location.city);
    });

    function clearHardFallback() {
      if (hardFallbackTimerRef.current !== null) {
        window.clearTimeout(hardFallbackTimerRef.current);
        hardFallbackTimerRef.current = null;
      }
    }

    function navigateNow(reason: string) {
      if (cancelled || navigatedRef.current) {
        return;
      }

      navigatedRef.current = true;
      setPhase("navigate_handoff");
      clearHardFallback();

      try {
        writeJourneyHandoff(handoff);
      } catch (error) {
        console.error("Failed to write journey handoff:", error);
      }

      const failHard = (error: unknown) => {
        console.error(`Journey navigation failed (${reason}):`, error);

        try {
          window.location.assign(href);
          onSettled?.();
        } catch (fallbackError) {
          console.error("Journey hard navigation failed:", fallbackError);
          navigatedRef.current = false;
          onNavigateFailed?.();
        }
      };

      try {
        const result = router.push(href) as void | Promise<unknown>;
        onSettled?.();

        if (result && typeof (result as Promise<unknown>).then === "function") {
          void (result as Promise<unknown>).catch(failHard);
        }
      } catch (error) {
        failHard(error);
      }
    }

    function unlockFromFailure() {
      if (cancelled || navigatedRef.current) {
        return;
      }

      clearHardFallback();
      onNavigateFailed?.();
    }

    try {
      onPauseVideo();
    } catch (error) {
      console.error("Pause during journey transition failed:", error);
    }

    try {
      writeJourneyHandoff(handoff);
    } catch (error) {
      console.error("Failed to write journey handoff at start:", error);
    }

    const unsubscribe = subscribe((event) => {
      if (cancelled) {
        return;
      }

      if (
        runIdRef.current &&
        "runId" in event &&
        event.runId !== runIdRef.current
      ) {
        return;
      }

      if (event.type === "transition:start") {
        if (event.transitionId !== WATCH_TO_JOURNEY_TRANSITION_ID) {
          return;
        }
        runIdRef.current = event.runId;
        return;
      }

      if (event.type === "phase:start") {
        if (
          runIdRef.current &&
          event.runId !== runIdRef.current
        ) {
          return;
        }

        const overlayPhase = mapEnginePhaseToOverlayPhase(event.phaseId);
        setPhase(overlayPhase);

        if (overlayPhase === "pause_video") {
          try {
            onPauseVideo();
          } catch (error) {
            console.error("Pause on engine phase failed:", error);
          }
        }
      }
    });

    hardFallbackTimerRef.current = window.setTimeout(() => {
      navigateNow("hard-fallback-timeout");
    }, getWatchToJourneyHardFallbackMs(isReduced));

    const startOptions = buildWatchToJourneyStartOptions({
      handoff,
      profile,
      onComplete: () => {
        navigateNow("motion-complete");
      },
      onFail: unlockFromFailure,
      onCancel: unlockFromFailure,
    });

    void startTransition(startOptions).then((result) => {
      if (cancelled) {
        return;
      }

      if (shouldUnlockWatchAfterMotionResult(result)) {
        unlockFromFailure();
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(metaFrame);
      unsubscribe();
      clearHardFallback();
      cancelMotion();
    };
  }, [
    active,
    video,
    stageRef,
    onPauseVideo,
    onSettled,
    onNavigateFailed,
    router,
    startTransition,
    subscribe,
    cancelMotion,
  ]);

  return (
    <WatchToJourneyOverlay
      active={active}
      phase={phase}
      reducedMotion={reducedMotion}
      videoTitle={video.title}
      cityLabel={cityLabel}
    />
  );
}
