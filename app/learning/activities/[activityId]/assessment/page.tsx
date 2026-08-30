import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import AssessmentQuestionPreview from "../../../../components/learning/AssessmentQuestionPreview";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_DELIVERY_ROUTES,
  loadAssessmentDelivery,
} from "../../../../../lib/learning/assessmentDelivery";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../../../lib/learning/lessonUnlockFoundation";
import { startAssessmentAttemptAction } from "../../../assessmentAttemptActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }>;
  searchParams?:
 Promise<{ error?: string; cancelled?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { activityId } = await Promise.resolve(params);
  void activityId;
  return { title: `Assessment · Learning | UMTUBA` };
}

export default async function LearningAssessmentDeliveryPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssessmentDelivery(supabase, activityId);
  if (loaded.ok) {
    const unlock = await requireLessonUnlockedForLearner(
      supabase,
      loaded.data.lesson_id
    );
    if (!unlock.ok) {
      redirect(
        `${LEARNING_LEARNER_ROUTES.lesson(loaded.data.lesson_id)}?error=${encodeURIComponent(unlock.message)}`
      );
    }
  }
  if (!loaded.ok) {
    const lower = loaded.message.toLowerCase();
    if (
      lower.includes("not found") ||
      lower.includes("unavailable") ||
      lower.includes("not available")
    ) {
      notFound();
    }
    return (
      <LearningShell
        title="Assessment"
        subtitle="Read-only preview"
        backHref={LEARNING_LEARNER_ROUTES.hub}
        backLabel="Learning"
      >
        <div
          className="mt-6 rounded-[28px] border border-rose-400/25 bg-rose-500/10 p-5 text-sm text-rose-100"
          role="alert"
        >
          {loaded.message}
        </div>
      </LearningShell>
    );
  }

  const view = loaded.data;

  return (
    <LearningShell
      title="Assessment"
      subtitle={view.name}
      backHref={LEARNING_LEARNER_ROUTES.lesson(view.lesson_id)}
      backLabel="Back to lesson"
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {view.type} · assessment
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{view.name}</h1>
        {view.description ? (
          <p className="mt-2 text-sm text-white/50">{view.description}</p>
        ) : null}
        <p className="mt-3 text-xs text-white/40">
          {view.hints.is_required ? "Required" : "Optional"}
          {view.hints.max_attempts != null
            ? ` · max ${view.hints.max_attempts} attempts`
            : ""}
          {view.hints.time_limit_seconds != null
            ? ` · ${view.hints.time_limit_seconds}s time limit`
            : ""}
          {` · ${view.question_count} question${
            view.question_count === 1 ? "" : "s"
          }`}
        </p>
        <p className="mt-4 text-sm text-white/55">
          Review the published questions below, then start or resume an attempt
          to answer, submit, and view graded results when your course policy
          releases them. Answer keys stay hidden on this page.
        </p>

        {query.cancelled ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            Attempt cancelled.
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

        {view.question_count > 0 ? (
          <form action={startAssessmentAttemptAction} className="mt-6">
            <input type="hidden" name="activityId" value={view.activity_id} />
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Start assessment attempt
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 space-y-4" aria-label="Published questions">
        {view.questions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-white/55">
            No published questions are available for this assessment yet.
          </p>
        ) : (
          view.questions.map((question, index) => (
            <AssessmentQuestionPreview
              key={question.question_id}
              question={question}
              index={index}
            />
          ))
        )}
      </section>

      <p className="mt-8 text-xs text-white/40">
        <Link
          href={LEARNING_LEARNER_ROUTES.lesson(view.lesson_id)}
          className="underline underline-offset-2"
        >
          Back to lesson
        </Link>
      </p>
    </LearningShell>
  );
}
