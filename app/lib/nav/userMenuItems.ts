import {
  buildChromeUserMenuGroups,
  type ChromeUserMenuCapabilities,
} from "../../../lib/platform/navigation";
import {
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
  type UserMenuCapabilities,
} from "./userMenuCapabilities";

/**
 * Account menu destinations for UserMenu.
 * Grouped for accessibility (role=group) and consistent ordering across surfaces.
 *
 * Route truth: Unified Navigation / Page Registry via presentation adapter.
 * Capability Links V1: optional Create / Instructor / Seller / Admin via
 * `UserMenuCapabilities` (existing helpers only).
 * Switch account / Sign out stay as actions in UserMenu (not registry pages).
 */
export type UserMenuLinkItem = {
  id: string;
  label: string;
  href: string;
};

export type UserMenuGroup = {
  id: string;
  label: string;
  items: UserMenuLinkItem[];
};

function toChromeCapabilities(
  capabilities: UserMenuCapabilities
): ChromeUserMenuCapabilities {
  return {
    showCreate: capabilities.showCreate,
    showInstructor: capabilities.showInstructor,
    showAdmin: capabilities.showAdmin,
    showSeller: capabilities.showSeller,
    showAdvertise: capabilities.showAdvertise,
  };
}

/** Link groups only — Switch account / Sign out stay as actions in UserMenu. */
export function buildUserMenuGroups(
  profileHref: string,
  capabilities: UserMenuCapabilities = USER_MENU_CAPABILITIES_SIGNED_IN_BASE
): UserMenuGroup[] {
  return buildChromeUserMenuGroups(
    profileHref,
    toChromeCapabilities(capabilities)
  ).map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => ({
      id: item.chromeId,
      label: item.label,
      href: item.href,
    })),
  }));
}

/** Flat href list for contract tests. */
export function listUserMenuHrefs(
  profileHref: string,
  capabilities?: UserMenuCapabilities
): string[] {
  return buildUserMenuGroups(profileHref, capabilities).flatMap((group) =>
    group.items.map((item) => item.href)
  );
}
