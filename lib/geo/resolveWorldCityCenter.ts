import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeOriginCity } from "./postOrigin";

export type WorldCityCenterRow = {
  city_name: string;
  center_latitude: number;
  center_longitude: number;
};

export function matchWorldCityCenter(
  rows: readonly WorldCityCenterRow[],
  city: string
): { lat: number; lng: number } | null {
  const needle = sanitizeOriginCity(city);
  if (!needle) return null;
  const normalized = needle.toLowerCase();

  for (const row of rows) {
    const name = sanitizeOriginCity(row.city_name);
    if (!name || name.toLowerCase() !== normalized) continue;
    const lat = Number(row.center_latitude);
    const lng = Number(row.center_longitude);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }
    return { lat, lng };
  }

  return null;
}

/**
 * Look up world_cities center coords for an exact city name in one country.
 * Misses and query errors return null — never a country centroid.
 */
export async function resolveWorldCityCenter(
  supabase: SupabaseClient,
  countryCode: string,
  city: string
): Promise<{ lat: number; lng: number } | null> {
  const needle = sanitizeOriginCity(city);
  if (!needle) return null;

  const { data, error } = await supabase
    .from("world_cities")
    .select("city_name, center_latitude, center_longitude")
    .eq("country_code", countryCode)
    .eq("is_active", true)
    .ilike("city_name", needle)
    .limit(5);

  if (error || !data) {
    return null;
  }

  return matchWorldCityCenter(data as WorldCityCenterRow[], needle);
}
