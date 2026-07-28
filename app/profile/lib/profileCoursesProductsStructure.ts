/**
 * Courses / Products Panel Structure V1 (Creator Space Experience §11 + §12).
 * Readiness / presentation only — no catalog domain, LMS embed, or checkout.
 */

import type {
  ProfileCoursePreview,
  ProfileProductPreview,
} from "../types";

function hasId(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

/** Stable course list for panel + tab counts (dedupe by id). */
export function normalizeProfileCourses(
  courses: readonly ProfileCoursePreview[] | null | undefined
): ProfileCoursePreview[] {
  if (!courses?.length) {
    return [];
  }
  const seen = new Set<string>();
  const out: ProfileCoursePreview[] = [];
  for (const course of courses) {
    const id = course.id?.trim();
    if (!id || seen.has(id) || !hasId(course.title) || !hasId(course.href)) {
      continue;
    }
    seen.add(id);
    out.push({
      ...course,
      id,
      title: course.title.trim(),
      levelLabel: course.levelLabel?.trim() || "Course",
      href: course.href.trim(),
      coverGradient:
        course.coverGradient?.trim() ||
        "from-[#101828] via-[#0c1420] to-[#081018]",
      coverUrl: course.coverUrl?.trim() || null,
      lessonCountLabel: course.lessonCountLabel?.trim() || undefined,
    });
  }
  return out;
}

/** Stable product list for panel + tab counts (dedupe by id). */
export function normalizeProfileProducts(
  products: readonly ProfileProductPreview[] | null | undefined
): ProfileProductPreview[] {
  if (!products?.length) {
    return [];
  }
  const seen = new Set<string>();
  const out: ProfileProductPreview[] = [];
  for (const product of products) {
    const id = product.id?.trim();
    if (!id || seen.has(id) || !hasId(product.title) || !hasId(product.href)) {
      continue;
    }
    seen.add(id);
    out.push({
      ...product,
      id,
      title: product.title.trim(),
      priceLabel: product.priceLabel?.trim() || "—",
      href: product.href.trim(),
      coverGradient:
        product.coverGradient?.trim() ||
        "from-[#1a1420] via-[#101018] to-[#081018]",
      coverUrl: product.coverUrl?.trim() || null,
      storeBadge: product.storeBadge?.trim() || undefined,
    });
  }
  return out;
}

export function countProfileCourses(
  courses: readonly ProfileCoursePreview[] | null | undefined
): number {
  return normalizeProfileCourses(courses).length;
}

export function countProfileProducts(
  products: readonly ProfileProductPreview[] | null | undefined
): number {
  return normalizeProfileProducts(products).length;
}
