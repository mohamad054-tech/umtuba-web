import type { MetadataRoute } from "next";
import { collectRobotsDisallowPaths } from "../lib/platform/navigation";
import { getSiteUrl } from "../lib/site/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl();
  const disallow = collectRobotsDisallowPaths();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...disallow],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: new URL(origin).host,
  };
}
