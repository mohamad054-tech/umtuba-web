export const JOURNEY_HANDOFF_STORAGE_KEY = "umtuba:journey-handoff";
export const JOURNEY_HANDOFF_VERSION = 1;
export const JOURNEY_HANDOFF_TTL_MS = 2 * 60 * 1000;

export type JourneyHandoffLocation = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  matchedJourneyCity: boolean;
};

export type JourneyHandoffOriginRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type JourneyHandoffPayload = {
  version: number;
  videoId: string;
  title: string;
  authorName: string;
  location: JourneyHandoffLocation;
  originRect: JourneyHandoffOriginRect | null;
  startedAt: number;
  expiresAt: number;
  entry: "watch";
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidJourneyHandoff(
  value: unknown
): value is JourneyHandoffPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  if (payload.version !== JOURNEY_HANDOFF_VERSION) {
    return false;
  }

  if (payload.entry !== "watch") {
    return false;
  }

  if (!isNonEmptyString(payload.videoId) || !isNonEmptyString(payload.title)) {
    return false;
  }

  if (!isNonEmptyString(payload.authorName)) {
    return false;
  }

  if (!isFiniteNumber(payload.startedAt) || !isFiniteNumber(payload.expiresAt)) {
    return false;
  }

  if (payload.expiresAt < payload.startedAt) {
    return false;
  }

  const location = payload.location;

  if (!location || typeof location !== "object") {
    return false;
  }

  const loc = location as Record<string, unknown>;

  if (
    !isNonEmptyString(loc.city) ||
    !isNonEmptyString(loc.country) ||
    !isFiniteNumber(loc.lat) ||
    !isFiniteNumber(loc.lng) ||
    typeof loc.matchedJourneyCity !== "boolean"
  ) {
    return false;
  }

  if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) {
    return false;
  }

  if (payload.originRect !== null) {
    if (!payload.originRect || typeof payload.originRect !== "object") {
      return false;
    }

    const rect = payload.originRect as Record<string, unknown>;

    if (
      !isFiniteNumber(rect.x) ||
      !isFiniteNumber(rect.y) ||
      !isFiniteNumber(rect.width) ||
      !isFiniteNumber(rect.height) ||
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return false;
    }
  }

  return true;
}

export function isJourneyHandoffExpired(
  payload: JourneyHandoffPayload,
  now = Date.now()
) {
  return now > payload.expiresAt;
}

export function clearJourneyHandoff() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(JOURNEY_HANDOFF_STORAGE_KEY);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function writeJourneyHandoff(payload: JourneyHandoffPayload) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isValidJourneyHandoff(payload)) {
    return false;
  }

  try {
    window.sessionStorage.setItem(
      JOURNEY_HANDOFF_STORAGE_KEY,
      JSON.stringify(payload)
    );
    return true;
  } catch {
    return false;
  }
}

export function readJourneyHandoff(): JourneyHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(JOURNEY_HANDOFF_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      clearJourneyHandoff();
      return null;
    }

    if (!isValidJourneyHandoff(parsed)) {
      clearJourneyHandoff();
      return null;
    }

    if (isJourneyHandoffExpired(parsed)) {
      clearJourneyHandoff();
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Read once for /post-journey arrival. Invalid/expired → null and clear.
 * Valid → return payload and clear so refresh falls back to default journey.
 */
export function consumeJourneyHandoff(): JourneyHandoffPayload | null {
  const payload = readJourneyHandoff();
  clearJourneyHandoff();
  return payload;
}

export function buildJourneyHandoffQuery(payload: JourneyHandoffPayload) {
  const params = new URLSearchParams({
    from: "watch",
    vid: payload.videoId,
    city: slugifyCity(payload.location.city),
  });

  if (/^\d+$/.test(payload.videoId)) {
    params.set("postId", payload.videoId);
  }

  return params.toString();
}

export function buildPostJourneyHref(payload: JourneyHandoffPayload) {
  return `/post-journey?${buildJourneyHandoffQuery(payload)}`;
}

const CITY_SLUG_DIACRITICS: Record<string, string> = {
  á: "a",
  à: "a",
  ã: "a",
  â: "a",
  ä: "a",
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  í: "i",
  ì: "i",
  î: "i",
  ï: "i",
  ó: "o",
  ò: "o",
  õ: "o",
  ô: "o",
  ö: "o",
  ú: "u",
  ù: "u",
  û: "u",
  ü: "u",
  ç: "c",
  ñ: "n",
};

export function slugifyCity(city: string) {
  return city
    .trim()
    .toLowerCase()
    .replace(/[áàãâäéèêëíìîïóòõôöúùûüçñ]/g, (ch) => CITY_SLUG_DIACRITICS[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createJourneyHandoff(input: {
  videoId: string;
  title: string;
  authorName: string;
  location: JourneyHandoffLocation;
  originRect: JourneyHandoffOriginRect | null;
}): JourneyHandoffPayload {
  const startedAt = Date.now();

  return {
    version: JOURNEY_HANDOFF_VERSION,
    videoId: input.videoId,
    title: input.title,
    authorName: input.authorName,
    location: input.location,
    originRect: input.originRect,
    startedAt,
    expiresAt: startedAt + JOURNEY_HANDOFF_TTL_MS,
    entry: "watch",
  };
}

export function captureElementOriginRect(
  element: HTMLElement | null
): JourneyHandoffOriginRect | null {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}
