/**
 * Domain groupings and inventory helpers for the unified page registry.
 */

import { PAGE_REGISTRY } from "./registry";
import {
  PAGE_DOMAINS,
  type PageAccess,
  type PageDomain,
  type PageRegistryEntry,
} from "./types";

export function listPagesByDomain(domain: PageDomain): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.domain === domain);
}

export function listPagesByAccess(access: PageAccess): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.access === access);
}

export function listAdminPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.adminOnly || p.domain === "admin");
}

export function listPublicPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.access === "public" && !p.adminOnly);
}

export function listAuthenticatedPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter(
    (p) =>
      p.authenticated ||
      p.access === "authenticated" ||
      p.access === "role_gated" ||
      p.access === "admin"
  );
}

export function listDynamicPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.dynamic);
}

export function listLegacyOrDeprecatedPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter(
    (p) =>
      p.legacy ||
      p.deprecated ||
      p.status === "legacy" ||
      p.status === "deprecated"
  );
}

export function listOrphanPages(): PageRegistryEntry[] {
  return PAGE_REGISTRY.filter((p) => p.orphan === true);
}

export function getPageById(id: string): PageRegistryEntry | undefined {
  return PAGE_REGISTRY.find((p) => p.id === id);
}

export function getPageByPath(path: string): PageRegistryEntry | undefined {
  return PAGE_REGISTRY.find((p) => p.path === path);
}

export function domainCounts(): Record<PageDomain, number> {
  const counts = Object.fromEntries(
    PAGE_DOMAINS.map((d) => [d, 0])
  ) as Record<PageDomain, number>;
  for (const page of PAGE_REGISTRY) {
    counts[page.domain] += 1;
  }
  return counts;
}

export function searchPages(query: string): PageRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...PAGE_REGISTRY];
  return PAGE_REGISTRY.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.domain.toLowerCase().includes(q)
  );
}
