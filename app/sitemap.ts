import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "../lib/platform/navigation";
import { absoluteUrl } from "../lib/site/siteUrl";

/**
 * Public static sitemap — registry-driven via Unified Navigation Foundation.
 *
 * Deferred: public profiles (`/profile/[username]`).
 * Dynamic templates without concrete URLs are excluded by the builder.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return buildSitemapEntries().map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified,
    changeFrequency: entry.changefreq,
    priority: entry.priority,
  }));
}
