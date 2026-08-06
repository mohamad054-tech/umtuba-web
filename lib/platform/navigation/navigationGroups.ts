/**
 * Group membership rules — derived from Page Registry fields only.
 * No hardcoded navigation path trees.
 */

import type { PageRegistryEntry } from "../pageRegistry";
import type { NavigationGroupId } from "./types";

export type NavigationGroupDefinition = {
  id: NavigationGroupId;
  label: string;
  description: string;
  /**
   * Returns true when a registry page belongs in this group.
   * Must not invent paths; only inspect registry metadata.
   */
  matches: (page: PageRegistryEntry) => boolean;
};

function isVisibleInChrome(page: PageRegistryEntry): boolean {
  return (
    page.navigationVisibility !== "hidden" &&
    page.navigationVisibility !== "none" &&
    !page.deprecated &&
    page.status !== "deprecated"
  );
}

function isStatic(page: PageRegistryEntry): boolean {
  return !page.dynamic;
}

/** Hub-ish depth: `/a`, `/a/b`, or `/a/b/c` (seller store children). */
function pathDepth(path: string): number {
  if (path === "/") return 0;
  return path.split("/").filter(Boolean).length;
}

/**
 * Canonical group definitions. Membership is registry-field driven.
 */
export const NAVIGATION_GROUP_DEFINITIONS: readonly NavigationGroupDefinition[] =
  [
    {
      id: "main",
      label: "Main Navigation",
      description: "Primary chrome destinations from registry primary visibility.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.navigationVisibility === "primary" &&
        !page.adminOnly &&
        !page.legacy,
    },
    {
      id: "user",
      label: "User Navigation",
      description:
        "Signed-in member destinations (profile, saved, rewards, notifications).",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        !page.adminOnly &&
        !page.legacy &&
        (page.audience === "member" ||
          page.audience === "creator" ||
          page.domain === "profile") &&
        (page.navigationVisibility === "secondary" ||
          page.navigationVisibility === "utility") &&
        (page.authenticated ||
          page.access === "authenticated" ||
          page.domain === "profile"),
    },
    {
      id: "admin",
      label: "Admin Navigation",
      description: "Platform admin consoles excluding AI-specific admin trees.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.adminOnly &&
        page.domain === "admin",
    },
    {
      id: "settings",
      label: "Settings Navigation",
      description: "Account and settings surfaces.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.domain === "settings",
    },
    {
      id: "aiAdmin",
      label: "AI Admin Navigation",
      description: "AI / Knowledge / Private AI / AI Data admin surfaces.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.adminOnly &&
        page.domain === "ai",
    },
    {
      id: "learning",
      label: "Learning Navigation",
      description: "Learning hubs (learner + instructor) from registry.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.domain === "learning" &&
        pathDepth(page.path) <= 2 &&
        (page.section === "hub" ||
          page.section === "instructor" ||
          page.section === "catalog" ||
          page.section === "learner" ||
          page.navigationVisibility === "primary" ||
          page.navigationVisibility === "secondary"),
    },
    {
      id: "commerce",
      label: "Commerce Navigation",
      description: "Store, seller, and advertise hubs from registry.",
      matches: (page) =>
        isVisibleInChrome(page) &&
        isStatic(page) &&
        page.domain === "commerce" &&
        pathDepth(page.path) <= 3 &&
        (page.section === "storefront" ||
          page.section === "buyer" ||
          page.section === "seller" ||
          page.section === "advertise") &&
        (page.navigationVisibility === "primary" ||
          page.navigationVisibility === "secondary" ||
          page.navigationVisibility === "utility"),
    },
  ] as const;

export function getGroupDefinition(
  id: NavigationGroupId
): NavigationGroupDefinition {
  const found = NAVIGATION_GROUP_DEFINITIONS.find((g) => g.id === id);
  if (!found) {
    throw new Error(`Unknown navigation group: ${id}`);
  }
  return found;
}
