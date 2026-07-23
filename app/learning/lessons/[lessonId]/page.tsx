import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import LessonViewer from "../../../components/learning/LessonViewer";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDelivery,
} from "../../../../lib/learning/learnerDelivery";

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
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.lesson(lessonId))}`
    );
  }

  const supabase = await createClient();
  const delivery = await loadLessonDelivery(supabase, lessonId);
  if (!delivery.ok) {
    notFound();
  }

  return (
    <LearningShell
      title="Lesson"
      subtitle={delivery.data.lesson.name}
      backHref={LEARNING_LEARNER_ROUTES.course(delivery.data.lesson.course_id)}
      backLabel="Course outline"
    >
      <LessonViewer delivery={delivery.data} />
    </LearningShell>
  );
}
