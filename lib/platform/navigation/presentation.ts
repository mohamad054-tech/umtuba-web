/**
 * Presentation metadata for Main / User chrome.
 * Maps registry page IDs → labels, slots, and capability gates.
 * Does NOT store route paths — paths come from Page Registry.
 */

export type UserMenuCapabilityKey =
  | "showCreate"
  | "showInstructor"
  | "showAdmin"
  | "showSeller"
  | "showAdvertise";

export type ChromeNavPresentation = {
  /** Stable UI id (menu key / mobile tab id). */
  chromeId: string;
  /** Page Registry id — route truth. */
  pageId: string;
  /** Visible label (presentation only). */
  label: string;
  /**
   * When set, item is shown only if the matching capability is true.
   * Logout / switch-account stay outside this adapter (actions, not pages).
   */
  capability?: UserMenuCapabilityKey;
  /**
   * Profile menu uses a runtime username href; still validates registry pageId.
   */
  runtimeProfileHref?: boolean;
  /**
   * Optional production feature flag id. When false, item stays hidden
   * even if the page exists in the registry.
   */
  featureFlag?: string;
};

/** Desktop primary chrome order (matches Platform Navigation Contract). */
export const DESKTOP_MAIN_PRESENTATION: readonly ChromeNavPresentation[] = [
  { chromeId: "home", pageId: "platform.home", label: "Home" },
  { chromeId: "world", pageId: "world", label: "World" },
  { chromeId: "learning", pageId: "learning", label: "Learning" },
  { chromeId: "live", pageId: "live", label: "Live" },
  { chromeId: "messages", pageId: "messages", label: "Messages" },
] as const;

/**
 * Mobile primary chrome order.
 * World intentionally omitted (Mobile World Affordance Decision V1).
 */
export const MOBILE_MAIN_PRESENTATION: readonly ChromeNavPresentation[] = [
  { chromeId: "home", pageId: "platform.home", label: "Home" },
  { chromeId: "live", pageId: "live", label: "Live" },
  { chromeId: "messages", pageId: "messages", label: "Messages" },
  { chromeId: "profile", pageId: "profile", label: "Profile" },
] as const;

/** Authenticated user menu — You group. */
export const USER_MENU_YOU_PRESENTATION: readonly ChromeNavPresentation[] = [
  {
    chromeId: "profile",
    pageId: "profile",
    label: "Profile",
    runtimeProfileHref: true,
  },
  {
    chromeId: "create",
    pageId: "create.video",
    label: "Create",
    capability: "showCreate",
  },
  { chromeId: "saved", pageId: "saved", label: "Saved" },
  { chromeId: "learning", pageId: "learning", label: "Learning" },
  {
    chromeId: "instructor",
    pageId: "learning.instructor",
    label: "Instructor",
    capability: "showInstructor",
  },
  { chromeId: "rewards", pageId: "rewards", label: "Rewards" },
  {
    chromeId: "notifications",
    pageId: "notifications",
    label: "Notifications",
  },
] as const;

/** Authenticated user menu — Account group. */
export const USER_MENU_ACCOUNT_PRESENTATION: readonly ChromeNavPresentation[] =
  [
    { chromeId: "settings", pageId: "settings", label: "Settings" },
    { chromeId: "store", pageId: "store", label: "Store" },
    {
      chromeId: "seller",
      pageId: "seller",
      label: "Seller hub",
      capability: "showSeller",
    },
    { chromeId: "wishlist", pageId: "store.wishlist", label: "Wishlist" },
    {
      chromeId: "advertise",
      pageId: "advertise",
      label: "Advertise",
      capability: "showAdvertise",
    },
    {
      chromeId: "admin-ads",
      pageId: "admin.ads",
      label: "Admin",
      capability: "showAdmin",
    },
  ] as const;

/**
 * Production feature flags for chrome. Default: all known flags on.
 * Pages remain registry-backed; flags only gate presentation.
 */
export type ChromeFeatureFlags = Record<string, boolean>;

export const DEFAULT_CHROME_FEATURE_FLAGS: ChromeFeatureFlags = {};

export function isPresentationEnabled(
  item: ChromeNavPresentation,
  flags: ChromeFeatureFlags = DEFAULT_CHROME_FEATURE_FLAGS
): boolean {
  if (!item.featureFlag) return true;
  return flags[item.featureFlag] !== false;
}
