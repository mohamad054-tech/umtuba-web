import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import LessonViewer from "../../../components/learning/LessonViewer";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDelivery,
} from "../../../../lib/learning/learnerDelivery";
import { loadMyLearningLessonEngine } from "../../../../lib/learning/lessonEngineFoundation";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?:
    | Promise<{ error?: string; completed?: string; unlocked?: string }>
    | { error?: string; completed?: string; unlocked?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  void lessonId;
  return { title: `Lesson · Learning | UMTUBA` };
}

export default async function LearningLessonPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    // Guests: send to public catalog (not login with lesson deep-link).
    // Do NOT load content blocks for guests.
    redirect(
      `${LEARNING_PUBLIC_ROUTES.catalog}?lesson=${encodeURIComponent(lessonId)}`
    );
  }

  const supabase = await createClient();
  const [delivery, engineResult] = await Promise.all([
    loadLessonDelivery(supabase, lessonId),
    loadMyLearningLessonEngine(supabase, lessonId),
  ]);
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
      {query.completed === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Lesson marked complete.
        </p>
      ) : null}

      {query.unlocked === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Lesson unlocked with UM Points.
        </p>
      ) : null}

      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error}
        </p>
      ) : null}

      <LessonViewer
        delivery={delivery.data}
        engine={engineResult.ok ? engineResult.data : null}
      />
    </LearningShell>
  );
}
