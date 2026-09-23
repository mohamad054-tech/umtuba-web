/**
 * Route indexing policy for robots.txt and page-level robots metadata.
 *
 * Index (public marketing / discovery / profiles):
 * - /, /discover, /live, /watch, /life, /learning/catalog, /store, /games,
 *   /welcome, /post-journey, /terms, /privacy, /cookies,
 *   /community-guidelines, /copyright, /about, /account-deletion,
 *   /data-export, /support, /profile/[username], /invite/*
 *
 * Noindex (auth, account, private, gated labs):
 * - login, signup, register, password reset, auth callbacks
 * - settings, messages, notifications, create, saved, rewards, creator
 * - /learning (My Learning hub), /life/compose, cart/checkout/orders/wishlist
 * - feed, journey-pro, city, live/media-lab, sandbox, store/demo-preview, hifz
 * - admin, seller, instructor, attempts
 *
 * Dynamic live rooms (/live/[roomId]) are allowlisted for crawling when linked
 * but are not enumerated in the sitemap.
 */

/**
 * Explicit Allow prefixes (longest-match). Public Learning catalog/lessons
 * must stay crawlable even when sibling /learning/instructor is disallowed.
 * Do not add a bare `/learning` Disallow — that would block lessons.
 */
export const ROBOTS_ALLOW_PATHS = [
  "/learning/lessons",
  "/learning/catalog",
] as const;

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
  "/following",
  "/rewards",
  "/creator",
  "/feed",
  "/journey-pro",
  "/city",
  "/live/media-lab",
  "/sandbox",
  "/hifz",
  "/store/demo-preview",
  "/store/cart",
  "/store/checkout",
  "/store/orders",
  "/store/wishlist",
  "/life/compose",
  "/learning/instructor",
  "/learning/attempts",
  "/admin",
  "/seller",
  "/advertise/dashboard",
] as const;

/**
 * Legitimate public static routes for the sitemap.
 * Public profiles are deferred (see sitemap.ts comment) — not queried here.
 */
export const SITEMAP_STATIC_ROUTES = [
  "/",
  "/live",
  "/watch",
  "/life",
  "/learning/catalog",
  "/store",
  "/games",
  "/welcome",
  "/post-journey",
  "/terms",
  "/privacy",
  "/account-deletion",
  "/support",
  "/cookies",
  "/community-guidelines",
  "/copyright",
  "/about",
  "/data-export",
] as const;
