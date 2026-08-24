import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getLearningViewerUser } from "../learningViewer";
import {
  listPublicCatalogCourses,
  loadPublicCourseBySlug,
} from "../publicCatalog";
import { createLearningPublicClient } from "../publicSupabase";

/** Request-scoped. Dedupes metadata + page + home/course loaders. */
export const getCachedLearningViewer = cache(async () => {
  return getLearningViewerUser();
});

const loadRevalidatedPublicCatalog = unstable_cache(
  async () => {
    const supabase = createLearningPublicClient();
    return listPublicCatalogCourses(supabase);
  },
  ["learning-public-catalog-v1"],
  { revalidate: 30 }
);

const loadRevalidatedPublicCourseBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createLearningPublicClient();
    return loadPublicCourseBySlug(supabase, slug);
  },
  ["learning-public-course-by-slug-v1"],
  { revalidate: 30 }
);

export const getCachedPublicCatalog = cache(async () => {
  return loadRevalidatedPublicCatalog();
});

export const getCachedPublicCourseBySlug = cache(async (slug: string) => {
  return loadRevalidatedPublicCourseBySlug(slug);
});
