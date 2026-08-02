import { isCollaborationPlatformEnabled } from "../../../lib/collaboration/collaborationPlatformGate";
import { APP_ROUTES } from "./routes";

/**
 * Account menu destinations for UserMenu.
 * Grouped for accessibility (role=group) and consistent ordering across surfaces.
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

export type UserMenuBuildOptions = {
  /** Explicit override (tests / server-injected). */
  collaborationPlatformEnabled?: boolean;
  /** Injectable env source (surfaceGates pattern). */
  env?: Record<string, string | undefined>;
};

/** Link groups only — Switch account / Sign out stay as actions in UserMenu. */
export function buildUserMenuGroups(
  profileHref: string,
  options?: UserMenuBuildOptions
): UserMenuGroup[] {
  const collaborationEnabled =
    options?.collaborationPlatformEnabled ??
    isCollaborationPlatformEnabled(options?.env);

  const accountItems: UserMenuLinkItem[] = [
    { id: "settings", label: "Settings", href: APP_ROUTES.settings },
    { id: "store", label: "Store", href: APP_ROUTES.store },
    { id: "seller", label: "Seller hub", href: APP_ROUTES.seller },
    { id: "wishlist", label: "Wishlist", href: APP_ROUTES.storeWishlist },
    { id: "advertise", label: "Advertise", href: APP_ROUTES.advertise },
  ];

  if (collaborationEnabled) {
    accountItems.push({
      id: "workspaces",
      label: "Workspaces",
      href: APP_ROUTES.workspaces,
    });
  }

  return [
    {
      id: "you",
      label: "You",
      items: [
        { id: "profile", label: "Profile", href: profileHref },
        { id: "saved", label: "Saved", href: APP_ROUTES.saved },
        { id: "learning", label: "Learning", href: APP_ROUTES.learning },
        { id: "rewards", label: "Rewards", href: APP_ROUTES.rewards },
        {
          id: "notifications",
          label: "Notifications",
          href: APP_ROUTES.notifications,
        },
      ],
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
  options?: UserMenuBuildOptions
): string[] {
  return buildUserMenuGroups(profileHref, options).flatMap((group) =>
    group.items.map((item) => item.href)
  );
}
