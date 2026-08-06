/**
 * Context-aware breadcrumbs from Page Registry parent links.
 */

import {
  PAGE_REGISTRY,
  getPageById,
  getPageByPath,
  type PageRegistryEntry,
} from "../pageRegistry";
import type { BreadcrumbItem, PageRegistrySource } from "./types";

/**
 * Match a concrete pathname to a registry entry.
 * Prefers exact path, then longest static prefix, then dynamic template match.
 */
export function resolvePageForPath(
  pathname: string,
  registry: PageRegistrySource = PAGE_REGISTRY
): PageRegistryEntry | undefined {
  const path = pathname.split("?")[0] || "/";
  const exact = registry.find((p) => p.path === path);
  if (exact) return exact;

  // Dynamic template: /store/[storeSlug] matches /store/acme
  const dynamicHits = registry
    .filter((p) => p.dynamic)
    .map((p) => ({ page: p, score: dynamicMatchScore(p.path, path) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (dynamicHits[0]) return dynamicHits[0].page;

  // Longest static ancestor prefix present in registry
  const parts = path.split("/").filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const prefix = "/" + parts.slice(0, i).join("/");
    const hit = registry.find((p) => p.path === prefix);
    if (hit) return hit;
  }
  return registry.find((p) => p.path === "/");
}

function dynamicMatchScore(template: string, path: string): number {
  const t = template.split("/").filter(Boolean);
  const p = path.split("/").filter(Boolean);
  if (t.length !== p.length) return 0;
  let score = 0;
  for (let i = 0; i < t.length; i++) {
    const seg = t[i]!;
    if (seg.startsWith("[") && seg.endsWith("]")) {
      score += 1;
      continue;
    }
    if (seg !== p[i]) return 0;
    score += 3;
  }
  return score;
}

/**
 * Build breadcrumb trail for a pathname using registry parentId chain.
 * Always resolves; falls back to Home when unknown.
 */
export function buildBreadcrumbs(
  pathname: string,
  registry: PageRegistrySource = PAGE_REGISTRY
): BreadcrumbItem[] {
  const page = resolvePageForPath(pathname, registry);
  if (!page) {
    return [
      {
        pageId: "platform.home",
        label: "Home",
        href: "/",
        dynamic: false,
      },
    ];
  }

  const chain: PageRegistryEntry[] = [];
  const seen = new Set<string>();
  let current: PageRegistryEntry | undefined = page;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    if (!current.parentId) break;
    current =
      registry.find((p) => p.id === current!.parentId) ??
      getPageById(current.parentId);
  }

  // Ensure Home is the root when chain does not include it
  if (chain[0]?.path !== "/") {
    const home =
      registry.find((p) => p.path === "/") ?? getPageByPath("/");
    if (home && !seen.has(home.id)) {
      chain.unshift(home);
    }
  }

  return chain.map((entry) => ({
    pageId: entry.id,
    label: entry.title,
    href: entry.path,
    dynamic: entry.dynamic,
  }));
}

/** Assert every breadcrumb pageId exists in the registry. */
export function assertBreadcrumbsResolve(
  crumbs: readonly BreadcrumbItem[],
  registry: PageRegistrySource = PAGE_REGISTRY
): void {
  const ids = new Set(registry.map((p) => p.id));
  for (const crumb of crumbs) {
    if (!ids.has(crumb.pageId)) {
      throw new Error(`Breadcrumb page missing from registry: ${crumb.pageId}`);
    }
  }
}
