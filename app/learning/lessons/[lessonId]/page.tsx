import { redirect } from "next/navigation";
import { loadLearningLessonSurface } from "../../../../lib/learning/productization";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";
import LessonView from "../../../components/learning/visual/LessonView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  void lessonId;
  return { title: `Lesson · Learning | UMTUBA` };
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
