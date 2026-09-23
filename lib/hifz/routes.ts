/**
 * Permanent Learning routes for Quran / hifz surfaces.
 * Old /hifz/shams redirects permanently via next.config.ts.
 */

export const LEARNING_QURAN_ROUTES = {
  section: "/learning/quran",
  shams: "/learning/quran/shams",
} as const;

/** Legacy path that must permanently redirect to LEARNING_QURAN_ROUTES.shams. */
export const LEGACY_HIFZ_SHAMS_PATH = "/hifz/shams";

export const HIFZ_SHAMS_PERMANENT_REDIRECT = {
  source: LEGACY_HIFZ_SHAMS_PATH,
  destination: LEARNING_QURAN_ROUTES.shams,
  permanent: true,
} as const;
