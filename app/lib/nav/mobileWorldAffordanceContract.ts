/**
 * Platform Navigation Mobile World Affordance Decision V2
 *
 * UM Life Home Entry V1 Product GO:
 * - Primary chrome (desktop + mobile-web) is Watch | UM Life | Create | Learning | Store.
 * - World remains reachable via Home circles + direct `/world` links.
 * - World is **not** in Mobile bottom primary.
 * - Store / Watch **are** primary tabs under this GO.
 *
 * World is no longer required on desktop primary — five first-class destinations
 * must stay visible without overflow on narrow devices.
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

/** World remains a named desktop-reachable destination (circles + `/world`). */
export const MOBILE_WORLD_DESKTOP_LABEL = "World" as const;
export const MOBILE_WORLD_DESKTOP_HREF = APP_ROUTES.worldDiscovery;

/** Mobile primary stays five first-class items — World intentionally absent. */
export const MOBILE_PRIMARY_WITHOUT_WORLD_LABELS = [
  "Watch",
  "UM Life",
  "Create",
  "Learning",
  "Store",
] as const;

/** Paths that must not be mobile primary tabs under this decision. */
export const MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS = [
  APP_ROUTES.worldDiscovery,
] as const;

export function assertMobileWorldAffordanceDecision(): void {
  if (DESKTOP_PRIMARY_NAV_LABELS.includes(MOBILE_WORLD_DESKTOP_LABEL as never)) {
    throw new Error(
      "World must not occupy desktop primary under UM Life Home Entry V1"
    );
  }
  if (DESKTOP_PRIMARY_NAV_HREFS.includes(MOBILE_WORLD_DESKTOP_HREF as never)) {
    throw new Error(
      "World must not occupy desktop primary hrefs under UM Life Home Entry V1"
    );
  }
  if (
    APP_NAV_ITEMS.some(
      (item) =>
        item.label === MOBILE_WORLD_DESKTOP_LABEL ||
        item.href === MOBILE_WORLD_DESKTOP_HREF
    )
  ) {
    throw new Error("World must not appear in live APP_NAV_ITEMS under V2");
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
