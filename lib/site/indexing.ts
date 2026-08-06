/**
 * Route indexing policy for robots.txt and sitemap.
 *
 * Wired to Unified Navigation Foundation + Page Registry (Wiring V1).
 * Route membership is derived — not a duplicated hardcoded tree.
 *
 * Public profiles (`/profile/[username]`) remain deferred (dynamic).
 */

import {
  buildSitemapEntries,
  collectRobotsDisallowPaths,
} from "../platform/navigation";

/**
 * Path prefixes / paths disallowed in robots.txt.
 * Derived from registry access, admin, hidden, and deprecated metadata.
 */
export const ROBOTS_DISALLOW_PATHS: readonly string[] =
  collectRobotsDisallowPaths();

/**
 * Legitimate public static routes for the sitemap.
 * Derived from registry-eligible public static pages.
 */
export const SITEMAP_STATIC_ROUTES: readonly string[] = buildSitemapEntries().map(
  (entry) => entry.path
);
