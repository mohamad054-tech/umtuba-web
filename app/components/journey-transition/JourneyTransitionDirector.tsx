"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { DemoVideo } from "../../data/videos";
import {
  buildPostJourneyHref,
  captureElementOriginRect,
  createJourneyHandoff,
  writeJourneyHandoff,
  type JourneyHandoffPayload,
} from "../../lib/journey/handoff";
import { resolveJourneyLocation } from "../../lib/journey/resolveLocation";
import {
  createJourneyTransitionPlan,
  getMaxTransitionDurationMs,
  getPhaseDurationMs,
  type JourneyTransitionPhase,
} from "../../lib/journey/transitionPhases";
import WatchToJourneyOverlay from "./WatchToJourneyOverlay";

type JourneyTransitionDirectorProps = {
  active: boolean;
  video: DemoVideo;
  stageRef: RefObject<HTMLElement | null>;
  onPauseVideo: () => void;
  onSettled?: () => void;
  onNavigateFailed?: () => void;
};

export default function JourneyTransitionDirector({
  active,
  video,
  stageRef,
  onPauseVideo,
  onSettled,
  onNavigateFailed,
}: JourneyTransitionDirectorProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<JourneyTransitionPhase>("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cityLabel, setCityLabel] = useState(video.location.city);
  const timersRef = useRef<number[]>([]);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      navigatedRef.current = false;
      const resetFrame = requestAnimationFrame(() => {
        setPhase("idle");
      });
      return () => cancelAnimationFrame(resetFrame);
    }

    let cancelled = false;
    navigatedRef.current = false;

    const plan = createJourneyTransitionPlan();
    const location = resolveJourneyLocation(video.location);
    const originRect = captureElementOriginRect(stageRef.current);
    const handoff = createJourneyHandoff({
      videoId: video.id,
      title: video.title,
      authorName: video.author.name,
      location,
      originRect,
    });
    const href = buildPostJourneyHref(handoff);

    const frame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }

      setReducedMotion(plan.reducedMotion);
      setCityLabel(location.city);
    });

    function clearTimers() {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    }

    function schedule(delayMs: number, callback: () => void) {
      const timer = window.setTimeout(() => {
        if (!cancelled) {
          callback();
        }
      }, delayMs);
      timersRef.current.push(timer);
    }

    function navigateNow(payload: JourneyHandoffPayload, reason: string) {
      if (cancelled || navigatedRef.current) {
        return;
      }

      navigatedRef.current = true;
      setPhase("navigate_handoff");

      try {
        writeJourneyHandoff(payload);
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

    // Hard guarantee: navigate even if the phase chain stalls.
    const maxDuration = getMaxTransitionDurationMs(plan);
    schedule(maxDuration, () => {
      navigateNow(handoff, "fallback-timeout");
    });

    let phaseIndex = 0;

    function runNextPhase() {
      if (cancelled || navigatedRef.current) {
        return;
      }

      const nextPhase = plan.phases[phaseIndex];

      if (!nextPhase) {
        navigateNow(handoff, "phase-list-exhausted");
        return;
      }

      setPhase(nextPhase);

      if (nextPhase === "pause_video") {
        try {
          onPauseVideo();
        } catch (error) {
          console.error("Pause during journey transition failed:", error);
        }
      }

      if (nextPhase === "navigate_handoff") {
        navigateNow(handoff, "phase-navigate");
        return;
      }

      if (nextPhase === "complete") {
        navigateNow(handoff, "phase-complete");
        return;
      }

      const duration = getPhaseDurationMs(plan, nextPhase);
      phaseIndex += 1;
      schedule(duration, runNextPhase);
    }

    // Kick the machine on the next frame so Strict Mode cleanup can cancel safely,
    // then the second effect invocation starts a fresh chain.
    schedule(0, runNextPhase);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimers();
    };
  }, [
    active,
    video,
    stageRef,
    onPauseVideo,
    onSettled,
    onNavigateFailed,
    router,
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
