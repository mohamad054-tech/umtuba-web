/**
 * Visibility filters for navigation items derived from Page Registry.
 */

import type { NavigationContext, NavigationItem } from "./types";

/**
 * Whether an item should appear for the given viewer context.
 * Hidden/none registry visibility is already excluded at build time;
 * this layer enforces authenticated / admin / capability gates.
 */
export function isNavigationItemVisible(
  item: NavigationItem,
  context: NavigationContext
): boolean {
  if (item.visibility === "hidden" || item.visibility === "none") {
    return false;
  }

  if (item.adminOnly || item.access === "admin") {
    return context.isAdmin && context.authenticated;
  }

  if (item.access === "role_gated") {
    if (!context.authenticated) return false;
    if (item.groupId === "learning" && item.audience === "instructor") {
      return context.capabilities?.showInstructor === true;
    }
    if (item.groupId === "commerce" && item.audience === "seller") {
      return context.capabilities?.showSeller === true;
    }
    if (item.groupId === "commerce" && item.audience === "advertiser") {
      return context.capabilities?.showAdvertise === true;
    }
    // Unknown role gate — require auth only at foundation layer.
    return true;
  }

  if (item.access === "authenticated" || item.authenticated) {
    return context.authenticated;
  }

  return true;
}

export function filterNavigationItems(
  items: readonly NavigationItem[],
  context: NavigationContext
): NavigationItem[] {
  return items.filter((item) => isNavigationItemVisible(item, context));
}

/** Public chrome context (anonymous visitor). */
export const PUBLIC_NAV_CONTEXT: NavigationContext = {
  authenticated: false,
  isAdmin: false,
};

/** Signed-in member without admin/seller/instructor caps. */
export const AUTHENTICATED_NAV_CONTEXT: NavigationContext = {
  authenticated: true,
  isAdmin: false,
};

/** Platform admin operator context. */
export const ADMIN_NAV_CONTEXT: NavigationContext = {
  authenticated: true,
  isAdmin: true,
  capabilities: {
    showInstructor: true,
    showSeller: true,
    showAdvertise: true,
  },
};
