import type { MetadataRoute } from "next";
import { ROBOTS_DISALLOW_PATHS } from "../lib/site/indexing";
import { getSiteUrl } from "../lib/site/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/video-sitemap.xml`],
    host: new URL(origin).host,
  };
}
