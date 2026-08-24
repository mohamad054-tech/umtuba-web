import { notFound } from "next/navigation";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { loadPublicCourseBySlug } from "../../../../lib/learning/publicCatalog";
import { buildPageMetadata } from "../../../../lib/site/metadata";
import { BRAND } from "../../../../lib/site/brand";
import {
  loadLearningCourseSurface,
  shouldPreferLiveLearningData,
} from "../../../../lib/learning/productization";
import CourseDetailView from "../../../components/learning/visual/CourseDetailView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseSlug: string }> | { courseSlug: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await resolveRequestLocale();
  const { courseSlug } = await Promise.resolve(params);
  if (!shouldPreferLiveLearningData()) {
    return buildPageMetadata({
      title: "Course",
      description: `A ${BRAND.name} Learning course.`,
      path: `/learning/catalog/${courseSlug}`,
      index: "noindex",
      locale,
    });
  }
  const supabase = await createClient();
  const landing = await loadPublicCourseBySlug(supabase, courseSlug);
  const path = `/learning/catalog/${courseSlug}`;
  if (!landing) {
    return buildPageMetadata({
      title: "Course",
      description: `A ${BRAND.name} Learning course.`,
      path,
      index: "noindex",
      locale,
    });
  }
  return buildPageMetadata({
    title: landing.course.name,
    description:
      landing.course.description?.trim() ||
      `A public course on ${BRAND.name} Learning.`,
    path,
    index: "index",
    locale,
    imageUrl: landing.course.cover_url ?? landing.course.thumbnail_url,
    imageAlt: landing.course.name,
  });
}

export default async function LearningPublicCourseLandingPage({
  params,
}: PageProps) {
  const { courseSlug } = await Promise.resolve(params);
  const model = await loadLearningCourseSurface(courseSlug);
  if (!model) {
    notFound();
  }
  return <CourseDetailView model={model} />;
}
