import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "./mobileNav";
import { buildUserMenuGroups } from "./userMenuItems";
import {
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
  type UserMenuCapabilities,
} from "./userMenuCapabilities";

/** Desktop primary labels (Discover is intentionally absent). */
export const DESKTOP_PRIMARY_NAV_LABELS = [
  "Home",
  "UM Life",
  "World",
  "Learning",
  "Live",
  "Messages",
] as const;

/** Desktop primary hrefs in lockstep with labels. */
export const DESKTOP_PRIMARY_NAV_HREFS = [
  APP_ROUTES.home,
  APP_ROUTES.home,
  APP_ROUTES.worldDiscovery,
  APP_ROUTES.learning,
  APP_ROUTES.live,
  APP_ROUTES.messages,
] as const;

/** Mobile primary ids (no Discover tab). */
export const MOBILE_PRIMARY_NAV_IDS = [
  "home",
  "umLife",
  "live",
  "messages",
  "profile",
] as const;

/** Mobile primary labels in order. */
export const MOBILE_PRIMARY_NAV_LABELS = [
  "Home",
  "UM Life",
  "Live",
  "Messages",
  "Profile",
] as const;

/**
 * Home circles destination order — entry ramps only.
 * Layout of HomeSectionCircles remains locked except the scoped UM Life
 * destination append (after Live, before World). Feed / swipe / player stay locked.
 */
export const HOME_CIRCLE_ENTRY_HREFS = [
  APP_ROUTES.learning,
  APP_ROUTES.store,
  APP_ROUTES.games,
  APP_ROUTES.live,
  APP_ROUTES.life,
  APP_ROUTES.worldDiscovery,
  APP_ROUTES.search,
  APP_ROUTES.messages,
  APP_ROUTES.create,
] as const;

/** User menu group ids. */
export const USER_MENU_GROUP_IDS = ["you", "account"] as const;

/**
 * Signed-in baseline labels (Create + Advertise on; Instructor/Seller/Admin off).
 * Capability Links V1 — optional labels appear only when capabilities allow.
 */
export const USER_MENU_BASE_ITEM_LABELS = [
  "Profile",
  "Create",
  "Saved",
  "Following",
  "Learning",
  "Rewards",
  "Notifications",
  "Settings",
  "Store",
  "Wishlist",
  "Advertise",
] as const;

/** @deprecated Use USER_MENU_BASE_ITEM_LABELS + capability expectations. */
export const USER_MENU_ITEM_LABELS = USER_MENU_BASE_ITEM_LABELS;

/** Forever Home alias path (not a primary chrome label). */
export const DISCOVER_HOME_ALIAS = APP_ROUTES.discover;

/**
 * Auth post-login default next path (UAF-08).
 * Bare `/profile` resolves to the signed-in user's public profile (or Settings).
 * Explicit `?next=` / protected-route / deep-link overrides remain honored.
 */
export const AUTH_DEFAULT_NEXT_PATH = APP_ROUTES.profile;

/** Bare profile resolver path. */
export const PROFILE_INDEX_PATH = APP_ROUTES.profile;

export function expectedUserMenuLabels(
  capabilities: UserMenuCapabilities = USER_MENU_CAPABILITIES_SIGNED_IN_BASE
): string[] {
  return buildUserMenuGroups("/profile/contract_user", capabilities).flatMap(
    (group) => group.items.map((item) => item.label)
  );
}

/** Assert live desktop nav matches the frozen contract. */
export function assertDesktopPrimaryNavContract(): void {
  const labels = APP_NAV_ITEMS.map((item) => item.label);
  const hrefs = APP_NAV_ITEMS.map((item) => item.href);
  if (labels.join("|") !== DESKTOP_PRIMARY_NAV_LABELS.join("|")) {
    throw new Error("Desktop primary nav labels drifted from contract");
  }
  if (hrefs.join("|") !== DESKTOP_PRIMARY_NAV_HREFS.join("|")) {
    throw new Error("Desktop primary nav hrefs drifted from contract");
  }
  if (labels.includes("Discover")) {
    throw new Error("Discover must not appear as a desktop primary label");
  }
}

/** Assert live mobile nav matches the frozen contract. */
export function assertMobilePrimaryNavContract(): void {
  const ids = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.id);
  const labels = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label);
  if (ids.join("|") !== MOBILE_PRIMARY_NAV_IDS.join("|")) {
    throw new Error("Mobile primary nav ids drifted from contract");
  }
  if (labels.join("|") !== MOBILE_PRIMARY_NAV_LABELS.join("|")) {
    throw new Error("Mobile primary nav labels drifted from contract");
  }
  if (labels.includes("Discover") || ids.includes("discover" as never)) {
    throw new Error("Discover must not appear as a mobile primary item");
  }
}

/** Assert live user menu baseline matches Capability Links V1 base contract. */
export function assertUserMenuContract(
  profileHref = "/profile/contract_user",
  capabilities: UserMenuCapabilities = USER_MENU_CAPABILITIES_SIGNED_IN_BASE
): void {
  const groups = buildUserMenuGroups(profileHref, capabilities);
  const groupIds = groups.map((group) => group.id);
  const labels = groups.flatMap((group) => group.items.map((item) => item.label));
  if (groupIds.join("|") !== USER_MENU_GROUP_IDS.join("|")) {
    throw new Error("User menu groups drifted from contract");
  }
  const expected = expectedUserMenuLabels(capabilities);
  if (labels.join("|") !== expected.join("|")) {
    throw new Error("User menu item labels drifted from contract");
  }
}
