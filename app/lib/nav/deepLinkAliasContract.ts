/**
 * Platform Navigation Deep-link & Alias Clarity V1
 *
 * Frozen alias / deep-link contracts for Platform Navigation only.
 * No new routers, no canonical path renames — documents and tests the live behavior.
 *
 * Auth default decision (UAF-08): `getSafeRedirectPath` fallback is `/profile`
 * (personal Profile). Discover forever-alias and `/discover?post=` deep links
 * remain supported when explicitly requested via `?next=` or builders.
 *
 * @see docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md §2.5
 */

import { APP_ROUTES, buildPostNotificationHref } from "./routes";

/** Forever Discover → Home alias path (not a primary chrome label). */
export const DISCOVER_HOME_ALIAS_PATH = APP_ROUTES.discover;

/** Canonical Home path that `/discover` resolves to. */
export const DISCOVER_ALIAS_TARGET_PATH = APP_ROUTES.home;

/**
 * Query keys preserved by `app/discover/page.tsx` when aliasing to Home.
 * Do not expand without updating the Discover alias page + tests.
 */
export const DISCOVER_ALIAS_QUERY_KEYS = [
  "post",
  "city",
  "comment",
  "country",
] as const;

/**
 * Auth `?next=` default — personal Profile resolver (UAF-08).
 * Must stay aligned with `getSafeRedirectPath` default in `lib/supabase/redirect.ts`.
 */
export const AUTH_SAFE_REDIRECT_DEFAULT_PATH = APP_ROUTES.profile;

/** Bare `/profile` index resolver path. */
export const PROFILE_INDEX_RESOLVER_PATH = APP_ROUTES.profile;

/** Signed-out profile resolver continues through login with this `next` value. */
export const PROFILE_INDEX_LOGIN_NEXT_PATH = APP_ROUTES.profile;

/**
 * Post notification / focus deep links go through Discover alias so legacy
 * `/discover?post=` clients keep working; the page redirects to `/?post=`.
 */
export function buildPostFocusDeepLink(input: {
  postId: string | number;
  commentId?: string | number | null;
}): string {
  return buildPostNotificationHref(input);
}

export function isDiscoverHomeAliasPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || "/";
  return (
    path === DISCOVER_HOME_ALIAS_PATH ||
    path.startsWith(`${DISCOVER_HOME_ALIAS_PATH}/`)
  );
}
