import type { MetadataRoute } from "next";
import { SITEMAP_STATIC_ROUTES } from "../lib/site/indexing";
import { absoluteUrl } from "../lib/site/siteUrl";

/**
 * Public static sitemap only.
 *
 * Deferred: public profiles (`/profile/[username]`).
 * A bounded, privacy-safe profile query (active public usernames with a hard
 * limit) is not wired yet — do not scrape profiles indiscriminately.
 *
 * Excluded: auth/account routes, gated labs (/feed, /journey-pro, /city),
 * dynamic live-room URLs, invite codes, and private surfaces.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SITEMAP_STATIC_ROUTES.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "daily",
    priority: path === "/" ? 1 : 0.8,
  }));
}
