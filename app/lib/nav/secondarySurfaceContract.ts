/**
 * Platform Navigation Secondary Surface Cleanup V1
 *
 * Classifies Legacy / Experimental / secondary surfaces as **non-primary**.
 * Routes stay available; experiences are not disabled. Official chrome
 * (desktop primary, mobile primary, UserMenu baseline) must not promote them.
 *
 * Living Navigation overlays are Watch prototypes — not Platform Navigation
 * primary destinations (regardless of their internal placement.group labels).
 *
 * @see docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md
 */

export type SecondarySurfaceKind =
  | "legacy"
  | "experimental"
  | "lab"
  | "prototype-overlay";

export type SecondarySurfaceRecord = {
  id: string;
  kind: SecondarySurfaceKind;
  /** Path prefix or exact path when applicable; null for overlay-only surfaces. */
  path: string | null;
  note: string;
};

/**
 * Surfaces that must not appear as official Platform Navigation chrome
 * destinations (desktop primary, mobile primary, UserMenu baseline).
 */
export const SECONDARY_AND_EXPERIMENTAL_SURFACES = [
  {
    id: "living-navigation",
    kind: "prototype-overlay",
    path: null,
    note: "Watch Living Navigation overlays — prototype placeholders, not app chrome.",
  },
  {
    id: "feed",
    kind: "experimental",
    path: "/feed",
    note: "Legacy feed lab; gated by isExperimentalRouteAvailable in production.",
  },
  {
    id: "journey-pro",
    kind: "experimental",
    path: "/journey-pro",
    note: "Journey Pro lab; gated by isExperimentalRouteAvailable in production.",
  },
  {
    id: "post-journey",
    kind: "legacy",
    path: "/post-journey",
    note: "Post Journey secondary surface — reachable by deep link, not primary chrome.",
  },
  {
    id: "live-media-lab",
    kind: "lab",
    path: "/live/media-lab",
    note: "Live media lab; mobile bottom nav already hidden here.",
  },
  {
    id: "city-prototype",
    kind: "experimental",
    path: "/city",
    note: "City prototype / prepared empty in production — not primary chrome.",
  },
] as const satisfies readonly SecondarySurfaceRecord[];

/** Path strings forbidden in official chrome contracts. */
export const FORBIDDEN_OFFICIAL_CHROME_PATHS = [
  "/feed",
  "/journey-pro",
  "/post-journey",
  "/live/media-lab",
  "/city",
  "/ai",
  "/uconnect",
  "/ideas",
] as const;

/** Living Navigation feature ids — prototype overlay only. */
export const LIVING_NAVIGATION_PROTOTYPE_IDS = [
  "world",
  "store",
  "journey",
  "ai",
  "wallet",
  "hello-city",
] as const;

export function isForbiddenOfficialChromePath(href: string): boolean {
  const path = href.split("?")[0] || href;
  return FORBIDDEN_OFFICIAL_CHROME_PATHS.some(
    (forbidden) => path === forbidden || path.startsWith(`${forbidden}/`)
  );
}
