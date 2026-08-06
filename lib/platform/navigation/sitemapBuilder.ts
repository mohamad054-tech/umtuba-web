/**
 * Public sitemap generation rules from Page Registry.
 * Does not write files — returns structured entries for later wiring.
 */

import { PAGE_REGISTRY } from "../pageRegistry";
import type { PageRegistrySource, SitemapEntry } from "./types";

function isSitemapEligible(
  page: PageRegistrySource[number]
): boolean {
  if (page.adminOnly) return false;
  if (page.access !== "public") return false;
  if (page.dynamic) return false;
  if (page.deprecated || page.status === "deprecated") return false;
  if (page.navigationVisibility === "hidden") return false;
  // Auth / identity entry points stay crawlable via links but are not sitemap destinations.
  if (page.domain === "identity") return false;
  if (page.section === "auth") return false;
  if (page.legacy && page.path !== "/discover") {
    // Keep discover out of sitemap (alias); exclude other legacy labs.
    return false;
  }
  if (page.path === "/discover") return false;
  return true;
}

function priorityFor(path: string): number {
  if (path === "/") return 1;
  const depth = path.split("/").filter(Boolean).length;
  if (depth === 1) return 0.8;
  if (depth === 2) return 0.6;
  return 0.4;
}

function changefreqFor(path: string): SitemapEntry["changefreq"] {
  if (path === "/" || path === "/store" || path === "/learning" || path === "/live") {
    return "daily";
  }
  if (path.split("/").filter(Boolean).length <= 2) return "weekly";
  return "monthly";
}

/**
 * Build sitemap entries for all public, static, non-admin registry pages.
 */
export function buildSitemapEntries(
  registry: PageRegistrySource = PAGE_REGISTRY
): SitemapEntry[] {
  const entries = registry
    .filter(isSitemapEligible)
    .map((page) => ({
      path: page.path,
      pageId: page.id,
      changefreq: changefreqFor(page.path),
      priority: priorityFor(page.path),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const paths = new Set<string>();
  for (const entry of entries) {
    if (paths.has(entry.path)) {
      throw new Error(`Duplicate sitemap path rejected: ${entry.path}`);
    }
    paths.add(entry.path);
  }
  return entries;
}

/** Serialize sitemap as XML string (no I/O). */
export function renderSitemapXml(
  entries: readonly SitemapEntry[],
  origin = "https://umtuba.com"
): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${origin}${e.path === "/" ? "" : e.path}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
