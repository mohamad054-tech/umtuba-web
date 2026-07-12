import { GLOBE_CITIES, type GlobeCity } from "../../components/journey/handoffArrival";
import { slugifyCity } from "../journey/handoff";

export type ResolvedCity = {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  color: string;
  known: boolean;
};

function titleCaseSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function cityToSlug(cityName: string) {
  return slugifyCity(cityName) || "city";
}

export function findKnownCityBySlug(slug: string): GlobeCity | null {
  const normalized = slugifyCity(slug);

  if (!normalized) {
    return null;
  }

  return (
    GLOBE_CITIES.find(
      (city) => cityToSlug(city.name) === normalized
    ) ?? null
  );
}

/**
 * Resolve a city slug for /city/[citySlug].
 * Unknown slugs never throw — they return a safe generic shell.
 */
export function resolveCityFromSlug(slug: string): ResolvedCity {
  const normalized = slugifyCity(slug) || "city";
  const known = findKnownCityBySlug(normalized);

  if (known) {
    return {
      slug: cityToSlug(known.name),
      name: known.name,
      country: known.country,
      lat: known.lat,
      lng: known.lng,
      color: known.color,
      known: true,
    };
  }

  return {
    slug: normalized,
    name: titleCaseSlug(normalized) || "Unknown city",
    country: "Somewhere on Earth",
    lat: 0,
    lng: 0,
    color: "#67e8f9",
    known: false,
  };
}

export function resolveCityFromNameCountry(input: {
  city: string;
  country: string;
  lat?: number;
  lng?: number;
}): ResolvedCity {
  const slug = cityToSlug(input.city);
  const known = findKnownCityBySlug(slug);

  if (known) {
    return {
      slug: cityToSlug(known.name),
      name: known.name,
      country: known.country,
      lat: known.lat,
      lng: known.lng,
      color: known.color,
      known: true,
    };
  }

  const lat =
    typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : 0;
  const lng =
    typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : 0;

  return {
    slug: slug || "city",
    name: input.city.trim() || "Unknown city",
    country: input.country.trim() || "Somewhere on Earth",
    lat,
    lng,
    color: "#67e8f9",
    known: false,
  };
}
