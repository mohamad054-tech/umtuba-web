import type { SupabaseClient } from "@supabase/supabase-js";

export const WORLD_PLACE_CATEGORIES = [
  "store",
  "restaurant",
  "hotel",
  "clothing",
  "cafe",
  "service",
  "attraction",
  "other",
] as const;

export type WorldPlaceCategory = (typeof WORLD_PLACE_CATEGORIES)[number];

export const WORLD_PLACE_KINDS = [
  "point_of_interest",
  "business",
  "attraction",
  "hotel",
  "restaurant",
  "store",
  "local_service",
  "other",
] as const;

export type WorldPlaceKind = (typeof WORLD_PLACE_KINDS)[number];

export type WorldFeatureFlags = {
  worldDiscoveryEnabled: boolean;
  nearbyPlacesEnabled: boolean;
  externalDirectionsEnabled: boolean;
  helloCityEnabled: boolean;
  arrivalDetectionEnabled: boolean;
};

export type WorldCity = {
  id: string;
  country_code: string;
  country_name: string;
  region_name: string | null;
  city_name: string;
  slug: string;
};

export type WorldCategory = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  sort_order: number;
};

export type DiscoveredPlace = {
  place_id: string;
  store_id: string | null;
  city_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: WorldPlaceCategory;
  place_kind: WorldPlaceKind;
  primary_category_slug: string | null;
  address_display: string | null;
  latitude: number;
  longitude: number;
  city_name: string;
  region_name: string | null;
  country_code: string;
  country_name: string;
  distance_km: number;
  verification_status: "verified";
};

const FLAG_MAP: Record<string, keyof WorldFeatureFlags> = {
  world_discovery_enabled: "worldDiscoveryEnabled",
  nearby_places_enabled: "nearbyPlacesEnabled",
  external_directions_enabled: "externalDirectionsEnabled",
  hello_city_enabled: "helloCityEnabled",
  arrival_detection_enabled: "arrivalDetectionEnabled",
};

const DEFAULT_FLAGS: WorldFeatureFlags = {
  worldDiscoveryEnabled: false,
  nearbyPlacesEnabled: false,
  externalDirectionsEnabled: true,
  helloCityEnabled: false,
  arrivalDetectionEnabled: false,
};

export async function loadWorldDiscoveryBootstrap(
  supabase: SupabaseClient
): Promise<{
  flags: WorldFeatureFlags;
  cities: WorldCity[];
  categories: WorldCategory[];
  databaseReady: boolean;
}> {
  const [flagResult, cityResult, categoryResult] = await Promise.all([
    supabase.from("world_feature_flags").select("key, enabled"),
    supabase
      .from("world_cities")
      .select("id, country_code, country_name, region_name, city_name, slug")
      .eq("is_active", true)
      .order("country_name")
      .order("city_name")
      .limit(200),
    supabase
      .from("world_place_categories")
      .select("id, parent_id, slug, name, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name")
      .limit(300),
  ]);

  if (flagResult.error || cityResult.error || categoryResult.error) {
    return {
      flags: DEFAULT_FLAGS,
      cities: [],
      categories: [],
      databaseReady: false,
    };
  }

  const flags = { ...DEFAULT_FLAGS };
  for (const row of flagResult.data ?? []) {
    const key = FLAG_MAP[String(row.key)];
    if (key) flags[key] = Boolean(row.enabled);
  }

  return {
    flags,
    cities: (cityResult.data ?? []) as WorldCity[],
    categories: (categoryResult.data ?? []) as WorldCategory[],
    databaseReady: true,
  };
}

export function isWorldPlaceCategory(
  value: unknown
): value is WorldPlaceCategory {
  return (
    typeof value === "string" &&
    (WORLD_PLACE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function sanitizeDiscoveryRequest(input: {
  latitude?: unknown;
  longitude?: unknown;
  destinationCityId?: unknown;
  radiusKm?: unknown;
  category?: unknown;
  categoryId?: unknown;
  offset?: unknown;
}):
  | {
      ok: true;
      value: {
        latitude: number | null;
        longitude: number | null;
        destinationCityId: string | null;
        radiusKm: number;
        category: WorldPlaceCategory | null;
        categoryId: string | null;
        offset: number;
      };
    }
  | { ok: false; message: string } {
  const hasLatitude = typeof input.latitude === "number";
  const hasLongitude = typeof input.longitude === "number";
  if (hasLatitude !== hasLongitude) {
    return { ok: false, message: "Location coordinates must be provided together." };
  }

  const latitude = hasLatitude ? (input.latitude as number) : null;
  const longitude = hasLongitude ? (input.longitude as number) : null;
  if (
    latitude !== null &&
    (!Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude! < -180 ||
      longitude! > 180)
  ) {
    return { ok: false, message: "Location coordinates are invalid." };
  }

  const destinationCityId =
    typeof input.destinationCityId === "string" &&
    /^[0-9a-f-]{36}$/i.test(input.destinationCityId.trim())
      ? input.destinationCityId.trim()
      : null;
  if (latitude === null && !destinationCityId) {
    return { ok: false, message: "Choose a destination or share one-time location." };
  }

  const radius =
    typeof input.radiusKm === "number" && Number.isFinite(input.radiusKm)
      ? input.radiusKm
      : 25;
  const category =
    input.category == null || input.category === ""
      ? null
      : isWorldPlaceCategory(input.category)
        ? input.category
        : undefined;
  if (category === undefined) {
    return { ok: false, message: "Place category is invalid." };
  }
  const categoryId =
    input.categoryId == null || input.categoryId === ""
      ? null
      : typeof input.categoryId === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            input.categoryId.trim()
          )
        ? input.categoryId.trim()
        : undefined;
  if (categoryId === undefined) {
    return { ok: false, message: "Place category is invalid." };
  }

  return {
    ok: true,
    value: {
      latitude,
      longitude,
      destinationCityId,
      radiusKm: Math.max(0.1, Math.min(radius, 200)),
      category,
      categoryId,
      offset:
        typeof input.offset === "number" && Number.isInteger(input.offset)
          ? Math.max(0, Math.min(input.offset, 500))
          : 0,
    },
  };
}
