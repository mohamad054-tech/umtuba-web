/**
 * Official UMTUBA brand copy for metadata, manifest, and social sharing.
 * Do not invent legal entities, awards, user counts, or launch claims here.
 */

export const BRAND = {
  name: "UMTUBA",
  tagline: "Ideas Without Borders",
  taglineAr: "أفكار بلا حدود",
  mission: "Every idea deserves a chance to reach the world.",
  /** Canonical production origin (fallback when env is unset in production). */
  productionOrigin: "https://umtuba.com",
  /** Development metadataBase fallback. */
  developmentOrigin: "http://localhost:3000",
} as const;

/**
 * Official web brand assets extracted from the owner-approved End Tag video
 * (UMTUBA_LOGO_FROM_APPROVED_VIDEO_V1). Stacked lockup is primary: symbol above UMTUBA.
 * Do not regenerate or replace with V2/V3/V4 artwork.
 */
export const BRAND_ASSETS = {
  stackedLogo: "/brand/umtuba_logo_stacked_from_approved_video.png",
  stackedLogoWidth: 788,
  stackedLogoHeight: 776,
  symbol: "/brand/umtuba_symbol_from_approved_video.png",
  appIcon1024: "/brand/umtuba_app_icon_1024.png",
  icon16: "/brand/umtuba_icon_16.png",
  icon32: "/brand/umtuba_icon_32.png",
  icon48: "/brand/umtuba_icon_48.png",
  icon64: "/brand/umtuba_icon_64.png",
  icon96: "/brand/umtuba_icon_96.png",
  icon144: "/brand/umtuba_icon_144.png",
  icon180: "/brand/umtuba_icon_180.png",
  icon192: "/brand/umtuba_icon_192.png",
  icon512: "/brand/umtuba_icon_512.png",
  favicon16: "/favicon-16x16.png",
  favicon32: "/favicon-32x32.png",
} as const;

/** Default document title (also used when a route omits a title). */
export const DEFAULT_TITLE = `${BRAND.name} — ${BRAND.tagline}`;

/**
 * Strong default description for global metadata / OG / Twitter.
 * Includes English + Arabic taglines and mission; no invented claims.
 */
export const DEFAULT_DESCRIPTION = `${BRAND.name} — ${BRAND.tagline}. ${BRAND.taglineAr}. ${BRAND.mission} Discover creators, live moments, and ideas from around the world.`;

export const TITLE_TEMPLATE = `%s | ${BRAND.name}`;

export const BRAND_KEYWORDS = [
  "UMTUBA",
  "Ideas Without Borders",
  "أفكار بلا حدود",
  "creators",
  "live streaming",
  "discover",
  "global community",
] as const;

/** Design tokens aligned with the existing UMTUBA dark UI. */
export const BRAND_COLORS = {
  background: "#050510",
  theme: "#050510",
  accent: "#2563eb",
  foreground: "#ffffff",
} as const;
