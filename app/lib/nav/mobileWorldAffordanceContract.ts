/**
 * Platform Navigation Mobile World Affordance Decision V1
 *
 * Product decision (frozen):
 * - World remains in Desktop primary (`APP_NAV_ITEMS`).
 * - World is **not** in Mobile bottom primary (`MOBILE_PRIMARY_NAV_ITEMS`).
 * - Mobile reachability stays via Home circles + direct `/world` links.
 * - Store / Watch are also **not** added to Mobile primary in this phase.
 *
 * Revisiting this decision requires a **separate Product GO** — do not add
 * World/Store/Watch to mobile bottom nav without that GO.
 *
 * @see docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md §2.2 / §2.7
 */

import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "./mobileNav";
import {
  DESKTOP_PRIMARY_NAV_HREFS,
  DESKTOP_PRIMARY_NAV_LABELS,
  HOME_CIRCLE_ENTRY_HREFS,
  MOBILE_PRIMARY_NAV_IDS,
  MOBILE_PRIMARY_NAV_LABELS,
} from "./platformNavContract";

/** Desktop primary includes World at this label/href. */
export const MOBILE_WORLD_DESKTOP_LABEL = "World" as const;
export const MOBILE_WORLD_DESKTOP_HREF = APP_ROUTES.worldDiscovery;

/** Mobile primary stays without World. UM Life is the social-home entry. */
export const MOBILE_PRIMARY_WITHOUT_WORLD_LABELS = [
  "Home",
  "UM Life",
  "Live",
  "Messages",
  "Profile",
] as const;

/** Paths that must not be mobile primary tabs under this decision. */
export const MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS = [
  APP_ROUTES.worldDiscovery,
  APP_ROUTES.store,
  APP_ROUTES.watch,
] as const;

export function assertMobileWorldAffordanceDecision(): void {
  if (!DESKTOP_PRIMARY_NAV_LABELS.includes(MOBILE_WORLD_DESKTOP_LABEL)) {
    throw new Error("World missing from desktop primary labels contract");
  }
  if (!DESKTOP_PRIMARY_NAV_HREFS.includes(MOBILE_WORLD_DESKTOP_HREF)) {
    throw new Error("World missing from desktop primary hrefs contract");
  }
  if (
    !APP_NAV_ITEMS.some(
      (item) =>
        item.label === MOBILE_WORLD_DESKTOP_LABEL &&
        item.href === MOBILE_WORLD_DESKTOP_HREF
    )
  ) {
    throw new Error("World missing from live APP_NAV_ITEMS");
  }

  const mobileLabels = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label);
  const mobileIds = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.id);
  const mobileHrefs = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href);

  if (mobileLabels.join("|") !== MOBILE_PRIMARY_WITHOUT_WORLD_LABELS.join("|")) {
    throw new Error("Mobile primary labels drifted from World-affordance decision");
  }
  if (mobileLabels.includes("World") || mobileIds.includes("world" as never)) {
    throw new Error("World must not appear in mobile primary under current Product decision");
  }
  if (mobileIds.join("|") !== MOBILE_PRIMARY_NAV_IDS.join("|")) {
    throw new Error("Mobile primary ids drifted from frozen contract");
  }
  if (mobileLabels.join("|") !== MOBILE_PRIMARY_NAV_LABELS.join("|")) {
    throw new Error("Mobile primary labels drifted from frozen contract");
  }

  for (const href of MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS) {
    if (mobileHrefs.includes(href)) {
      throw new Error(`Excluded domain href ${href} must not be a mobile primary tab`);
    }
  }

  // Circles remain the documented mobile entry ramp for World (layout locked).
  if (!HOME_CIRCLE_ENTRY_HREFS.includes(MOBILE_WORLD_DESKTOP_HREF)) {
    throw new Error("World must remain a Home circle entry ramp under this decision");
  }
}
