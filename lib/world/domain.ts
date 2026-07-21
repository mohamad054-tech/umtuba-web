import type { WorldPlaceKind } from "./discovery";

export const WORLD_LAYER_KEYS = [
  "discovery",
  "community",
  "media",
  "commerce",
  "journey",
  "events",
  "live",
  "ai",
] as const;

export type WorldLayerKey = (typeof WORLD_LAYER_KEYS)[number];
export type WorldLayerMap = Record<WorldLayerKey, boolean>;

export const WORLD_SEARCH_ENTITY_TYPES = [
  "country",
  "city",
  "place",
  "point_of_interest",
  "business",
  "attraction",
  "hotel",
  "restaurant",
  "store",
  "local_service",
  "category",
] as const;

export type WorldSearchEntityType =
  (typeof WORLD_SEARCH_ENTITY_TYPES)[number];

export type WorldProfileCategory = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  isPrimary: boolean;
};

export type WorldPlaceProfile = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  kind: WorldPlaceKind;
  legacyCategory: string;
  address: string | null;
  latitude: number;
  longitude: number;
  verificationStatus: string;
  storeId: string | null;
  city: {
    id: string;
    slug: string;
    name: string;
    region: string | null;
    countryCode: string;
    countryName: string;
  };
  district: { id: string; slug: string; name: string } | null;
  categories: WorldProfileCategory[];
  gallery: Array<{
    id: string;
    kind: "image" | "video";
    bucket: string;
    path: string;
    alt: string | null;
    caption: string | null;
    isCover: boolean;
  }>;
  links: Array<{ kind: string; label: string | null; url: string }>;
  business: {
    priceLevel: number | null;
    reservationsSupported: boolean;
  } | null;
  openingHours: Array<{
    day: number;
    opensAt: string | null;
    closesAt: string | null;
    isClosed: boolean;
    note: string | null;
  }>;
  postIds: number[];
  liveRoomIds: string[];
  reviews: { enabled: boolean; count: number; average: number | null };
  aiSummary: string | null;
  layers: WorldLayerMap;
};

export type WorldCityProfile = {
  id: string;
  slug: string;
  name: string;
  overview: string | null;
  coverMediaPath: string | null;
  centerLatitude: number;
  centerLongitude: number;
  region: string | null;
  countryCode: string;
  countryName: string;
  timezone: string | null;
  verificationStatus: string;
  layers: WorldLayerMap;
  placeCounts: Partial<Record<WorldPlaceKind, number>>;
  featuredPlaces: Array<{
    id: string;
    slug: string;
    name: string;
    kind: WorldPlaceKind;
    verificationStatus: string;
  }>;
  postIds: number[];
  liveRoomIds: string[];
  journeyIds: string[];
  localEvents: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    placeId: string | null;
  }>;
  community: {
    name: string;
    description: string | null;
    helloCityEnabled: boolean;
  } | null;
  postJourneyReady: boolean;
  aiTravelAssistantReady: boolean;
};

export type WorldSearchResult = {
  entity_type: WorldSearchEntityType;
  entity_id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  city_id: string | null;
  category_slug: string | null;
  relevance: number;
};

export function sanitizeWorldSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$/.test(slug) ? slug : null;
}

export function sanitizeWorldSearchRequest(input: {
  query?: unknown;
  entityTypes?: unknown;
  cityId?: unknown;
  categoryId?: unknown;
  offset?: unknown;
}):
  | {
      ok: true;
      value: {
        query: string;
        entityTypes: WorldSearchEntityType[] | null;
        cityId: string | null;
        categoryId: string | null;
        offset: number;
      };
    }
  | { ok: false; message: string } {
  const query =
    typeof input.query === "string"
      ? input.query.trim().replace(/\s+/g, " ")
      : "";
  if (query.length < 2 || query.length > 80) {
    return { ok: false, message: "Search must contain 2 to 80 characters." };
  }
  const types = Array.isArray(input.entityTypes)
    ? input.entityTypes.filter(
        (value): value is WorldSearchEntityType =>
          typeof value === "string" &&
          (WORLD_SEARCH_ENTITY_TYPES as readonly string[]).includes(value)
      )
    : [];
  if (
    Array.isArray(input.entityTypes) &&
    types.length !== input.entityTypes.length
  ) {
    return { ok: false, message: "Search type is invalid." };
  }
  const uuid = (value: unknown) =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
      ? value.trim()
      : null;
  const cityId = input.cityId == null || input.cityId === "" ? null : uuid(input.cityId);
  const categoryId =
    input.categoryId == null || input.categoryId === ""
      ? null
      : uuid(input.categoryId);
  if ((input.cityId && !cityId) || (input.categoryId && !categoryId)) {
    return { ok: false, message: "Search filter is invalid." };
  }
  return {
    ok: true,
    value: {
      query,
      entityTypes: types.length ? types : null,
      cityId,
      categoryId,
      offset:
        typeof input.offset === "number" && Number.isInteger(input.offset)
          ? Math.max(0, Math.min(input.offset, 500))
          : 0,
    },
  };
}
