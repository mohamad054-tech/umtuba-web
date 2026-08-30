import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_PROJECT_ROUTES,
  loadProjectSubmissionForReview,
} from "../../../../../../../lib/learning/projectsFoundation";
import { reviewProjectSubmissionAction } from "../../../../../firstCourseActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
 Promise<{ courseId: string; submissionId: string }>;
  searchParams?:
 Promise<{ error?: string; reviewed?: string }>;
};

export default async function InstructorProjectReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, submissionId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_PROJECT_ROUTES.review(courseId, submissionId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadProjectSubmissionForReview(supabase, submissionId);
  const review =
    loaded.ok && loaded.data.review && typeof loaded.data.review === "object"
      ? (loaded.data.review as Record<string, unknown>)
      : null;
  const artifactUrl =
    loaded.ok && typeof loaded.data.artifact_url === "string"
      ? loaded.data.artifact_url
      : null;
  const bodyText =
    loaded.ok && typeof loaded.data.body_text === "string"
      ? loaded.data.body_text
      : "";

  return (
    <LearningShell
      title="Review project"
      subtitle={
        loaded.ok ? String(loaded.data.activity_name ?? "") : "Submission"
      }
      backHref={LEARNING_PROJECT_ROUTES.queue(courseId)}
      backLabel="Queue"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.reviewed === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Review saved.
        </p>
      ) : null}

      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-white/70">
            Learner:{" "}
            <span className="font-bold text-white">
              {String(loaded.data.learner_label ?? loaded.data.learner_user_id)}
            </span>
            {" · "}
            {String(loaded.data.status)}
          </p>

          {typeof loaded.data.instructions === "string" &&
          loaded.data.instructions.trim() ? (
            <section>
              <h2 className="text-lg font-bold text-white">Instructions</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                {loaded.data.instructions}
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-bold text-white">Submission</h2>
            {bodyText ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                {bodyText}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/45">No text body.</p>
            )}
            {artifactUrl ? (
              <a
                href={artifactUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-sm font-bold text-sky-300 underline underline-offset-2"
              >
                Open artifact
              </a>
            ) : null}
          </section>

          {review ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
              <p className="font-bold text-white">Existing review</p>
              <p className="mt-1">Status: {String(review.status ?? "")}</p>
              {review.feedback ? (
                <p className="mt-2 whitespace-pre-wrap">
                  {String(review.feedback)}
                </p>
              ) : null}
            </section>
          ) : null}

          <form action={reviewProjectSubmissionAction} className="space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="submissionId" value={submissionId} />
            <label className="block text-sm text-white/70">
              Status
              <select
                name="status"
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                defaultValue="approved"
              >
                <option value="approved">approved</option>
                <option value="needs_changes">needs_changes</option>
              </select>
            </label>
            <label className="block text-sm text-white/70">
              Feedback
              <textarea
                name="feedback"
                rows={6}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                defaultValue={
                  typeof review?.feedback === "string" ? review.feedback : ""
                }
              />
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
            >
              Submit review
            </button>
          </form>
        </div>
      )}
    </LearningShell>
  );
}
