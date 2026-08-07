/**
 * Presentation metadata for Main / User / Commerce / Learning chrome.
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

/**
 * Desktop primary chrome order (U1 Global Shell / Navigation Coherence).
 * Canonical labels: Home (not Discover), World (not Map), Store (not Commerce).
 * Collaboration/Workspaces deferred — route absent on this baseline (HOLD).
 */
export const DESKTOP_MAIN_PRESENTATION: readonly ChromeNavPresentation[] = [
  { chromeId: "home", pageId: "platform.home", label: "Home" },
  { chromeId: "world", pageId: "world", label: "World" },
  { chromeId: "learning", pageId: "learning", label: "Learning" },
  { chromeId: "store", pageId: "store", label: "Store" },
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

/**
 * Authenticated user menu — You group.
 * U1: World + Store listed here for mobile discovery (bottom nav capacity frozen;
 * Mobile World Affordance Decision V1 keeps World/Store off mobile primary tabs).
 */
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
  { chromeId: "store", pageId: "store", label: "Store" },
  { chromeId: "world", pageId: "world", label: "World" },
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
 * Seller store operational chrome (seller audience only).
 * Paths from registry; labels are presentation overlays.
 */
export const SELLER_STORE_CHROME_PRESENTATION: readonly ChromeNavPresentation[] =
  [
    { chromeId: "dashboard", pageId: "seller.store", label: "Dashboard" },
    {
      chromeId: "products",
      pageId: "seller.store.products",
      label: "Products",
    },
    { chromeId: "orders", pageId: "seller.store.orders", label: "Orders" },
    {
      chromeId: "inventory",
      pageId: "seller.store.inventory",
      label: "Inventory",
    },
    {
      chromeId: "marketplace",
      pageId: "seller.store.marketplace",
      label: "Marketplace",
    },
    {
      chromeId: "analytics",
      pageId: "seller.store.analytics",
      label: "Analytics",
    },
    {
      chromeId: "promotions",
      pageId: "seller.store.promotions",
      label: "Promotions",
    },
    {
      chromeId: "shipping",
      pageId: "seller.store.shipping",
      label: "Shipping",
    },
  ] as const;

/**
 * Buyer store entry chrome (buyer / public storefront utilities).
 * Never includes seller or admin destinations.
 */
export const BUYER_STORE_CHROME_PRESENTATION: readonly ChromeNavPresentation[] =
  [
    { chromeId: "store", pageId: "store", label: "Store" },
    { chromeId: "search", pageId: "store.search", label: "Search" },
    { chromeId: "cart", pageId: "store.cart", label: "Cart" },
    { chromeId: "orders", pageId: "store.orders", label: "Orders" },
    { chromeId: "wishlist", pageId: "store.wishlist", label: "Wishlist" },
  ] as const;

/**
 * Learner hub chrome — learner audience only.
 * Instructor/admin destinations stay out of this list.
 */
export const LEARNING_LEARNER_CHROME_PRESENTATION: readonly ChromeNavPresentation[] =
  [
    { chromeId: "hub", pageId: "learning", label: "My Learning" },
    { chromeId: "catalog", pageId: "learning.catalog", label: "Catalog" },
    {
      chromeId: "transcript",
      pageId: "learning.transcript",
      label: "Transcript",
    },
  ] as const;

/**
 * Instructor chrome — instructor capability gated at call site.
 * Never mixed into learner chrome builders.
 */
export const LEARNING_INSTRUCTOR_CHROME_PRESENTATION: readonly ChromeNavPresentation[] =
  [
    {
      chromeId: "instructor",
      pageId: "learning.instructor",
      label: "Instructor",
    },
    {
      chromeId: "review",
      pageId: "learning.instructor.review",
      label: "Review",
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
