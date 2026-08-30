import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import ManualReviewAnswerForm from "../../../../../../components/learning/ManualReviewAnswerForm";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES,
  loadManualReviewAttempt,
} from "../../../../../../../lib/learning/assessmentManualReview";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
 Promise<{ courseId: string; attemptId: string }>;
  searchParams?:
 Promise<{ error?: string; reviewed?: string }>;
};

export default async function ManualReviewAttemptPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, attemptId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(courseId, attemptId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadManualReviewAttempt(supabase, attemptId);

  if (!loaded.ok) {
    return (
      <LearningShell
        title="Manual review"
        backHref={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId)}
        backLabel="Review queue"
      >
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      </LearningShell>
    );
  }

  const view = loaded.data;
  if (view.course_id !== courseId) {
    redirect(LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId));
  }

  return (
    <LearningShell
      title="Review attempt"
      subtitle={`Status: ${view.grading_status}`}
      backHref={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId)}
      backLabel="Review queue"
    >
      <dl className="mt-4 grid gap-2 text-sm text-white/60 sm:grid-cols-2">
        <div>
          <dt className="text-white/35">Objective</dt>
          <dd>
            {view.objective_points_earned ?? "—"} /{" "}
            {view.objective_points_possible ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/35">Manual earned</dt>
          <dd>{view.manual_points_earned ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-white/35">Pending manual</dt>
          <dd>{view.pending_manual_points ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-white/35">Total</dt>
          <dd>
            {view.total_points_earned ?? "—"} /{" "}
            {view.total_points_possible ?? "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-white/40">
        Objective results cannot be changed here. Answer keys are never shown.
      </p>

      {query.reviewed === "1" ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50"
        >
          Review saved.
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

      <section className="mt-6 space-y-4" aria-label="Subjective questions">
        {view.questions.length === 0 ? (
          <p className="text-sm text-white/55">
            No subjective questions pending or available for correction.
          </p>
        ) : (
          view.questions.map((q) => (
            <ManualReviewAnswerForm
              key={q.question_id}
              courseId={courseId}
              attemptId={attemptId}
              question={q}
            />
          ))
        )}
      </section>

      <p className="mt-8 text-xs text-white/40">
        <Link
          href={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId)}
          className="underline underline-offset-2"
        >
          Back to queue
        </Link>
      </p>
    </LearningShell>
  );
}
