import type { JourneyHandoffPayload } from "../../lib/journey/handoff";
import { resolveJourneyLocation } from "../../lib/journey/resolveLocation";

/** Cities baked into JourneyGlobe (must stay in sync with globe markers). */
export const GLOBE_CITIES = [
  {
    name: "Jerusalem",
    country: "Palestine",
    lat: 31.7683,
    lng: 35.2137,
    color: "#ffffff",
  },
  {
    name: "Amman",
    country: "Jordan",
    lat: 31.9539,
    lng: 35.9106,
    color: "#67e8f9",
  },
  {
    name: "Istanbul",
    country: "Türkiye",
    lat: 41.0082,
    lng: 28.9784,
    color: "#a78bfa",
  },
  {
    name: "Berlin",
    country: "Germany",
    lat: 52.52,
    lng: 13.405,
    color: "#34d399",
  },
] as const;

export type GlobeCity = (typeof GLOBE_CITIES)[number];

export const POST_JOURNEY_ARRIVAL_PHASES = [
  "fade",
  "camera",
  "path",
  "pulse",
  "card",
  "focus_hold",
] as const;

export type PostJourneyArrivalPhase =
  | (typeof POST_JOURNEY_ARRIVAL_PHASES)[number]
  | "idle"
  | "complete";

function normalizeCityName(value: string) {
  return value.trim().toLowerCase();
}

export function resolveGlobeDestination(
  handoff: JourneyHandoffPayload | null | undefined
): {
  city: GlobeCity;
  index: number;
  matched: boolean;
  usedFallback: boolean;
} {
  const fallback = GLOBE_CITIES[0];

  if (!handoff?.location) {
    return {
      city: fallback,
      index: 0,
      matched: false,
      usedFallback: true,
    };
  }

  const resolved = resolveJourneyLocation({
    city: handoff.location.city,
    country: handoff.location.country,
  });

  const index = GLOBE_CITIES.findIndex(
    (city) => normalizeCityName(city.name) === normalizeCityName(resolved.city)
  );

  if (index < 0) {
    return {
      city: fallback,
      index: 0,
      matched: false,
      usedFallback: true,
    };
  }

  return {
    city: GLOBE_CITIES[index],
    index,
    matched: resolved.matchedJourneyCity,
    usedFallback: !resolved.matchedJourneyCity,
  };
}

/**
 * Origin for travel path is the previous city in the demo chain,
 * or the destination itself when index is 0 (no inbound segment).
 */
export function resolveTravelEndpoints(destinationIndex: number): {
  fromIndex: number;
  toIndex: number;
  sameOrigin: boolean;
} {
  if (destinationIndex <= 0) {
    return {
      fromIndex: 0,
      toIndex: 0,
      sameOrigin: true,
    };
  }

  return {
    fromIndex: destinationIndex - 1,
    toIndex: destinationIndex,
    sameOrigin: false,
  };
}

export function shouldDrawTravelPath(destinationIndex: number) {
  return !resolveTravelEndpoints(destinationIndex).sameOrigin;
}

export function isArrivalCardPhase(phase: PostJourneyArrivalPhase) {
  return phase === "card" || phase === "focus_hold" || phase === "complete";
}

export function mapArrivalEnginePhase(
  phaseId: string
): PostJourneyArrivalPhase {
  if (
    (POST_JOURNEY_ARRIVAL_PHASES as readonly string[]).includes(phaseId)
  ) {
    return phaseId as PostJourneyArrivalPhase;
  }

  return "fade";
}

/** Expected engine phase ids for arrival (after profile resolution). */
export function getArrivalPhaseOrder(options: {
  sameOrigin: boolean;
  reduced?: boolean;
}): string[] {
  const reduced = Boolean(options.reduced);
  const phases: string[] = ["fade", "camera"];

  if (!options.sameOrigin && !reduced) {
    phases.push("path");
  }

  phases.push("pulse", "card", "focus_hold");
  return phases;
}
