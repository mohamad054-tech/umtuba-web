import { WORLD_LAYER_KEYS, type WorldCityProfile, type WorldLayerMap } from "./domain";
import type { WorldCategory, WorldCity, WorldFeatureFlags } from "./discovery";
import { toWorldMapCenter, toWorldMapPoint } from "./mapPoints";
import {
  EXPANSION_V2_CITIES,
  EXPANSION_V2_COUNTRIES,
} from "../../scripts/world/expansionV2Data";

const EXTRA_COUNTRY_NAMES: Record<string, string> = {
  PS: "Palestine",
  JO: "Jordan",
  TR: "Turkey",
  DE: "Germany",
  JP: "Japan",
  EG: "Egypt",
};

const DEFAULT_FLAGS: WorldFeatureFlags = {
  worldDiscoveryEnabled: false,
  nearbyPlacesEnabled: false,
  externalDirectionsEnabled: true,
  helloCityEnabled: false,
  arrivalDetectionEnabled: false,
};

const EMPTY_LAYERS = Object.fromEntries(
  WORLD_LAYER_KEYS.map((key) => [key, key === "discovery"])
) as WorldLayerMap;

function countryName(code: string): string {
  return (
    EXPANSION_V2_COUNTRIES.find((country) => country.country_code === code)
      ?.name ??
    EXTRA_COUNTRY_NAMES[code] ??
    code
  );
}

export function catalogWorldCities(): WorldCity[] {
  const cities: WorldCity[] = [];
  for (const city of EXPANSION_V2_CITIES) {
    const point = toWorldMapPoint({
      id: `catalog:${city.slug}`,
      kind: "city",
      name: city.city_name,
      category: countryName(city.country_code),
      slug: city.slug,
      latitude: city.center_latitude,
      longitude: city.center_longitude,
    });
    if (!point) continue;
    cities.push({
      id: `catalog:${city.slug}`,
      country_code: city.country_code,
      country_name: countryName(city.country_code),
      region_name: city.region,
      city_name: city.city_name,
      slug: city.slug,
      center_latitude: point.latitude,
      center_longitude: point.longitude,
    });
  }
  return cities;
}

export function catalogWorldCityProfile(slug: string): WorldCityProfile | null {
  const city = EXPANSION_V2_CITIES.find((row) => row.slug === slug);
  if (!city) return null;
  const center = toWorldMapCenter({
    latitude: city.center_latitude,
    longitude: city.center_longitude,
  });
  if (!center) return null;
  return {
    id: `catalog:${city.slug}`,
    slug: city.slug,
    name: city.city_name,
    overview: city.overview,
    coverMediaPath: null,
    centerLatitude: center.latitude,
    centerLongitude: center.longitude,
    region: city.region,
    countryCode: city.country_code,
    countryName: countryName(city.country_code),
    timezone: city.timezone_name,
    verificationStatus: "catalog",
    layers: EMPTY_LAYERS,
    placeCounts: {},
    featuredPlaces: [],
    postIds: [],
    liveRoomIds: [],
    journeyIds: [],
    localEvents: [],
    community: null,
    postJourneyReady: false,
    aiTravelAssistantReady: false,
  };
}

export type WorldDiscoveryBootstrap = {
  flags: WorldFeatureFlags;
  cities: WorldCity[];
  categories: WorldCategory[];
  databaseReady: boolean;
};

export function catalogDiscoveryBootstrap(): WorldDiscoveryBootstrap {
  return {
    flags: DEFAULT_FLAGS,
    cities: catalogWorldCities(),
    categories: [],
    databaseReady: false,
  };
}
