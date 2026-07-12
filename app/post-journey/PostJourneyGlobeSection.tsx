"use client";

import { useCallback, useMemo, useState } from "react";
import JourneyGlobe from "../components/JourneyGlobe";
import { useJourneyHandoffArrival } from "../components/journey-transition/useJourneyHandoff";
import DestinationArrivalCard from "../components/journey/DestinationArrivalCard";
import {
  isArrivalCardPhase,
  resolveGlobeDestination,
  type PostJourneyArrivalPhase,
} from "../components/journey/handoffArrival";
import GlobeToCityDirector from "../components/globe-to-city/GlobeToCityDirector";
import {
  buildGlobeToCityHandoff,
  resolveGlobeToCityProfile,
  type GlobeToCityPhase,
} from "../components/globe-to-city/globeToCityMotion";
import type { CityHandoffPayload } from "../lib/city/handoff";

export default function PostJourneyGlobeSection() {
  const { ready, fromWatch, handoff } = useJourneyHandoffArrival();
  const [arrivalPhase, setArrivalPhase] =
    useState<PostJourneyArrivalPhase>("idle");
  const [cityEntryActive, setCityEntryActive] = useState(false);
  const [cityEntryPhase, setCityEntryPhase] =
    useState<GlobeToCityPhase>("idle");
  const [cityEntryHandoff, setCityEntryHandoff] =
    useState<CityHandoffPayload | null>(null);
  const [cardHidden, setCardHidden] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const cinematicHandoff = fromWatch ? handoff : null;
  const destination = resolveGlobeDestination(cinematicHandoff);
  const cityEntryReducedMotion = useMemo(
    () => resolveGlobeToCityProfile() === "reduced",
    []
  );

  const handlePhaseChange = useCallback((phase: PostJourneyArrivalPhase) => {
    setArrivalPhase(phase);
  }, []);

  const showCard =
    Boolean(cinematicHandoff) &&
    isArrivalCardPhase(arrivalPhase) &&
    (!cardHidden || cityEntryActive);

  const handleExplore = useCallback(() => {
    if (!handoff || cityEntryActive) {
      return;
    }

    setEntryError(null);
    setCardHidden(true);

    const nextHandoff = buildGlobeToCityHandoff({
      city: destination.city.name,
      country: destination.city.country,
      lat: destination.city.lat,
      lng: destination.city.lng,
      videoId: handoff.videoId,
      title: handoff.title,
      authorName: handoff.authorName,
    });

    setCityEntryHandoff(nextHandoff);
    setCityEntryActive(true);
  }, [handoff, cityEntryActive, destination.city]);

  const handleCityPhaseChange = useCallback((phase: GlobeToCityPhase) => {
    setCityEntryPhase(phase);
  }, []);

  const handleRecover = useCallback((message: string) => {
    setCityEntryActive(false);
    setCityEntryPhase("idle");
    setCityEntryHandoff(null);
    setCardHidden(false);
    setEntryError(message);
  }, []);

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

      {entryError ? (
        <div
          role="status"
          className="rounded-[24px] border border-amber-300/25 bg-amber-300/10 px-5 py-4 text-sm text-amber-50/90"
        >
          {entryError}
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
            cityEntryPhase={cityEntryPhase}
            cityEntryReducedMotion={cityEntryReducedMotion}
          />

          {showCard && handoff ? (
            <DestinationArrivalCard
              city={destination.city.name}
              country={destination.city.country}
              videoTitle={handoff.title}
              creator={handoff.authorName}
              usedFallback={destination.usedFallback}
              onExplore={handleExplore}
              exploreDisabled={cityEntryActive}
              fadingOut={cardHidden}
            />
          ) : null}

          {cityEntryActive && cityEntryHandoff ? (
            <GlobeToCityDirector
              active={cityEntryActive}
              handoff={cityEntryHandoff}
              onPhaseChange={handleCityPhaseChange}
              onRecover={handleRecover}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
