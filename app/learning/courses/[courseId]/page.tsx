import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import CourseOutline from "../../../components/learning/CourseOutline";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadCourseOutline,
} from "../../../../lib/learning/learnerDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  void courseId;
  return { title: `Course · Learning | UMTUBA` };
}

export default async function LearningCoursePage({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.course(courseId))}`
    );
  }

  const supabase = await createClient();
  const outline = await loadCourseOutline(supabase, courseId);
  if (!outline.ok) {
    notFound();
  }

  return (
    <LearningShell
      title={t("learning.course.title")}
      subtitle={outline.data.course.name}
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel={t("learning.course.myLearning")}
    >
      <CourseOutline outline={outline.data} />
    </LearningShell>
  );
}
