"use client";

import { Suspense, useCallback, useState } from "react";
import JourneyGlobe from "../components/JourneyGlobe";
import { useJourneyHandoffArrival } from "../components/journey-transition/useJourneyHandoff";
import DestinationArrivalCard from "../components/journey/DestinationArrivalCard";
import {
  isArrivalCardPhase,
  resolveGlobeDestination,
  type PostJourneyArrivalPhase,
} from "../components/journey/handoffArrival";

function PostJourneyGlobeSectionInner() {
  const { ready, fromWatch, handoff } = useJourneyHandoffArrival();
  const [arrivalPhase, setArrivalPhase] =
    useState<PostJourneyArrivalPhase>("idle");
  const [exploreOpen, setExploreOpen] = useState(false);

  const cinematicHandoff = fromWatch ? handoff : null;
  const destination = resolveGlobeDestination(cinematicHandoff);

  const handlePhaseChange = useCallback((phase: PostJourneyArrivalPhase) => {
    setArrivalPhase(phase);
  }, []);

  const showCard =
    Boolean(cinematicHandoff) && isArrivalCardPhase(arrivalPhase);

  if (!ready) {
    return (
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b18]">
        <div className="flex h-[620px] items-center justify-center text-sm text-white/50">
          Loading globe...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fromWatch && !handoff ? (
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/55">
          Journey handoff was missing or expired. Showing the default Post
          Journey globe.
        </div>
      ) : null}

      {fromWatch && handoff ? (
        <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
            Arrived from Watch
          </p>
          <p className="mt-2 text-lg font-black text-white">{handoff.title}</p>
          <p className="mt-1 text-sm text-cyan-50/70">
            {handoff.authorName} · {destination.city.name},{" "}
            {destination.city.country}
            {destination.usedFallback
              ? " · safe fallback destination"
              : ""}
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b18]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Global Journey Globe</h2>
            <p className="mt-1 text-sm text-white/50">
              Watch content travel around the world in real time.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-bold text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            Live Journey
          </div>
        </div>

        <div className="relative">
          <JourneyGlobe
            handoff={cinematicHandoff}
            onArrivalPhaseChange={handlePhaseChange}
          />

          {showCard && handoff ? (
            <DestinationArrivalCard
              city={destination.city.name}
              country={destination.city.country}
              videoTitle={handoff.title}
              creator={handoff.authorName}
              usedFallback={destination.usedFallback}
              onExplore={() => setExploreOpen(true)}
            />
          ) : null}
        </div>
      </div>

      {exploreOpen && handoff ? (
        <section
          id="destination-explore"
          className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
                Explore destination
              </p>
              <h3 className="mt-2 text-2xl font-black">
                {destination.city.name}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
                Placeholder discovery surface for creators, places, and
                opportunities in {destination.city.name}. Backend connections
                come later — this panel stays on Post Journey for now.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExploreOpen(false)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {["Creators nearby", "Local ideas", "Open opportunities"].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-white/40"
                >
                  {label}
                </div>
              )
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function PostJourneyGlobeSection() {
  return (
    <Suspense
      fallback={
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b18]">
          <div className="flex h-[620px] items-center justify-center text-sm text-white/50">
            Loading globe...
          </div>
        </div>
      }
    >
      <PostJourneyGlobeSectionInner />
    </Suspense>
  );
}
