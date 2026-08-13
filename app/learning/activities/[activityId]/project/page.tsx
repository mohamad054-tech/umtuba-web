import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_PROJECT_ROUTES,
  loadMyProject,
} from "../../../../../lib/learning/projectsFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  loadPublishedActivityGate,
} from "../../../../../lib/learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../../../lib/learning/lessonUnlockFoundation";
import {
  saveAndSubmitProjectAction,
  startProjectSubmissionAction,
} from "../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
  searchParams?:
    | Promise<{ error?: string; submitted?: string }>
    | { error?: string; submitted?: string };
};

export default async function LearnerProjectPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_PROJECT_ROUTES.learner(activityId))}`
    );
  }

  const supabase = await createClient();
  const gate = await loadPublishedActivityGate(supabase, activityId);
  if (gate.ok) {
    const unlock = await requireLessonUnlockedForLearner(
      supabase,
      gate.data.lesson_id
    );
    if (!unlock.ok) {
      redirect(
        `${LEARNING_LEARNER_ROUTES.lesson(gate.data.lesson_id)}?error=${encodeURIComponent(unlock.message)}`
      );
    }
  }
  const loaded = await loadMyProject(supabase, activityId);
  const submission =
    loaded.ok && loaded.data.submission && typeof loaded.data.submission === "object"
      ? (loaded.data.submission as Record<string, unknown>)
      : null;
  const review =
    loaded.ok && loaded.data.review && typeof loaded.data.review === "object"
      ? (loaded.data.review as Record<string, unknown>)
      : null;
  const draftId =
    submission && submission.status === "draft" ? String(submission.id) : "";

  return (
    <LearningShell
      title={
        loaded.ok
          ? String(loaded.data.activity_name ?? "Project")
          : "Project"
      }
      subtitle="Project submission"
      layout="focus"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learning"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.submitted === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Project submitted.
        </p>
      ) : null}

      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="text-lg font-bold text-white">Instructions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
              {String(loaded.data.instructions || "No instructions yet.")}
            </p>
          </section>

          {submission ? (
            <p className="text-sm text-white/60">
              Status: {String(submission.status ?? "—")}
            </p>
          ) : null}

          {review ? (
            <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <h2 className="text-lg font-bold text-white">Review</h2>
              <p className="mt-2 text-sm text-white/80">
                {String(review.status ?? "")}
              </p>
              {review.feedback ? (
                <p className="mt-2 text-sm text-white/70">
                  {String(review.feedback)}
                </p>
              ) : null}
            </section>
          ) : null}

          {!submission || submission.status === "draft" ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-lg font-bold text-white">Submit work</h2>
              {!draftId ? (
                <form action={startProjectSubmissionAction} className="mt-3">
                  <input type="hidden" name="activityId" value={activityId} />
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                  >
                    Start submission
                  </button>
                </form>
              ) : (
                <form
                  action={saveAndSubmitProjectAction}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="activityId" value={activityId} />
                  <input type="hidden" name="submissionId" value={draftId} />
                  <label className="block text-sm text-white/70">
                    Text
                    <textarea
                      name="bodyText"
                      rows={6}
                      defaultValue={String(submission?.body_text ?? "")}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm text-white/70">
                    Artifact URL
                    <input
                      name="artifactUrl"
                      defaultValue={String(submission?.artifact_url ?? "")}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    />
                  </label>
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                  >
                    Save &amp; submit
                  </button>
                </form>
              )}
            </section>
          ) : null}

          <p className="text-xs text-white/40">
            <Link
              href={LEARNING_LEARNER_ROUTES.hub}
              className="underline underline-offset-2"
            >
              Back to Learning
            </Link>
          </p>
        </div>
      )}
    </LearningShell>
  );
}
