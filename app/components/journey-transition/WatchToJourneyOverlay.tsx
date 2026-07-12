"use client";

import type { JourneyTransitionPhase } from "../../lib/journey/transitionPhases";

type WatchToJourneyOverlayProps = {
  active: boolean;
  phase: JourneyTransitionPhase;
  reducedMotion: boolean;
  videoTitle: string;
  cityLabel: string;
};

export default function WatchToJourneyOverlay({
  active,
  phase,
  reducedMotion,
  videoTitle,
  cityLabel,
}: WatchToJourneyOverlayProps) {
  if (!active || phase === "idle" || phase === "complete") {
    return null;
  }

  const fading =
    phase === "fade_ui" ||
    phase === "zoom_out_stage" ||
    phase === "morph_to_globe" ||
    phase === "navigate_handoff" ||
    phase === "pause_video";

  const zooming = !reducedMotion && phase === "zoom_out_stage";
  const morphing = !reducedMotion && phase === "morph_to_globe";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`absolute inset-0 bg-[#050510] transition-opacity duration-300 ${
          fading ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-0 transition-all duration-500 ${
          zooming || morphing ? "scale-110 opacity-100" : "scale-100 opacity-70"
        }`}
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-[42vmax] w-[42vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute left-[40%] top-[35%] h-[28vmax] w-[28vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-3xl" />
      </div>

      <div
        className={`relative z-10 mx-6 max-w-md rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-7 text-center text-white backdrop-blur-xl transition-all duration-500 ${
          morphing ? "scale-95 opacity-100" : "scale-100 opacity-100"
        } ${reducedMotion ? "" : ""}`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          Post Journey
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">{videoTitle}</h2>
        <p className="mt-3 text-sm text-white/60">
          Leaving Watch · Opening the globe near {cityLabel}
        </p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-400 ${
              reducedMotion
                ? "w-full"
                : phase === "fade_ui"
                  ? "w-1/3"
                  : phase === "zoom_out_stage"
                    ? "w-2/3"
                    : "w-full"
            } transition-all duration-500`}
          />
        </div>
      </div>
    </div>
  );
}
