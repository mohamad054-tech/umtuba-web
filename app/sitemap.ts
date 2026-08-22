import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";
import { listPublicCatalogCourses } from "../lib/learning/publicCatalog";
import { SITEMAP_STATIC_ROUTES } from "../lib/site/indexing";
import {
  publicCourseSitemapPath,
  publicLifePostSitemapPath,
  publicProductSitemapPath,
  publicStorefrontSitemapPath,
  SITEMAP_DYNAMIC_LIMIT,
} from "../lib/site/publicSitemap";
import { absoluteUrl } from "../lib/site/siteUrl";
import { listPublicCatalog } from "../lib/store/catalogQueries";
import { createClient } from "../lib/supabase/server";
import { getLifePostsServer } from "../lib/supabase/videoPostsServer";

function entry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

async function collectDynamicPaths(): Promise<string[]> {
  const paths = new Set<string>();
  try {
    const supabase = await createClient();
    const [courses, catalog] = await Promise.all([
      listPublicCatalogCourses(supabase),
      listPublicCatalog(supabase, { limit: SITEMAP_DYNAMIC_LIMIT }),
    ]);

    for (const course of courses.slice(0, SITEMAP_DYNAMIC_LIMIT)) {
      const path = publicCourseSitemapPath(course.slug);
      if (path) paths.add(path);
    }

    for (const item of catalog.items.slice(0, SITEMAP_DYNAMIC_LIMIT)) {
      const storePath = publicStorefrontSitemapPath(item.store.slug);
      if (storePath) paths.add(storePath);
      const productPath = publicProductSitemapPath(
        item.store.slug,
        item.product.slug
      );
      if (productPath) paths.add(productPath);
    }
  } catch {
    // Public sitemap must still emit static canonicals if catalog reads fail.
  }

  try {
    const life = await getLifePostsServer();
    if (life.ok) {
      for (const post of life.posts.slice(0, SITEMAP_DYNAMIC_LIMIT)) {
        const path = publicLifePostSitemapPath(post.id);
        if (path) paths.add(path);
      }
    }
  } catch {
    // Life posts are optional extras — static /life remains.
  }

  return [...paths];
}

/**
 * Canonical indexable URLs only.
 *
 * Deferred: public profiles (`/profile/[username]`) — no bounded privacy-safe
 * username query is wired. Do not scrape profiles.
 *
 * Excluded: auth/account, gated labs, demo/sandbox, cart/checkout, query
 * duplicates, and non-canonical invite codes.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = SITEMAP_STATIC_ROUTES.map((path) =>
    entry(
      path,
      lastModified,
      path === "/" ? "weekly" : "daily",
      path === "/" ? 1 : 0.8
    )
  );
  const dynamic = await collectDynamicPaths();
  return [
    ...staticEntries,
    ...dynamic.map((path) =>
      entry(path, lastModified, "daily", path.startsWith("/life?") ? 0.6 : 0.7)
    ),
  ];
}
