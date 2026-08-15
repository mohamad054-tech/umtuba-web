/**
 * Store Hardening V1 — unfinished merchandising surfaces stay off by default.
 * Opt-in via NEXT_PUBLIC_STORE_SHOW_* = "1".
 */

function envFlag(name: string): boolean {
  return process.env[name] === "1";
}

export const STOREFRONT_FLAGS = {
  SHOW_LIVE_SHOPPING: envFlag("NEXT_PUBLIC_STORE_SHOW_LIVE_SHOPPING"),
  SHOW_SHOPPABLE_VIDEO_RAIL: envFlag("NEXT_PUBLIC_STORE_SHOW_SHOPPABLE_VIDEO_RAIL"),
  SHOW_FLASH_DEALS: envFlag("NEXT_PUBLIC_STORE_SHOW_FLASH_DEALS"),
  SHOW_BRAND_RAIL: envFlag("NEXT_PUBLIC_STORE_SHOW_BRAND_RAIL"),
  SHOW_STORE_PROFILE_VIDEOS_TAB: envFlag(
    "NEXT_PUBLIC_STORE_SHOW_PROFILE_VIDEOS_TAB"
  ),
  SHOW_STORE_PROFILE_LIVE_TAB: envFlag("NEXT_PUBLIC_STORE_SHOW_PROFILE_LIVE_TAB"),
  SHOW_STORE_PROFILE_RATINGS_TAB: envFlag(
    "NEXT_PUBLIC_STORE_SHOW_PROFILE_RATINGS_TAB"
  ),
  /** Reviews/Q&A product is out of stage — keep PDP placeholder off by default. */
  SHOW_PDP_REVIEWS_PLACEHOLDER: envFlag(
    "NEXT_PUBLIC_STORE_SHOW_PDP_REVIEWS_PLACEHOLDER"
  ),
  /** Follow / follower social chrome — unfinished for this stage. */
  SHOW_STORE_FOLLOW_UI: envFlag("NEXT_PUBLIC_STORE_SHOW_FOLLOW_UI"),
  /**
   * Show remote E2E sandbox catalog (UMTUBA_E2E_*) on public storefront.
   * Default off so demo products cannot merchandize in production.
   */
  SHOW_SANDBOX_CATALOG: envFlag("NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG"),
} as const;
