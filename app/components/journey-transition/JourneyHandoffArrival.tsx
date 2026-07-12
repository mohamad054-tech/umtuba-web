"use client";

import { Suspense } from "react";
import { useJourneyHandoffArrival } from "./useJourneyHandoff";

function JourneyHandoffArrivalInner() {
  const { ready, fromWatch, handoff } = useJourneyHandoffArrival();

  if (!ready || !fromWatch) {
    return null;
  }

  if (!handoff) {
    return (
      <div className="mb-6 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/55">
        Journey handoff was missing or expired. Showing the default Post Journey
        globe.
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
        Arrived from Watch
      </p>
      <p className="mt-2 text-lg font-black text-white">
        {handoff.title}
      </p>
      <p className="mt-1 text-sm text-cyan-50/70">
        {handoff.authorName} · {handoff.location.city}, {handoff.location.country}
        {!handoff.location.matchedJourneyCity
          ? " · mapped to nearest journey city"
          : ""}
      </p>
      <p className="mt-3 text-xs text-white/45">
        Globe orientation / path / pulse polish will build on this handoff in a
        later slice. Existing globe is unchanged.
      </p>
    </div>
  );
}

export default function JourneyHandoffArrival() {
  return (
    <Suspense fallback={null}>
      <JourneyHandoffArrivalInner />
    </Suspense>
  );
}
