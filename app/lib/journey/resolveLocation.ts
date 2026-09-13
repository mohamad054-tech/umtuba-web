import { journeyCities } from "../../components/journey-pro/journeyData";
import { isoCountryCenter } from "../../../lib/geo/isoCountryCenters";
import type { JourneyHandoffLocation } from "./handoff";

function normalizeCityName(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Map a watch location onto journey/display coordinates.
 * Missing origin → null (never invent Jerusalem or a country centroid write).
 * Country centroid is used only when we have an ISO-2 code (display-time).
 */
export function resolveJourneyLocation(
  input:
    | {
        city?: string | null;
        country?: string | null;
        countryCode?: string | null;
      }
    | null
    | undefined
): JourneyHandoffLocation | null {
  if (!input) return null;

  const city = input.city?.trim() ?? "";
  const country = input.country?.trim() ?? "";
  if (!city && !country && !input.countryCode) return null;

  if (city) {
    const matched =
      journeyCities.find(
        (item) => normalizeCityName(item.name) === normalizeCityName(city)
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
  }

  const center = isoCountryCenter(input.countryCode);
  if (center) {
    return {
      city: city || center.name,
      country: country || center.name,
      lat: center.lat,
      lng: center.lng,
      matchedJourneyCity: false,
    };
  }

  return null;
}

export function findJourneyCityIndex(cityName: string) {
  const cityQuery = normalizeCityName(cityName);
  const index = journeyCities.findIndex(
    (city) => normalizeCityName(city.name) === cityQuery
  );

  return index >= 0 ? index : 0;
}
