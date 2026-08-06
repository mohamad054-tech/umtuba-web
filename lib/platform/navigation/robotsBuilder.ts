/**
 * Robots.txt generation rules from Page Registry access metadata.
 * Does not write files — returns structured rules for later wiring.
 */

import { PAGE_REGISTRY } from "../pageRegistry";
import type { PageRegistrySource, RobotsDocument } from "./types";

/**
 * Collect path prefixes that must be disallowed for public crawlers.
 * Derived from admin-only, authenticated, role-gated, and hidden pages.
 */
export function collectRobotsDisallowPaths(
  registry: PageRegistrySource = PAGE_REGISTRY
): string[] {
  const disallow = new Set<string>();

  for (const page of registry) {
    if (page.adminOnly || page.access === "admin" || page.domain === "admin") {
      // Collapse to /admin/ once
      disallow.add("/admin/");
      continue;
    }

    if (
      page.navigationVisibility === "hidden" ||
      page.deprecated ||
      page.status === "deprecated"
    ) {
      if (!page.dynamic) {
        disallow.add(page.path.endsWith("/") ? page.path : page.path);
      }
      continue;
    }

    if (
      page.access === "authenticated" ||
      page.access === "role_gated" ||
      (page.authenticated && page.access !== "public")
    ) {
      if (!page.dynamic) {
        disallow.add(page.path);
      }
    }
  }

  // Stable, sorted
  return [...disallow].sort((a, b) => a.localeCompare(b));
}

export function buildRobotsDocument(
  registry: PageRegistrySource = PAGE_REGISTRY,
  options?: { sitemapPath?: string }
): RobotsDocument {
  const disallow = collectRobotsDisallowPaths(registry);
  return {
    sitemapPath: options?.sitemapPath ?? "/sitemap.xml",
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow,
      },
    ],
  };
}

/** Serialize robots document as text (no I/O). */
export function renderRobotsTxt(doc: RobotsDocument): string {
  const lines: string[] = [];
  for (const rule of doc.rules) {
    lines.push(`User-agent: ${rule.userAgent}`);
    for (const allow of rule.allow) {
      lines.push(`Allow: ${allow}`);
    }
    for (const disallow of rule.disallow) {
      lines.push(`Disallow: ${disallow}`);
    }
    lines.push("");
  }
  lines.push(`Sitemap: ${doc.sitemapPath}`);
  return lines.join("\n");
}
