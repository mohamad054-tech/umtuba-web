import type { MetadataRoute } from "next";
import { ROBOTS_ALLOW_PATHS, ROBOTS_DISALLOW_PATHS } from "../lib/site/indexing";
import { getSiteUrl } from "../lib/site/siteUrl";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", ...ROBOTS_ALLOW_PATHS],
      disallow: [...ROBOTS_DISALLOW_PATHS],
    },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/video-sitemap.xml`],
    host: new URL(origin).host,
  };
}
