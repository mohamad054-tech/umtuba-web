import { journeyCities } from "../../components/journey-pro/journeyData";
import type { JourneyHandoffLocation } from "./handoff";

const FALLBACK_CITY = journeyCities[0];

function normalizeCityName(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Map a watch video city to existing journey globe coordinates.
 * Unknown cities never throw — they fall back to the default journey origin.
 */
export function resolveJourneyLocation(input: {
  city: string;
  country: string;
}): JourneyHandoffLocation {
  const cityQuery = normalizeCityName(input.city);

  const matched =
    journeyCities.find(
      (city) => normalizeCityName(city.name) === cityQuery
    ) ?? null;

  if (matched) {
    return {
      city: matched.name,
      country: matched.country,
      lat: matched.lat,
      lng: matched.lng,
      matchedJourneyCity: true,
    };
  }

  return {
    city: FALLBACK_CITY.name,
    country: FALLBACK_CITY.country,
    lat: FALLBACK_CITY.lat,
    lng: FALLBACK_CITY.lng,
    matchedJourneyCity: false,
  };
}

export function findJourneyCityIndex(cityName: string) {
  const cityQuery = normalizeCityName(cityName);
  const index = journeyCities.findIndex(
    (city) => normalizeCityName(city.name) === cityQuery
  );

  return index >= 0 ? index : 0;
}
