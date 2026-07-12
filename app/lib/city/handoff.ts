import { cityToSlug } from "./resolveCity";

export const CITY_HANDOFF_STORAGE_KEY = "umtuba:city-handoff";
export const CITY_HANDOFF_VERSION = 1;
export const CITY_HANDOFF_TTL_MS = 2 * 60 * 1000;

export type CityHandoffSource = {
  videoId: string | null;
  title: string | null;
  authorName: string | null;
};

export type CityHandoffPayload = {
  version: number;
  entry: "globe";
  citySlug: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  source: CityHandoffSource;
  fromPath: string;
  watchHref: string | null;
  startedAt: number;
  expiresAt: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isValidCityHandoff(
  value: unknown
): value is CityHandoffPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  if (payload.version !== CITY_HANDOFF_VERSION) {
    return false;
  }

  if (payload.entry !== "globe") {
    return false;
  }

  if (
    !isNonEmptyString(payload.citySlug) ||
    !isNonEmptyString(payload.city) ||
    !isNonEmptyString(payload.country) ||
    !isNonEmptyString(payload.fromPath)
  ) {
    return false;
  }

  if (!isFiniteNumber(payload.lat) || !isFiniteNumber(payload.lng)) {
    return false;
  }

  if (payload.lat < -90 || payload.lat > 90 || payload.lng < -180 || payload.lng > 180) {
    return false;
  }

  if (!isFiniteNumber(payload.startedAt) || !isFiniteNumber(payload.expiresAt)) {
    return false;
  }

  if (payload.expiresAt < payload.startedAt) {
    return false;
  }

  if (payload.watchHref !== null && !isNonEmptyString(payload.watchHref)) {
    return false;
  }

  const source = payload.source;

  if (!source || typeof source !== "object") {
    return false;
  }

  const src = source as Record<string, unknown>;

  if (
    !isNullableString(src.videoId) ||
    !isNullableString(src.title) ||
    !isNullableString(src.authorName)
  ) {
    return false;
  }

  if (src.videoId !== null && !isNonEmptyString(src.videoId)) {
    return false;
  }

  if (src.title !== null && typeof src.title !== "string") {
    return false;
  }

  if (src.authorName !== null && typeof src.authorName !== "string") {
    return false;
  }

  return true;
}

export function isCityHandoffExpired(
  payload: CityHandoffPayload,
  now = Date.now()
) {
  return now > payload.expiresAt;
}

export function clearCityHandoff() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(CITY_HANDOFF_STORAGE_KEY);
  } catch {
    // Ignore storage failures
  }
}

export function writeCityHandoff(payload: CityHandoffPayload) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isValidCityHandoff(payload)) {
    return false;
  }

  try {
    window.sessionStorage.setItem(
      CITY_HANDOFF_STORAGE_KEY,
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

export function readCityHandoff(): CityHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(CITY_HANDOFF_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      clearCityHandoff();
      return null;
    }

    if (!isValidCityHandoff(parsed)) {
      clearCityHandoff();
      return null;
    }

    if (isCityHandoffExpired(parsed)) {
      clearCityHandoff();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/** Read once for /city arrival. Invalid/expired → null and clear. */
export function consumeCityHandoff(): CityHandoffPayload | null {
  const payload = readCityHandoff();
  clearCityHandoff();
  return payload;
}

export function createCityHandoff(input: {
  city: string;
  country: string;
  lat: number;
  lng: number;
  source?: Partial<CityHandoffSource>;
  fromPath?: string;
}): CityHandoffPayload {
  const startedAt = Date.now();
  const videoId = input.source?.videoId ?? null;
  const title = input.source?.title ?? null;
  const authorName = input.source?.authorName ?? null;
  const watchHref =
    videoId && videoId.trim()
      ? `/watch?id=${encodeURIComponent(videoId.trim())}`
      : null;

  return {
    version: CITY_HANDOFF_VERSION,
    entry: "globe",
    citySlug: cityToSlug(input.city),
    city: input.city.trim(),
    country: input.country.trim(),
    lat: input.lat,
    lng: input.lng,
    source: {
      videoId: videoId && videoId.trim() ? videoId.trim() : null,
      title: title && title.trim() ? title.trim() : null,
      authorName: authorName && authorName.trim() ? authorName.trim() : null,
    },
    fromPath: input.fromPath ?? "/post-journey",
    watchHref,
    startedAt,
    expiresAt: startedAt + CITY_HANDOFF_TTL_MS,
  };
}

export function buildCityHandoffQuery(payload: CityHandoffPayload) {
  const params = new URLSearchParams({
    from: "globe",
    city: payload.citySlug,
  });

  if (payload.source.videoId) {
    params.set("vid", payload.source.videoId);
  }

  return params.toString();
}

export function buildCityHref(payload: CityHandoffPayload) {
  return `/city/${encodeURIComponent(payload.citySlug)}?${buildCityHandoffQuery(payload)}`;
}

export function shouldUseRouterBackForCity(handoff: CityHandoffPayload | null) {
  return Boolean(handoff && handoff.entry === "globe");
}
