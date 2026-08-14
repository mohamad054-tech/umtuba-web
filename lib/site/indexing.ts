/**
 * Route indexing policy for robots.txt and page-level robots metadata.
 *
 * Index (public marketing / discovery / profiles):
 * - /, /discover, /live, /watch, /post-journey, /terms, /privacy, /account-deletion, /support, /profile/*, /invite/*
 *
 * Noindex (auth, account, private, gated labs):
 * - login, signup, register, password reset, auth callbacks
 * - settings, messages, notifications, create, saved, rewards, creator
 * - feed, journey-pro, city, live/media-lab
 *
 * Dynamic live rooms (/live/[roomId]) are allowlisted for crawling when linked
 * but are not enumerated in the sitemap.
 */

/** Path prefixes disallowed in robots.txt (trailing slash means prefix match). */
export const ROBOTS_DISALLOW_PATHS = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/auth/",
  "/settings",
  "/messages",
  "/notifications",
  "/create",
  "/saved",
  "/rewards",
  "/creator",
  "/feed",
  "/journey-pro",
  "/city",
  "/live/media-lab",
] as const;

/**
 * Legitimate public static routes for the sitemap.
 * Public profiles are deferred (see sitemap.ts comment) — not queried here.
 */
export const SITEMAP_STATIC_ROUTES = [
  "/",
  "/discover",
  "/live",
  "/watch",
  "/post-journey",
  "/terms",
  "/privacy",
  "/account-deletion",
  "/support",
] as const;
