import type { Metadata } from "next";
import {
  DEMO_COURSES,
  demoCourse,
} from "../learning/visualDemo/world";
import { BRAND } from "./brand";
import { buildPageMetadata } from "./metadata";

const SAMPLE_LEARNING_SLUGS = new Set(
  [
    "ja-01",
    "ai-foundations-for-builders",
    ...DEMO_COURSES.map((course) => course.slug),
  ].map((slug) => slug.toLowerCase())
);

/** Demo / sample catalog identities must stay noindex and off every sitemap. */
export function isDemoLearningCatalogSlug(slug: string): boolean {
  const value = slug.trim();
  if (!value) return false;
  const normalized = value.toLowerCase();
  if (SAMPLE_LEARNING_SLUGS.has(normalized)) return true;
  if (/^ja-\d+$/.test(normalized)) return true;
  return Boolean(demoCourse(value) || demoCourse(normalized));
}

export function learningLessonPath(lessonId: string): string {
  const id = lessonId.trim();
  return `/learning/lessons/${id}`;
}

export function buildLearningLessonMetadata(input: {
  lessonId: string;
  title?: string | null;
  description?: string | null;
  indexable: boolean;
}): Metadata {
  const title = input.title?.trim();
  const description = input.description?.trim();
  return buildPageMetadata({
    title: input.indexable && title ? title : "Lesson",
    description:
      input.indexable && description
        ? description
        : `A ${BRAND.name} Learning lesson.`,
    path: learningLessonPath(input.lessonId),
    index: input.indexable ? "index" : "noindex",
    hreflang: input.indexable,
  });
}
