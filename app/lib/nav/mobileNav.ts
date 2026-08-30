import { APP_ROUTES, buildCreatorProfileHref, isSocialHomePath } from "./routes";

/**
 * Mobile primary destinations (bottom nav).
 * UM Life Home Entry V1: Watch, UM Life, Create, Learning, Store.
 * UM Life lands on `/` — the same social Home as DiscoverExperience.
 * `/discover` and `/life` alias that Home active state only.
 *
 * World / Live / Messages / Profile stay reachable via circles, UserMenu,
 * and direct routes — they are not hidden product surfaces.
 *
 * Visible below the `sm` breakpoint (max-width: 639px), matching AppTopNav
 * which reveals its primary links from `sm` upward — avoids duplicate bars.
 */
export const MOBILE_BOTTOM_NAV_MAX_CLASS = "sm:hidden" as const;

/** Height of the bar content row (excluding safe-area inset). */
export const MOBILE_BOTTOM_NAV_BAR_REM = 3.75;

/**
 * CSS variable set on `body` while the mobile bottom nav is mounted.
 * Use for page/composer offset: `pb-[var(--app-mobile-bottom-nav-offset)]`
 */
export const MOBILE_BOTTOM_NAV_OFFSET_VAR = "--app-mobile-bottom-nav-offset";

export type MobilePrimaryNavId =
  | "watch"
  | "umLife"
  | "create"
  | "learning"
  | "store";

export type MobilePrimaryNavItem = {
  id: MobilePrimaryNavId;
  label: string;
  /** Static href; profile may be resolved at render time. */
  href: string;
};

export const MOBILE_PRIMARY_NAV_ITEMS: MobilePrimaryNavItem[] = [
  { id: "watch", label: "Watch", href: APP_ROUTES.watch },
  { id: "umLife", label: "UM Life", href: APP_ROUTES.home },
  { id: "create", label: "Create", href: APP_ROUTES.createVideo },
  { id: "learning", label: "Learning", href: APP_ROUTES.learning },
  { id: "store", label: "Store", href: APP_ROUTES.store },
];

const LIVE_ROOM_PATH_RE = /^\/live\/(?!media-lab(?:\/|$))[^/]+/;

/**
 * Live rooms hide the bottom nav so chat/media controls stay reachable.
 * Lobby `/live` keeps the nav. Auth + media-lab also hide it.
 * `/live/media-lab` is a lab surface (Secondary Surface Cleanup V1) — listed
 * here only to hide chrome, never as a primary nav destination.
 */
export function shouldShowMobileBottomNav(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";

  if (
    path === APP_ROUTES.login ||
    path === APP_ROUTES.signup ||
    path === "/register" ||
    path === APP_ROUTES.forgotPassword ||
    path === APP_ROUTES.updatePassword ||
    path === APP_ROUTES.authCallback ||
    path.startsWith(`${APP_ROUTES.authCallback}/`)
  ) {
    return false;
  }

  if (path === "/live/media-lab" || path.startsWith("/live/media-lab/")) {
    return false;
  }

  if (LIVE_ROOM_PATH_RE.test(path)) {
    return false;
  }

  return true;
}

export function isMobilePrimaryNavActive(
  pathname: string,
  id: MobilePrimaryNavId
): boolean {
  const path = pathname.split("?")[0] || "/";

  switch (id) {
    case "umLife":
      return isSocialHomePath(path);
    case "watch":
      return path === APP_ROUTES.watch || path.startsWith(`${APP_ROUTES.watch}/`);
    case "create":
      return path === APP_ROUTES.createVideo || path.startsWith("/create/");
    case "learning":
      return (
        path === APP_ROUTES.learning ||
        path.startsWith(`${APP_ROUTES.learning}/`)
      );
    case "store":
      return path === APP_ROUTES.store || path.startsWith(`${APP_ROUTES.store}/`);
    default:
      return false;
  }
}

export function resolveMobileProfileHref(
  username: string | null | undefined,
  options?: { signedIn?: boolean }
): string {
  const normalized = username?.trim().replace(/^@+/, "");
  if (normalized) {
    return buildCreatorProfileHref({ username: normalized });
  }
  // Signed-in users without a resolved username hit `/profile`, which redirects
  // to their username (or Settings) — never a dead page.
  if (options?.signedIn) {
    return APP_ROUTES.profile;
  }
  return `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.profile)}`;
}

/** Tailwind-friendly padding utility for shells that sit above the bottom nav. */
export const MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS =
  "max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]" as const;
