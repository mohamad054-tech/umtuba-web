import { APP_ROUTES } from "./routes";
import {
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
  type UserMenuCapabilities,
} from "./userMenuCapabilities";

/** Matches `LEARNING_INSTRUCTOR_ROUTES.hub` without importing authoring module. */
const INSTRUCTOR_HUB_HREF = "/learning/instructor";

/**
 * Account menu destinations for UserMenu.
 * Grouped for accessibility (role=group) and consistent ordering across surfaces.
 *
 * Capability Links V1: optional Create / Instructor / Seller / Admin via
 * `UserMenuCapabilities` (existing helpers only).
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

/** Link groups only — Switch account / Sign out stay as actions in UserMenu. */
export function buildUserMenuGroups(
  profileHref: string,
  capabilities: UserMenuCapabilities = USER_MENU_CAPABILITIES_SIGNED_IN_BASE
): UserMenuGroup[] {
  const youItems: UserMenuLinkItem[] = [
    { id: "profile", label: "Profile", href: profileHref },
  ];

  if (capabilities.showCreate) {
    youItems.push({
      id: "create",
      label: "Create",
      href: APP_ROUTES.create,
    });
  }

  youItems.push(
    { id: "saved", label: "Saved", href: APP_ROUTES.saved },
    { id: "learning", label: "Learning", href: APP_ROUTES.learning }
  );

  if (capabilities.showInstructor) {
    youItems.push({
      id: "instructor",
      label: "Instructor",
      href: INSTRUCTOR_HUB_HREF,
    });
  }

  youItems.push(
    { id: "rewards", label: "Rewards", href: APP_ROUTES.rewards },
    {
      id: "notifications",
      label: "Notifications",
      href: APP_ROUTES.notifications,
    }
  );

  const accountItems: UserMenuLinkItem[] = [
    { id: "settings", label: "Settings", href: APP_ROUTES.settings },
    { id: "store", label: "Store", href: APP_ROUTES.store },
  ];

  if (capabilities.showSeller) {
    accountItems.push({
      id: "seller",
      label: "Seller hub",
      href: APP_ROUTES.seller,
    });
  }

  accountItems.push({
    id: "wishlist",
    label: "Wishlist",
    href: APP_ROUTES.storeWishlist,
  });

  if (capabilities.showAdvertise) {
    accountItems.push({
      id: "advertise",
      label: "Advertise",
      href: APP_ROUTES.advertise,
    });
  }

  if (capabilities.showAdmin) {
    accountItems.push({
      id: "admin-ads",
      label: "Admin",
      href: APP_ROUTES.adminAds,
    });
  }

  return [
    {
      id: "you",
      label: "You",
      items: youItems,
    },
    {
      id: "account",
      label: "Account",
      items: accountItems,
    },
  ];
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
