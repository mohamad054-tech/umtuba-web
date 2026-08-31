import { APP_NAV_ITEMS, APP_ROUTES, isSocialHomePath } from "./routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "./mobileNav";

/**
 * UM Life Home Entry V1 — first-class chrome to the authoritative social Home.
 *
 * Destination is `/` (HomeFeedLoader → DiscoverExperience). `/life` and
 * `/discover` are forever aliases to that same experience — not a second feed.
 *
 * Badge: capability is ready; live counts are not invented. Notification unread
 * is a global inbox count, not a UM Life activity count, so it is not reused.
 */
export const UM_LIFE_ENTRY_LABEL = "UM Life" as const;
export const UM_LIFE_DESTINATION_HREF = APP_ROUTES.home;
export const UM_LIFE_ALIAS_PATH = APP_ROUTES.life;

export const UM_LIFE_BADGE_CAPABILITY = "READY" as const;
export const UM_LIFE_BADGE_LIVE_DATA = false;

export type UmLifeActivityBadge = {
  capability: typeof UM_LIFE_BADGE_CAPABILITY;
  liveData: typeof UM_LIFE_BADGE_LIVE_DATA;
  /** Present only when a UM Life-specific count exists. Never invent. */
  count: number | null;
};

/** Fail-closed: no UM Life-specific activity source is wired yet. */
export function resolveUmLifeActivityBadgeCount(): number | null {
  return null;
}

export function resolveUmLifeActivityBadge(): UmLifeActivityBadge {
  const count = resolveUmLifeActivityBadgeCount();
  return {
    capability: UM_LIFE_BADGE_CAPABILITY,
    liveData: UM_LIFE_BADGE_LIVE_DATA,
    count: typeof count === "number" && count > 0 ? count : null,
  };
}

export function isUmLifeNavDestination(pathname: string): boolean {
  return isSocialHomePath(pathname);
}

export function assertUmLifePrimaryEntry(): void {
  const desktop = APP_NAV_ITEMS.find((item) => item.label === UM_LIFE_ENTRY_LABEL);
  if (!desktop || desktop.href !== UM_LIFE_DESTINATION_HREF) {
    throw new Error("UM Life must be a desktop primary item landing on /");
  }
  const mobile = MOBILE_PRIMARY_NAV_ITEMS.find((item) => item.id === "umLife");
  if (!mobile || mobile.href !== UM_LIFE_DESTINATION_HREF) {
    throw new Error("UM Life must be a mobile primary item landing on /");
  }
  if (APP_NAV_ITEMS.some((item) => String(item.href) === APP_ROUTES.life)) {
    throw new Error("/life must not be a separate primary destination");
  }
  if (MOBILE_PRIMARY_NAV_ITEMS.some((item) => String(item.href) === APP_ROUTES.life)) {
    throw new Error("/life must not be a separate mobile primary destination");
  }
}
