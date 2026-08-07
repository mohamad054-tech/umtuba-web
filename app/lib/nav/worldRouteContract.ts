/**
 * U3 World / Map route consolidation contract.
 *
 * Evidence:
 * - Page Registry: `world.city.by-cityslug` active; `city.by-cityslug` legacy/orphan/hidden
 * - Live World clients link to `/world/city/…`
 * - Mobile World Affordance Decision V1 unchanged (desktop primary + Home/menu only)
 *
 * Migration: NONE · Remote DB: NONE · Map internals (`lib/world/**`) untouched.
 */

import { APP_ROUTES, buildWorldCityHref } from "./routes";

/** Canonical World hub. */
export const WORLD_CANONICAL_HUB_PATH = APP_ROUTES.worldDiscovery;

/** Canonical city path builder (World platform). */
export function canonicalWorldCityPath(citySlug: string): string {
  return buildWorldCityHref(citySlug);
}

/** Legacy prototype path pattern (kept as App Router alias). */
export const WORLD_CITY_LEGACY_PREFIX = "/city";

export const WORLD_CITY_ROUTE_CLASSIFICATION = {
  canonicalHub: {
    path: "/world",
    status: "CANONICAL" as const,
  },
  canonicalCity: {
    pathPattern: "/world/city/[citySlug]",
    status: "CANONICAL" as const,
  },
  legacyCity: {
    pathPattern: "/city/[citySlug]",
    status: "ALIAS" as const,
    target: "CANONICAL_WORLD_CITY" as const,
    deleted: false,
  },
  worldSearch: {
    path: "/world/search",
    status: "CANONICAL" as const,
  },
  worldPlace: {
    pathPattern: "/world/place/[placeSlug]",
    status: "CANONICAL" as const,
  },
} as const;

/**
 * Build legacy `/city/…` → canonical `/world/city/…` target (path only).
 */
export function resolveLegacyCityAliasTarget(citySlug: string): string {
  const target = buildWorldCityHref(citySlug);
  if (!target || target.endsWith("/city/")) {
    return WORLD_CANONICAL_HUB_PATH;
  }
  return target;
}

export function isLegacyCityPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "";
  return path === "/city" || path.startsWith("/city/");
}
