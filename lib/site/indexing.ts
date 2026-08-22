/**
 * Route indexing policy for robots.txt and page-level robots metadata.
 *
 * Index (public marketing / discovery / profiles):
 * - /, /discover, /live, /watch, /life, /learning/catalog, /store, /games,
 *   /welcome, /post-journey, /terms, /privacy, /account-deletion, /support,
 *   /profile/[username], /invite/*
 *
 * Noindex (auth, account, private, gated labs):
 * - login, signup, register, password reset, auth callbacks
 * - settings, messages, notifications, create, saved, rewards, creator
 * - /learning (My Learning hub), /life/compose, cart/checkout/orders/wishlist
 * - feed, journey-pro, city, live/media-lab, sandbox, store/demo-preview
 * - admin, seller, instructor, attempts
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
  "/following",
  "/rewards",
  "/creator",
  "/feed",
  "/journey-pro",
  "/city",
  "/live/media-lab",
  "/sandbox",
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
] as const;
