/**
 * Home platform entry destinations for U2 Home Organization.
 * Evidence-backed hrefs only — no speculative surfaces.
 * Collaboration /workspaces deferred (absent on this UI baseline).
 */

import { APP_ROUTES } from "./routes";
import { HOME_CIRCLE_ENTRY_HREFS } from "./platformNavContract";

export type HomePlatformEntryId =
  | "learning"
  | "store"
  | "games"
  | "live"
  | "world"
  | "search"
  | "messages"
  | "create"
  | "profile"
  | "rewards";

export type HomePlatformEntry = {
  id: HomePlatformEntryId;
  label: string;
  href: string;
};

/**
 * Section-circle strip order — lockstep with HOME_CIRCLE_ENTRY_HREFS.
 * Content/discovery remains primary; these are secondary entry ramps.
 */
export const HOME_SECTION_CIRCLE_ENTRIES: readonly HomePlatformEntry[] = [
  { id: "learning", label: "Learning", href: APP_ROUTES.learning },
  { id: "store", label: "Store", href: APP_ROUTES.store },
  { id: "games", label: "Games", href: APP_ROUTES.games },
  { id: "live", label: "Live", href: APP_ROUTES.live },
  { id: "world", label: "World", href: APP_ROUTES.worldDiscovery },
  { id: "search", label: "Search", href: APP_ROUTES.search },
  { id: "messages", label: "Messages", href: APP_ROUTES.messages },
  { id: "create", label: "Create", href: APP_ROUTES.createVideo },
] as const;

/**
 * Circular-arc portal id → real route.
 * Profile uses hub path; signed-in username profile remains UserMenu.
 * Rewards is available but not forced onto the arc (avoid overcrowding).
 */
export const HOME_ARC_PORTAL_HREFS: Readonly<
  Record<string, string>
> = {
  store: APP_ROUTES.store,
  learning: APP_ROUTES.learning,
  messages: APP_ROUTES.messages,
  world: APP_ROUTES.worldDiscovery,
  games: APP_ROUTES.games,
  live: APP_ROUTES.live,
  profile: APP_ROUTES.profile,
} as const;

/** Collaboration Home entry — deferred until /workspaces exists on UI tip. */
export const HOME_COLLABORATION_ENTRY = {
  status: "DEFERRED_TO_LATER_WAVE" as const,
  reason: "/workspaces absent on central UI integration baseline",
  href: null,
};

export function resolveHomeArcPortalHref(portalId: string): string | null {
  return HOME_ARC_PORTAL_HREFS[portalId] ?? null;
}

export function assertHomeCircleHrefContract(): boolean {
  const fromEntries = HOME_SECTION_CIRCLE_ENTRIES.map((e) => e.href);
  if (fromEntries.length !== HOME_CIRCLE_ENTRY_HREFS.length) return false;
  return fromEntries.every(
    (href, i) => href === HOME_CIRCLE_ENTRY_HREFS[i]
  );
}
