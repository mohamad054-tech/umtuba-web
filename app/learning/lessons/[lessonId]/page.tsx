import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import LessonViewer from "../../../components/learning/LessonViewer";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDeliveryForAccess,
  resolveComposedLessonLearnerAccess,
} from "../../../../lib/learning/learnerDelivery";
import { loadMyLearningLessonEngine } from "../../../../lib/learning/lessonEngineFoundation";
import { getMyLearningLessonBookmarkState } from "../../../../lib/learning/lessonBookmarksFoundation";
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

  // Engine-first composite access: unlock signals + accessible published set
  // before any protected delivery / progress mutation.
  const engineResult = await loadMyLearningLessonEngine(supabase, lessonId);
  const access = await resolveComposedLessonLearnerAccess(
    supabase,
    lessonId,
    engineResult
  );
  const delivery = await loadLessonDeliveryForAccess(
    supabase,
    lessonId,
    access
  );
  if (!delivery.ok) {
    notFound();
  }

  let initialBookmarkSaved = false;
  if (access.canRenderProtectedContent) {
    const bookmarkState = await getMyLearningLessonBookmarkState(
      supabase,
      lessonId
    );
    if (bookmarkState.ok) {
      initialBookmarkSaved = bookmarkState.data.saved;
    }
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
        access={access}
        initialBookmarkSaved={initialBookmarkSaved}
      />
    </LearningShell>
  );
}
