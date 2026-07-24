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

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { activityId } = await Promise.resolve(params);
  void activityId;
  return { title: `Assessment · Learning | UMTUBA` };
}

export default async function LearningAssessmentDeliveryPage({
  params,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
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
        backHref={LEARNING_LEARNER_ROUTES.activity(activityId)}
        backLabel="Back to activity"
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
      backHref={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
      backLabel="Back to activity"
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {view.type} · read-only
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
          This is a read-only preview of the published assessment. Answering,
          timing, and scoring happen only when you start an attempt.
        </p>
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
          href={LEARNING_LEARNER_ROUTES.activity(view.activity_id)}
          className="underline underline-offset-2"
        >
          Return to activity
        </Link>
        {" · "}
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
