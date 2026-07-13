import { slugifyCity } from "../journey/handoff";

export const APP_ROUTES = {
  home: "/",
  discover: "/discover",
  live: "/live",
  messages: "/messages",
  settings: "/settings",
  saved: "/saved",
  login: "/login",
  signup: "/signup",
  profile: "/profile",
  createVideo: "/create/video",
} as const;

export type AppRouteHref =
  | (typeof APP_ROUTES)["home"]
  | (typeof APP_ROUTES)["discover"]
  | (typeof APP_ROUTES)["live"]
  | (typeof APP_ROUTES)["messages"];

export type AppNavItem = {
  label: string;
  href: AppRouteHref;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Home", href: APP_ROUTES.home },
  { label: "Discover", href: APP_ROUTES.discover },
  { label: "Live", href: APP_ROUTES.live },
  { label: "Messages", href: APP_ROUTES.messages },
];

export function isNavActive(pathname: string, href: AppRouteHref): boolean {
  if (href === APP_ROUTES.home) {
    return pathname === APP_ROUTES.home;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function normalizeCityKey(city: string): string {
  return slugifyCity(city);
}

export function citiesMatch(a: string, b: string): boolean {
  return normalizeCityKey(a) === normalizeCityKey(b);
}

/** Living Earth / Explore-this-city → Discover with city selected. */
export function buildDiscoverCityHref(city: string, country?: string): string {
  const params = new URLSearchParams({
    city: normalizeCityKey(city) || city.trim(),
  });

  if (country?.trim()) {
    params.set("country", country.trim());
  }

  return `${APP_ROUTES.discover}?${params.toString()}`;
}

/** Discover / Live → Living Earth focused on a city (mock). */
export function buildHomeCityFocusHref(city: string): string {
  const params = new URLSearchParams({
    focus: normalizeCityKey(city) || city.trim(),
  });

  return `${APP_ROUTES.home}?${params.toString()}`;
}

/** Normalize a creator handle/username for `/profile/[username]`. */
export function normalizeProfileUsername(username: string): string {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

/** Discover / Live → public creator profile. */
export function buildCreatorProfileHref(input: {
  username: string;
}): string {
  return `${APP_ROUTES.profile}/${normalizeProfileUsername(input.username)}`;
}

/** Profile / Live → open (or start) a message thread with the creator. */
export function buildMessageCreatorHref(input: {
  id: string;
  name: string;
}): string {
  const params = new URLSearchParams({
    creatorId: input.id,
    creatorName: input.name,
    intent: "message",
  });

  return `${APP_ROUTES.messages}?${params.toString()}`;
}

export function buildLiveStreamHref(streamId: string): string {
  const params = new URLSearchParams({ stream: streamId });
  return `${APP_ROUTES.live}?${params.toString()}`;
}

export function findIndexByCity<T extends { location: { city: string } }>(
  items: T[],
  cityParam: string | null | undefined
): number {
  if (!cityParam?.trim()) {
    return 0;
  }

  const index = items.findIndex((item) =>
    citiesMatch(item.location.city, cityParam)
  );

  return index >= 0 ? index : 0;
}
