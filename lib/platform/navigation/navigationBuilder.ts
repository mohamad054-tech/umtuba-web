/**
 * Builds navigation groups exclusively from the Page Registry.
 * Rejects duplicate paths within a group build.
 */

import {
  PAGE_REGISTRY,
  getPageById,
  type PageRegistryEntry,
} from "../pageRegistry";
import {
  NAVIGATION_GROUP_DEFINITIONS,
  getGroupDefinition,
} from "./navigationGroups";
import { filterNavigationItems } from "./navigationFilters";
import type {
  NavigationContext,
  NavigationGroup,
  NavigationGroupId,
  NavigationItem,
  NavigationOrphanReport,
  PageRegistrySource,
} from "./types";

function comparePages(a: PageRegistryEntry, b: PageRegistryEntry): number {
  const visRank = (v: string) =>
    v === "primary" ? 0 : v === "secondary" ? 1 : v === "utility" ? 2 : 3;
  const byVis = visRank(a.navigationVisibility) - visRank(b.navigationVisibility);
  if (byVis !== 0) return byVis;
  const byDepth =
    a.path.split("/").filter(Boolean).length -
    b.path.split("/").filter(Boolean).length;
  if (byDepth !== 0) return byDepth;
  return a.path.localeCompare(b.path);
}

function toNavItem(
  page: PageRegistryEntry,
  groupId: NavigationGroupId,
  order: number
): NavigationItem {
  return {
    id: page.id,
    pageId: page.id,
    label: page.title,
    href: page.path,
    domain: page.domain,
    section: page.section,
    access: page.access,
    audience: page.audience,
    visibility: page.navigationVisibility,
    adminOnly: page.adminOnly,
    authenticated: page.authenticated,
    dynamic: page.dynamic,
    status: page.status,
    groupId,
    parentPageId: page.parentId,
    order,
  };
}

/**
 * Assert paths within a set of items are unique.
 * Throws when duplicates are found (foundation invariant).
 */
export function assertUniqueNavigationPaths(
  items: readonly NavigationItem[]
): void {
  const seen = new Map<string, string>();
  for (const item of items) {
    const prev = seen.get(item.href);
    if (prev && prev !== item.pageId) {
      throw new Error(
        `Duplicate navigation path rejected: ${item.href} (${prev} vs ${item.pageId})`
      );
    }
    seen.set(item.href, item.pageId);
  }
}

export function buildNavigationGroup(
  groupId: NavigationGroupId,
  registry: PageRegistrySource = PAGE_REGISTRY,
  context?: NavigationContext
): NavigationGroup {
  const def = getGroupDefinition(groupId);
  const matched = registry
    .filter((page) => def.matches(page))
    .slice()
    .sort(comparePages);

  let items = matched.map((page, index) => toNavItem(page, groupId, index));
  assertUniqueNavigationPaths(items);

  if (context) {
    items = filterNavigationItems(items, context);
  }

  return {
    id: def.id,
    label: def.label,
    description: def.description,
    items,
  };
}

export function buildAllNavigationGroups(
  registry: PageRegistrySource = PAGE_REGISTRY,
  context?: NavigationContext
): NavigationGroup[] {
  return NAVIGATION_GROUP_DEFINITIONS.map((def) =>
    buildNavigationGroup(def.id, registry, context)
  );
}

/** Flat list of all built nav items (all groups), path-unique across groups. */
export function listAllNavigationItems(
  registry: PageRegistrySource = PAGE_REGISTRY,
  context?: NavigationContext
): NavigationItem[] {
  const groups = buildAllNavigationGroups(registry, context);
  const items = groups.flatMap((g) => g.items);
  // Cross-group path reuse is allowed (same page in learning + main),
  // but each (groupId, href) pair must be unique — already enforced per group.
  return items;
}

export function reportNavigationOrphans(
  registry: PageRegistrySource = PAGE_REGISTRY
): NavigationOrphanReport[] {
  return registry
    .filter((page) => page.orphan === true)
    .map((page) => ({
      pageId: page.id,
      path: page.path,
      title: page.title,
    }));
}

/** Every nav item must resolve to a registry page. */
export function assertNavigationItemsInRegistry(
  items: readonly NavigationItem[],
  registry: PageRegistrySource = PAGE_REGISTRY
): void {
  const byId = new Map(registry.map((p) => [p.id, p]));
  for (const item of items) {
    const page = byId.get(item.pageId);
    if (!page) {
      throw new Error(`Navigation item missing from registry: ${item.pageId}`);
    }
    if (page.path !== item.href) {
      throw new Error(
        `Navigation href drifted from registry for ${item.pageId}: ${item.href} vs ${page.path}`
      );
    }
  }
}

export function resolveRegistryPage(
  pageId: string,
  registry: PageRegistrySource = PAGE_REGISTRY
): PageRegistryEntry | undefined {
  return registry.find((p) => p.id === pageId) ?? getPageById(pageId);
}
