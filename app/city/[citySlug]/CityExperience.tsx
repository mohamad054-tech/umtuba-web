"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  consumeCityHandoff,
  type CityHandoffPayload,
} from "../../lib/city/handoff";
import { resolveCityFromSlug, type ResolvedCity } from "../../lib/city/resolveCity";
import CityHero from "./components/CityHero";
import CityDiscoveryTabs from "./components/CityDiscoveryTabs";
import CityActionBar from "./components/CityActionBar";
import CityAiPanel from "./components/CityAiPanel";

type CityExperienceProps = {
  citySlug: string;
};

export default function CityExperience({ citySlug }: CityExperienceProps) {
  const searchParams = useSearchParams();
  const fromGlobe = searchParams.get("from") === "globe";
  const [ready, setReady] = useState(false);
  const [handoff, setHandoff] = useState<CityHandoffPayload | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const resolved: ResolvedCity = resolveCityFromSlug(citySlug);

  const displayCity =
    handoff && handoff.citySlug === resolved.slug
      ? {
          ...resolved,
          name: handoff.city,
          country: handoff.country,
          lat: handoff.lat,
          lng: handoff.lng,
        }
      : resolved;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!fromGlobe) {
        setHandoff(null);
        setReady(true);
        return;
      }

      const payload = consumeCityHandoff();
      setHandoff(payload);
      setReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [fromGlobe]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050510] text-white">
        <p className="text-sm text-white/50">Opening city...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050510] text-white">
      <CityHero
        city={displayCity.name}
        country={displayCity.country}
        known={displayCity.known}
        sourceTitle={handoff?.source.title ?? null}
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 md:py-8">
        <CityActionBar
          handoff={handoff}
          fromGlobe={fromGlobe}
          onAskAi={() => setAiOpen(true)}
        />

        <section>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            Discover this city
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
            A first look at videos, places, creators, and live energy in{" "}
            {displayCity.name}. Content below is a structured prototype —
            placeholders only.
          </p>
        </section>

        <CityDiscoveryTabs cityName={displayCity.name} />

        {aiOpen ? (
          <CityAiPanel
            cityName={displayCity.name}
            onClose={() => setAiOpen(false)}
          />
        ) : null}
      </div>
    </main>
  );
}
