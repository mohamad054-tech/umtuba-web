"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { writeCityHandoff, type CityHandoffPayload } from "../../lib/city/handoff";
import { useMotionApi } from "../motion/useMotion";
import GlobeToCityOverlay from "./GlobeToCityOverlay";
import {
  buildGlobeToCityHref,
  buildGlobeToCityStartOptions,
  getGlobeToCityHardFallbackMs,
  mapEnginePhaseToGlobeToCityPhase,
  resolveGlobeToCityProfile,
  shouldUnlockGlobeAfterMotionResult,
  type GlobeToCityPhase,
} from "./globeToCityMotion";
import { GLOBE_TO_CITY_TRANSITION_ID } from "../../motion/transitions/globe-to-city";

type GlobeToCityDirectorProps = {
  active: boolean;
  handoff: CityHandoffPayload;
  onPhaseChange?: (phase: GlobeToCityPhase) => void;
  onSettled?: () => void;
  onRecover?: (message: string) => void;
};

/**
 * Owns globe→city orchestration, navigation, lock recovery.
 * JourneyGlobe only reacts to phase props for camera/portal.
 */
export default function GlobeToCityDirector({
  active,
  handoff,
  onPhaseChange,
  onSettled,
  onRecover,
}: GlobeToCityDirectorProps) {
  const router = useRouter();
  const { startTransition, subscribe, cancel: cancelMotion } = useMotionApi();
  const [phase, setPhase] = useState<GlobeToCityPhase>("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const navigatedRef = useRef(false);
  const runIdRef = useRef<string | null>(null);
  const hardFallbackTimerRef = useRef<number | null>(null);
  const onPhaseChangeRef = useRef(onPhaseChange);
  const onSettledRef = useRef(onSettled);
  const onRecoverRef = useRef(onRecover);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
    onSettledRef.current = onSettled;
    onRecoverRef.current = onRecover;
  }, [onPhaseChange, onSettled, onRecover]);

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
        onPhaseChangeRef.current?.("idle");
      });
      return () => cancelAnimationFrame(resetFrame);
    }

    let cancelled = false;
    navigatedRef.current = false;
    runIdRef.current = null;

    const profile = resolveGlobeToCityProfile();
    const isReduced = profile === "reduced";
    const href = buildGlobeToCityHref(handoff);

    const metaFrame = requestAnimationFrame(() => {
      if (cancelled) {
        return;
      }
      setReducedMotion(isReduced);
    });

    function clearHardFallback() {
      if (hardFallbackTimerRef.current !== null) {
        window.clearTimeout(hardFallbackTimerRef.current);
        hardFallbackTimerRef.current = null;
      }
    }

    function unlock(message: string) {
      if (cancelled || navigatedRef.current) {
        return;
      }

      clearHardFallback();
      setPhase("idle");
      onPhaseChangeRef.current?.("idle");
      onRecoverRef.current?.(message);
    }

    function navigateNow(reason: string) {
      if (cancelled || navigatedRef.current) {
        return;
      }

      navigatedRef.current = true;
      setPhase("navigate_city");
      onPhaseChangeRef.current?.("navigate_city");
      clearHardFallback();

      try {
        writeCityHandoff(handoff);
      } catch (error) {
        console.error("Failed to write city handoff:", error);
      }

      const failHard = (error: unknown) => {
        console.error(`City navigation failed (${reason}):`, error);

        try {
          window.location.assign(href);
          onSettledRef.current?.();
        } catch (fallbackError) {
          console.error("City hard navigation failed:", fallbackError);
          navigatedRef.current = false;
          unlock("Could not open the city. Please try Explore again.");
        }
      };

      try {
        const result = router.push(href) as void | Promise<unknown>;
        onSettledRef.current?.();

        if (result && typeof (result as Promise<unknown>).then === "function") {
          void (result as Promise<unknown>).catch(failHard);
        }
      } catch (error) {
        failHard(error);
      }
    }

    try {
      writeCityHandoff(handoff);
    } catch (error) {
      console.error("Failed to write city handoff at start:", error);
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
        if (event.transitionId !== GLOBE_TO_CITY_TRANSITION_ID) {
          return;
        }
        runIdRef.current = event.runId;
        return;
      }

      if (event.type === "phase:start") {
        if (runIdRef.current && event.runId !== runIdRef.current) {
          return;
        }

        const nextPhase = mapEnginePhaseToGlobeToCityPhase(event.phaseId);
        setPhase(nextPhase);
        onPhaseChangeRef.current?.(nextPhase);

        if (nextPhase === "navigate_city") {
          navigateNow("navigate-phase");
        }
      }
    });

    hardFallbackTimerRef.current = window.setTimeout(() => {
      navigateNow("hard-fallback-timeout");
    }, getGlobeToCityHardFallbackMs(isReduced));

    const startOptions = buildGlobeToCityStartOptions({
      handoff,
      profile,
      onComplete: () => {
        navigateNow("motion-complete");
      },
      onFail: () => {
        unlock("City entry was interrupted. The globe is ready again.");
      },
      onCancel: () => {
        unlock("City entry was cancelled. The globe is ready again.");
      },
    });

    void startTransition(startOptions).then((result) => {
      if (cancelled) {
        return;
      }

      if (shouldUnlockGlobeAfterMotionResult(result)) {
        unlock(
          result.status === "cancelled"
            ? "City entry was cancelled. The globe is ready again."
            : "City entry failed. The globe is ready again."
        );
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(metaFrame);
      unsubscribe();
      clearHardFallback();
      cancelMotion();
    };
  }, [active, handoff, router, startTransition, subscribe, cancelMotion]);

  return (
    <GlobeToCityOverlay
      active={active}
      phase={phase}
      reducedMotion={reducedMotion}
      cityName={handoff.city}
      country={handoff.country}
    />
  );
}
