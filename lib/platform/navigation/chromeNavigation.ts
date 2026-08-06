/**
 * Main / User chrome builders — paths from Page Registry only.
 */

import {
  getPageById,
  type PageRegistryEntry,
} from "../pageRegistry";
import {
  DEFAULT_CHROME_FEATURE_FLAGS,
  DESKTOP_MAIN_PRESENTATION,
  MOBILE_MAIN_PRESENTATION,
  USER_MENU_ACCOUNT_PRESENTATION,
  USER_MENU_YOU_PRESENTATION,
  isPresentationEnabled,
  type ChromeFeatureFlags,
  type ChromeNavPresentation,
  type UserMenuCapabilityKey,
} from "./presentation";

export type ChromeNavLink = {
  chromeId: string;
  pageId: string;
  label: string;
  href: string;
};

export type ChromeUserMenuCapabilities = Partial<
  Record<UserMenuCapabilityKey, boolean>
>;

function assertChromeEligible(
  page: PageRegistryEntry,
  options?: { allowAdmin?: boolean }
): void {
  if (page.deprecated || page.status === "deprecated") {
    throw new Error(`Deprecated page cannot enter chrome: ${page.id}`);
  }
  if (page.legacy && page.path !== "/") {
    throw new Error(`Legacy page cannot enter chrome: ${page.id}`);
  }
  if (page.navigationVisibility === "hidden" || page.navigationVisibility === "none") {
    throw new Error(`Hidden page cannot enter chrome: ${page.id}`);
  }
  if (page.orphan) {
    throw new Error(`Orphan page cannot enter chrome: ${page.id}`);
  }
  if (page.adminOnly && !options?.allowAdmin) {
    throw new Error(`Admin-only page blocked from standard chrome: ${page.id}`);
  }
}

function resolvePresentationLink(
  item: ChromeNavPresentation,
  options?: {
    profileHref?: string;
    capabilities?: ChromeUserMenuCapabilities;
    flags?: ChromeFeatureFlags;
    allowAdmin?: boolean;
  }
): ChromeNavLink | null {
  if (!isPresentationEnabled(item, options?.flags ?? DEFAULT_CHROME_FEATURE_FLAGS)) {
    return null;
  }
  if (item.capability) {
    if (options?.capabilities?.[item.capability] !== true) {
      return null;
    }
  }

  const page = getPageById(item.pageId);
  if (!page) {
    throw new Error(`Chrome presentation missing registry page: ${item.pageId}`);
  }

  assertChromeEligible(page, {
    allowAdmin: options?.allowAdmin || item.capability === "showAdmin",
  });

  let href = page.path;
  if (item.runtimeProfileHref) {
    const runtime = options?.profileHref?.trim();
    if (!runtime) {
      throw new Error("runtimeProfileHref requires profileHref");
    }
    href = runtime;
  }

  return {
    chromeId: item.chromeId,
    pageId: page.id,
    label: item.label,
    href,
  };
}

/**
 * Desktop main navigation — presentation order ∩ registry primary pages.
 * Does not auto-append orphans or extra primary hubs.
 * Authenticated primary destinations (e.g. Messages) remain visible in chrome;
 * page-level auth is unchanged.
 */
export function listDesktopMainNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links: ChromeNavLink[] = [];

  for (const item of DESKTOP_MAIN_PRESENTATION) {
    const link = resolvePresentationLink(item, { flags, allowAdmin: false });
    if (!link) continue;
    const page = getPageById(link.pageId);
    if (!page || page.navigationVisibility !== "primary") {
      throw new Error(
        `Desktop main presentation requires primary visibility: ${item.pageId}`
      );
    }
    if (link.href.startsWith("/admin")) {
      throw new Error(`Admin path leaked into main nav: ${link.href}`);
    }
    links.push(link);
  }
  return links;
}

/** Mobile main navigation — same route truth, presentation subset. */
export function listMobileMainNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links: ChromeNavLink[] = [];
  for (const item of MOBILE_MAIN_PRESENTATION) {
    const link = resolvePresentationLink(item, { flags, allowAdmin: false });
    if (link) {
      if (link.href.startsWith("/admin")) {
        throw new Error(`Admin path leaked into mobile main nav: ${link.href}`);
      }
      links.push(link);
    }
  }
  return links;
}

export type ChromeUserMenuGroup = {
  id: "you" | "account";
  label: string;
  items: ChromeNavLink[];
};

/**
 * Authenticated user menu groups.
 * Guest surfaces do not use this builder (Sign in remains an action).
 */
export function buildChromeUserMenuGroups(
  profileHref: string,
  capabilities: ChromeUserMenuCapabilities = {
    showCreate: true,
    showAdvertise: true,
  },
  flags?: ChromeFeatureFlags
): ChromeUserMenuGroup[] {
  const build = (items: readonly ChromeNavPresentation[]) =>
    items
      .map((item) =>
        resolvePresentationLink(item, {
          profileHref,
          capabilities,
          flags,
          allowAdmin: item.capability === "showAdmin",
        })
      )
      .filter((item): item is ChromeNavLink => item != null);

  return [
    { id: "you", label: "You", items: build(USER_MENU_YOU_PRESENTATION) },
    {
      id: "account",
      label: "Account",
      items: build(USER_MENU_ACCOUNT_PRESENTATION),
    },
  ];
}

/** Assert every chrome href (except runtime profile) matches registry path. */
export function assertChromeLinksMatchRegistry(
  links: readonly ChromeNavLink[]
): void {
  for (const link of links) {
    const page = getPageById(link.pageId);
    if (!page) {
      throw new Error(`Missing registry page for chrome link: ${link.pageId}`);
    }
    if (link.chromeId === "profile" && link.href !== page.path) {
      // Runtime profile href is allowed to differ (username deep link).
      continue;
    }
    if (link.href !== page.path) {
      throw new Error(
        `Chrome href drifted from registry for ${link.pageId}: ${link.href} vs ${page.path}`
      );
    }
  }
}
