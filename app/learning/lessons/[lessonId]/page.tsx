import { redirect } from "next/navigation";
import { loadLearningLessonSurface } from "../../../../lib/learning/productization";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";
import { buildLearningLessonMetadata } from "../../../../lib/site/learningSeo";
import LessonView from "../../../components/learning/visual/LessonView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const loaded = await loadLearningLessonSurface(lessonId);
  if (loaded.kind !== "ready") {
    return buildLearningLessonMetadata({ lessonId, indexable: false });
  }
  const title =
    loaded.surface.lesson.title.en?.trim() ||
    loaded.surface.lesson.title.ar?.trim() ||
    null;
  const description =
    loaded.surface.course.description.en?.trim() ||
    loaded.surface.course.description.ar?.trim() ||
    null;
  return buildLearningLessonMetadata({
    lessonId,
    title,
    description,
    indexable: true,
  });
}

export default async function LearningLessonPage({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const loaded = await loadLearningLessonSurface(lessonId);
  if (loaded.kind === "auth") {
    redirect(loaded.loginHref);
  }
  if (loaded.kind === "missing") {
    redirect(LEARNING_PUBLIC_ROUTES.catalog);
  }
  return <LessonView model={loaded.surface} />;
}
