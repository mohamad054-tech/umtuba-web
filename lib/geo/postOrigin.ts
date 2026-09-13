import type { DiscoverLocation } from "../../app/discover/types";
import {
  ISO_COUNTRY_CENTERS,
  isoCountryCenter,
  isoCountryDisplayName,
  normalizeIsoCountryCode,
} from "./isoCountryCenters";

export const ORIGIN_CITY_MAX_LENGTH = 120;

export type PostOriginDraft = {
  countryCode: string;
  city: string;
};

export type SanitizedPostOrigin = {
  countryCode: string | null;
  city: string | null;
};

export type PostOriginWrite = {
  origin_country_code: string;
  origin_city: string | null;
  origin_lat: number | null;
  origin_lng: number | null;
};

export type PostOriginRow = {
  origin_country_code?: string | null;
  origin_city?: string | null;
};

export function emptyPostOriginDraft(): PostOriginDraft {
  return { countryCode: "", city: "" };
}

export function sanitizeOriginCity(value: string | null | undefined): string | null {
  const city = (value ?? "").trim().replace(/\s+/g, " ");
  if (!city) return null;
  return city.slice(0, ORIGIN_CITY_MAX_LENGTH);
}

export function sanitizePostOrigin(input: {
  countryCode?: string | null;
  city?: string | null;
}): SanitizedPostOrigin {
  const countryCode = normalizeIsoCountryCode(input.countryCode);
  if (!countryCode || !ISO_COUNTRY_CENTERS[countryCode]) {
    return { countryCode: null, city: null };
  }

  return {
    countryCode,
    city: sanitizeOriginCity(input.city),
  };
}

export function isMissingOriginColumnError(
  error: { message?: string; code?: string } | null | undefined
): boolean {
  const msg = (error?.message ?? "").toLowerCase();
  const mentionsOrigin =
    msg.includes("origin_country_code") ||
    msg.includes("origin_city") ||
    msg.includes("origin_lat") ||
    msg.includes("origin_lng");
  return (
    mentionsOrigin &&
    (msg.includes("does not exist") ||
      msg.includes("schema cache") ||
      msg.includes("could not find") ||
      error?.code === "42703" ||
      error?.code === "PGRST204")
  );
}

export function originWriteFields(
  origin: SanitizedPostOrigin,
  coords: { lat: number; lng: number } | null
): PostOriginWrite | null {
  if (!origin.countryCode) return null;
  const lat = coords && Number.isFinite(coords.lat) ? coords.lat : null;
  const lng = coords && Number.isFinite(coords.lng) ? coords.lng : null;
  const paired =
    lat != null &&
    lng != null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
      ? { origin_lat: lat, origin_lng: lng }
      : { origin_lat: null, origin_lng: null };

  return {
    origin_country_code: origin.countryCode,
    origin_city: origin.city,
    ...paired,
  };
}

export function localizedIsoCountryName(
  locale: string,
  code: string | null | undefined
): string {
  const center = isoCountryCenter(code);
  if (!center) return "";
  const normalized = normalizeIsoCountryCode(code);
  if (!normalized) return "";
  try {
    const name = new Intl.DisplayNames([locale], { type: "region" }).of(
      normalized
    );
    if (name && name !== normalized) return name;
  } catch {
    // Platform display names are optional; English table is the fallback.
  }
  return center.name;
}

export function discoverLocationFromOrigin(
  row: PostOriginRow | null | undefined
): DiscoverLocation | null {
  const countryCode = normalizeIsoCountryCode(row?.origin_country_code);
  if (!countryCode || !ISO_COUNTRY_CENTERS[countryCode]) return null;
  const city = sanitizeOriginCity(row?.origin_city) ?? "";
  return {
    city,
    country: isoCountryDisplayName(countryCode),
    countryCode,
  };
}

export function formatDiscoverLocationLabel(
  location: DiscoverLocation | null | undefined
): string {
  if (!location) return "";
  const city = location.city.trim();
  const country = location.country.trim();
  if (city && country) return `${city}, ${country}`;
  return city || country;
}

export function hasDiscoverLocation(
  location: DiscoverLocation | null | undefined
): boolean {
  return formatDiscoverLocationLabel(location).length > 0;
}
