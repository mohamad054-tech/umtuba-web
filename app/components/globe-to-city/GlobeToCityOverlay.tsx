"use client";

import type { GlobeToCityPhase } from "./globeToCityMotion";

type GlobeToCityOverlayProps = {
  active: boolean;
  phase: GlobeToCityPhase;
  reducedMotion: boolean;
  cityName: string;
  country: string;
};

export default function GlobeToCityOverlay({
  active,
  phase,
  reducedMotion,
  cityName,
  country,
}: GlobeToCityOverlayProps) {
  if (!active || phase === "idle" || phase === "complete") {
    return null;
  }

  const fading = phase === "fade_route" || phase === "navigate_city";
  const portal =
    !reducedMotion &&
    (phase === "portal_expand" || phase === "fade_route" || phase === "navigate_city");

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden rounded-3xl"
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
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/30 bg-cyan-300/10 transition-all duration-700 ${
          portal
            ? "h-[min(70vmin,420px)] w-[min(70vmin,420px)] opacity-100"
            : "h-16 w-16 opacity-40"
        } ${reducedMotion ? "opacity-0" : ""}`}
        aria-hidden
      />

      <div
        className={`relative z-10 mx-6 max-w-sm rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-6 text-center text-white backdrop-blur-xl transition-opacity duration-300 ${
          fading || portal ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-300">
          Entering city
        </p>
        <h2 className="mt-3 text-2xl font-black tracking-tight">{cityName}</h2>
        <p className="mt-2 text-sm text-white/60">{country}</p>
      </div>
    </div>
  );
}
