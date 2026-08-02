import Link from "next/link";
import { redirect } from "next/navigation";
import AiTutorLearnerPanel from "../../../../components/learning/AiTutorLearnerPanel";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { LEARNING_AI_TUTOR_ROUTES } from "../../../../../lib/learning/aiTutorFoundation";
import {
  loadAiTutorLearnerSession,
  parseWrongAnswerContext,
} from "../../../../../lib/learning/aiTutorLearnerUi";
import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDelivery,
} from "../../../../../lib/learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../../../lib/learning/lessonUnlockFoundation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?:
    | Promise<{
        error?: string;
        attemptId?: string;
        questionId?: string;
      }>
    | {
        error?: string;
        attemptId?: string;
        questionId?: string;
      };
};

export default async function AiTutorPage({ params, searchParams }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_AI_TUTOR_ROUTES.lesson(lessonId))}`
    );
  }

  const supabase = await createClient();
  const unlock = await requireLessonUnlockedForLearner(supabase, lessonId);
  if (!unlock.ok) {
    redirect(
      `${LEARNING_LEARNER_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(unlock.message)}`
    );
  }

  const delivery = await loadLessonDelivery(supabase, lessonId);
  if (!delivery.ok) {
    redirect(LEARNING_LEARNER_ROUTES.hub);
  }

  const courseId = delivery.data.lesson.course_id;
  const lessonTitle =
    typeof delivery.data.lesson.name === "string"
      ? delivery.data.lesson.name
      : null;

  const session = await loadAiTutorLearnerSession(
    { supabase },
    { courseId, lessonId, title: "AI Tutor" }
  );

  const wrongAnswer = parseWrongAnswerContext({
    attemptId: query.attemptId,
    questionId: query.questionId,
  });

  return (
    <LearningShell
      title="AI Tutor"
      subtitle="Lesson-bound tutor · official backend"
      backHref={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
      backLabel="Back to lesson"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}

      {!session.ok ? (
        <div
          role="alert"
          className="mt-6 space-y-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-50"
        >
          <p>{session.message}</p>
          <p className="text-xs text-rose-100/70">
            {session.code === "access_denied"
              ? "Access to this tutor thread was denied."
              : "The tutor session could not be opened for this lesson."}
          </p>
          <Link
            href={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
            className="watch-focus-ring inline-block text-sm font-bold text-white underline"
          >
            Return to lesson
          </Link>
          <Link
            href={LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)}
            className="watch-focus-ring ml-4 inline-block text-sm font-bold text-white/70 underline"
          >
            Retry
          </Link>
        </div>
      ) : (
        <AiTutorLearnerPanel
          lessonId={lessonId}
          courseId={courseId}
          threadId={session.threadId}
          initialMessages={session.messages}
          wrongAnswer={wrongAnswer}
          lessonTitle={lessonTitle}
        />
      )}
    </LearningShell>
  );
}
