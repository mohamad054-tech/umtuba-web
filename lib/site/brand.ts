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
