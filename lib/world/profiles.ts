import type { SupabaseClient } from "@supabase/supabase-js";
import {
  WORLD_LAYER_KEYS,
  type WorldCityProfile,
  type WorldLayerMap,
  type WorldPlaceProfile,
} from "./domain";
import { WORLD_PLACE_KINDS, type WorldPlaceKind } from "./discovery";

export type WorldProfileResult<T> = {
  data: T | null;
  error: string | null;
  databaseReady: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseLayers(value: unknown): WorldLayerMap {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    WORLD_LAYER_KEYS.map((key) => [key, source[key] === true])
  ) as WorldLayerMap;
}

function isPlaceKind(value: unknown): value is WorldPlaceKind {
  return (
    typeof value === "string" &&
    (WORLD_PLACE_KINDS as readonly string[]).includes(value)
  );
}

export function parseWorldPlaceProfile(value: unknown): WorldPlaceProfile | null {
  if (!isRecord(value) || !isRecord(value.city) || !isPlaceKind(value.kind)) {
    return null;
  }
  const latitude = asNumber(value.latitude);
  const longitude = asNumber(value.longitude);
  const id = asString(value.id);
  const slug = asString(value.slug);
  const name = asString(value.name);
  const cityId = asString(value.city.id);
  const citySlug = asString(value.city.slug);
  const cityName = asString(value.city.name);
  const countryCode = asString(value.city.countryCode);
  const countryName = asString(value.city.countryName);
  if (
    !id ||
    !slug ||
    !name ||
    latitude === null ||
    longitude === null ||
    !cityId ||
    !citySlug ||
    !cityName ||
    !countryCode ||
    !countryName
  ) {
    return null;
  }

  return {
    ...(value as unknown as WorldPlaceProfile),
    id,
    slug,
    name,
    kind: value.kind,
    latitude,
    longitude,
    city: {
      ...(value.city as WorldPlaceProfile["city"]),
      id: cityId,
      slug: citySlug,
      name: cityName,
      countryCode,
      countryName,
    },
    categories: Array.isArray(value.categories)
      ? (value.categories as WorldPlaceProfile["categories"])
      : [],
    gallery: Array.isArray(value.gallery)
      ? (value.gallery as WorldPlaceProfile["gallery"])
      : [],
    links: Array.isArray(value.links)
      ? (value.links as WorldPlaceProfile["links"])
      : [],
    openingHours: Array.isArray(value.openingHours)
      ? (value.openingHours as WorldPlaceProfile["openingHours"])
      : [],
    postIds: Array.isArray(value.postIds)
      ? value.postIds.filter((item): item is number => Number.isInteger(item))
      : [],
    liveRoomIds: Array.isArray(value.liveRoomIds)
      ? value.liveRoomIds.filter((item): item is string => typeof item === "string")
      : [],
    layers: parseLayers(value.layers),
  };
}

export function parseWorldCityProfile(value: unknown): WorldCityProfile | null {
  if (!isRecord(value)) return null;
  const id = asString(value.id);
  const slug = asString(value.slug);
  const name = asString(value.name);
  const countryCode = asString(value.countryCode);
  const countryName = asString(value.countryName);
  const centerLatitude = asNumber(value.centerLatitude);
  const centerLongitude = asNumber(value.centerLongitude);
  if (
    !id ||
    !slug ||
    !name ||
    !countryCode ||
    !countryName ||
    centerLatitude === null ||
    centerLongitude === null
  ) {
    return null;
  }

  return {
    ...(value as unknown as WorldCityProfile),
    id,
    slug,
    name,
    countryCode,
    countryName,
    centerLatitude,
    centerLongitude,
    layers: parseLayers(value.layers),
    placeCounts: isRecord(value.placeCounts)
      ? (value.placeCounts as WorldCityProfile["placeCounts"])
      : {},
    featuredPlaces: Array.isArray(value.featuredPlaces)
      ? (value.featuredPlaces as WorldCityProfile["featuredPlaces"])
      : [],
    postIds: Array.isArray(value.postIds)
      ? value.postIds.filter((item): item is number => Number.isInteger(item))
      : [],
    liveRoomIds: Array.isArray(value.liveRoomIds)
      ? value.liveRoomIds.filter((item): item is string => typeof item === "string")
      : [],
    journeyIds: Array.isArray(value.journeyIds)
      ? value.journeyIds.filter((item): item is string => typeof item === "string")
      : [],
    localEvents: Array.isArray(value.localEvents)
      ? (value.localEvents as WorldCityProfile["localEvents"])
      : [],
  };
}

function profileError(error: { message?: string; code?: string } | null) {
  const unavailable =
    error?.code === "42883" ||
    error?.code === "PGRST202" ||
    (error?.message || "").toLowerCase().includes("does not exist");
  return {
    error: unavailable
      ? "World profile data is not available in this environment yet."
      : "World profile could not be loaded.",
    databaseReady: !unavailable,
  };
}

export async function loadWorldPlaceProfile(
  supabase: SupabaseClient,
  slug: string
): Promise<WorldProfileResult<WorldPlaceProfile>> {
  const { data, error } = await supabase.rpc("get_world_place_profile", {
    p_slug: slug,
  });
  if (error) return { data: null, ...profileError(error) };
  const profile = parseWorldPlaceProfile(data);
  return {
    data: profile,
    error: data && !profile ? "World place profile is invalid." : null,
    databaseReady: true,
  };
}

export async function loadWorldCityProfile(
  supabase: SupabaseClient,
  slug: string
): Promise<WorldProfileResult<WorldCityProfile>> {
  const { data, error } = await supabase.rpc("get_world_city_profile", {
    p_slug: slug,
  });
  if (error) return { data: null, ...profileError(error) };
  const profile = parseWorldCityProfile(data);
  return {
    data: profile,
    error: data && !profile ? "World city profile is invalid." : null,
    databaseReady: true,
  };
}
