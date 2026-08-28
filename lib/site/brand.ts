/**
 * Official UMTUBA brand copy for metadata, manifest, and social sharing.
 * Identity tokens come from the owner-approved V3 stacked package.
 * Do not invent legal entities, awards, user counts, or launch claims here.
 */

export const BRAND = {
  name: "UMTUBA",
  tagline: "LEARN · CREATE · SHARE",
  taglineAr: "أفكار بلا حدود",
  mission: "Every idea deserves a chance to reach the world.",
  /** Canonical production origin (fallback when env is unset in production). */
  productionOrigin: "https://umtuba.com",
  /** Development metadataBase fallback. */
  developmentOrigin: "http://localhost:3000",
} as const;

/** Default document title (also used when a route omits a title). */
export const DEFAULT_TITLE = `${BRAND.name} — ${BRAND.tagline}`;

/**
 * Strong default description for global metadata / OG / Twitter.
 * Includes official tagline + existing Arabic line and mission; no invented claims.
 */
export const DEFAULT_DESCRIPTION = `${BRAND.name} — ${BRAND.tagline}. ${BRAND.taglineAr}. ${BRAND.mission} Discover creators, live moments, and ideas from around the world.`;

export const TITLE_TEMPLATE = `%s | ${BRAND.name}`;

export const BRAND_KEYWORDS = [
  "UMTUBA",
  "LEARN · CREATE · SHARE",
  "أفكار بلا حدود",
  "creators",
  "live streaming",
  "discover",
  "global community",
] as const;

/** Design tokens from the approved V3 package, plus existing canvas fallback. */
export const BRAND_COLORS = {
  background: "#000000",
  theme: "#111111",
  accent: "#D4AF37",
  goldPrimary: "#D4AF37",
  goldLight: "#FFD86A",
  goldDark: "#B8860B",
  black: "#000000",
  dark: "#111111",
  foreground: "#FFFFFF",
  /** Existing product canvas — do not restyle pages to this token. */
  canvas: "#050510",
} as const;

export { BRAND_ASSETS, brandMarkSrc } from "./brandAssets";
export type { BrandMarkPlacement, BrandMarkSurface } from "./brandAssets";
