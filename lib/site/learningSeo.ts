import type { Metadata } from "next";
import { BRAND } from "./brand";
import { buildPageMetadata } from "./metadata";

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
