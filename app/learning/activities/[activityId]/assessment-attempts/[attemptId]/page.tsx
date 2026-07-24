import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import AssessmentQuestionPreview from "../../../../../components/learning/AssessmentQuestionPreview";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_ATTEMPT_ROUTES,
  loadAssessmentAttempt,
} from "../../../../../../lib/learning/assessmentAttemptFoundation";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "../../../../../../lib/learning/assessmentDelivery";
import { cancelAssessmentAttemptAction } from "../../../../assessmentAttemptActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | Promise<{ activityId: string; attemptId: string }>
    | { activityId: string; attemptId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { attemptId } = await Promise.resolve(params);
  void attemptId;
  return { title: `Assessment attempt · Learning | UMTUBA` };
}

export default async function AssessmentAttemptFoundationPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId, attemptId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_ATTEMPT_ROUTES.attempt(activityId, attemptId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssessmentAttempt(supabase, attemptId);
  if (!loaded.ok) {
    const lower = loaded.message.toLowerCase();
    if (lower.includes("not found") || lower.includes("unavailable")) {
      notFound();
    }
    return (
      <LearningShell
        title="Assessment attempt"
        subtitle="Session"
        backHref={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activityId)}
        backLabel="Back to assessment"
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
  if (view.activity_id !== activityId) {
    notFound();
  }

  return (
    <LearningShell
      title="Assessment attempt"
      subtitle={`Attempt #${view.attempt_number}`}
      backHref={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(view.activity_id)}
      backLabel="Back to assessment"
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Lifecycle · no answering in this foundation
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Status: {view.status}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
          <div>
            <dt className="text-white/35">Started</dt>
            <dd>{view.started_at}</dd>
          </div>
          <div>
            <dt className="text-white/35">Expires (metadata)</dt>
            <dd>{view.expires_at ?? "No time limit"}</dd>
          </div>
          <div>
            <dt className="text-white/35">Remaining seconds</dt>
            <dd>
              {view.remaining_seconds == null
                ? "—"
                : String(view.remaining_seconds)}
            </dd>
          </div>
          <div>
            <dt className="text-white/35">Questions</dt>
            <dd>{view.question_count}</dd>
          </div>
        </dl>

        {query.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {query.error}
          </p>
        ) : null}

        {view.status === "active" ? (
          <form action={cancelAssessmentAttemptAction} className="mt-6">
            <input type="hidden" name="activityId" value={view.activity_id} />
            <input type="hidden" name="attemptId" value={view.attempt_id} />
            <button
              type="submit"
              className="watch-focus-ring rounded-full border border-white/20 bg-transparent px-5 py-2.5 text-sm font-bold text-white"
            >
              Cancel attempt
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 space-y-4" aria-label="Snapshotted questions">
        <h2 className="text-sm font-bold text-white/70">
          Questions snapshot (read-only)
        </h2>
        {view.questions.map((question, index) => (
          <AssessmentQuestionPreview
            key={question.question_id}
            question={question}
            index={index}
          />
        ))}
      </section>

      <p className="mt-8 text-xs text-white/40">
        <Link
          href={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(view.activity_id)}
          className="underline underline-offset-2"
        >
          Assessment preview
        </Link>
        {" · "}
        <Link
          href={LEARNING_ASSESSMENT_ATTEMPT_ROUTES.activity(view.activity_id)}
          className="underline underline-offset-2"
        >
          Activity gate
        </Link>
      </p>
    </LearningShell>
  );
}
