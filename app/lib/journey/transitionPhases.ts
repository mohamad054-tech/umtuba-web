export type JourneyTransitionPhase =
  | "idle"
  | "pause_video"
  | "fade_ui"
  | "zoom_out_stage"
  | "morph_to_globe"
  | "navigate_handoff"
  | "complete";

export type JourneyTransitionPlan = {
  phases: JourneyTransitionPhase[];
  durationsMs: Partial<Record<JourneyTransitionPhase, number>>;
  reducedMotion: boolean;
};

const FULL_MOTION_DURATIONS: Partial<
  Record<JourneyTransitionPhase, number>
> = {
  pause_video: 80,
  fade_ui: 320,
  zoom_out_stage: 520,
  morph_to_globe: 480,
  navigate_handoff: 40,
};

const REDUCED_MOTION_DURATIONS: Partial<
  Record<JourneyTransitionPhase, number>
> = {
  pause_video: 40,
  fade_ui: 180,
  navigate_handoff: 40,
};

export function prefersReducedMotion() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createJourneyTransitionPlan(
  reducedMotion = prefersReducedMotion()
): JourneyTransitionPlan {
  if (reducedMotion) {
    return {
      reducedMotion: true,
      phases: ["pause_video", "fade_ui", "navigate_handoff", "complete"],
      durationsMs: REDUCED_MOTION_DURATIONS,
    };
  }

  return {
    reducedMotion: false,
    phases: [
      "pause_video",
      "fade_ui",
      "zoom_out_stage",
      "morph_to_globe",
      "navigate_handoff",
      "complete",
    ],
    durationsMs: FULL_MOTION_DURATIONS,
  };
}

export function getPhaseDurationMs(
  plan: JourneyTransitionPlan,
  phase: JourneyTransitionPhase
) {
  return plan.durationsMs[phase] ?? 0;
}

/** Upper bound for the full phase sequence, used as a hard navigation fallback. */
export function getMaxTransitionDurationMs(plan: JourneyTransitionPlan) {
  const sequenced = plan.phases.reduce((total, phase) => {
    if (phase === "complete" || phase === "idle") {
      return total;
    }

    return total + getPhaseDurationMs(plan, phase);
  }, 0);

  // Buffer so the fallback never races a healthy machine.
  return sequenced + 400;
}
