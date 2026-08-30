import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_ASSIGNMENT_ROUTES,
  loadAssignmentSubmissionForReview,
} from "../../../../../../../lib/learning/assignmentsCoursework";
import { reviewAssignmentSubmissionAction } from "../../../../../assignmentActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
 Promise<{ courseId: string; submissionId: string }>;
  searchParams?:
 Promise<{ error?: string; reviewed?: string }>;
};

export default async function InstructorAssignmentReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, submissionId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.review(courseId, submissionId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssignmentSubmissionForReview(
    supabase,
    submissionId
  );
  const artifacts =
    loaded.ok && Array.isArray(loaded.data.artifacts)
      ? (loaded.data.artifacts as Array<Record<string, unknown>>)
      : [];
  const review =
    loaded.ok && loaded.data.review && typeof loaded.data.review === "object"
      ? (loaded.data.review as Record<string, unknown>)
      : null;

  return (
    <LearningShell
      title="Review assignment"
      subtitle={
        loaded.ok ? String(loaded.data.activity_name ?? "") : "Submission"
      }
      backHref={LEARNING_ASSIGNMENT_ROUTES.queue(courseId)}
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
            {loaded.data.is_late === true ? " · late" : ""}
          </p>

          <section>
            <h2 className="text-lg font-bold text-white">Artifacts</h2>
            <ul className="mt-3 space-y-3">
              {artifacts.map((artifact) => (
                <li
                  key={String(artifact.id)}
                  className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70"
                >
                  <p className="uppercase tracking-wide text-white/40">
                    {String(artifact.kind)}
                  </p>
                  {artifact.kind === "text" ? (
                    <p className="mt-2 whitespace-pre-wrap">
                      {String(artifact.text_body ?? "")}
                    </p>
                  ) : null}
                  {artifact.kind === "link" ? (
                    <a
                      href={String(artifact.link_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block underline underline-offset-2"
                    >
                      {String(artifact.link_url)}
                    </a>
                  ) : null}
                  {artifact.kind === "file" ? (
                    <p className="mt-2">
                      {String(artifact.file_name)} ·{" "}
                      {String(artifact.storage_path)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <form
            action={reviewAssignmentSubmissionAction}
            className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="submissionId" value={submissionId} />
            <label className="block text-sm text-white/70">
              Points
              <input
                name="pointsEarned"
                type="number"
                min={0}
                step="0.01"
                required
                defaultValue={
                  review?.points_earned != null
                    ? String(review.points_earned)
                    : ""
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/70">
              Feedback (optional)
              <textarea
                name="feedback"
                rows={4}
                defaultValue={
                  review?.learner_feedback
                    ? String(review.learner_feedback)
                    : ""
                }
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
              />
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
            >
              Save review
            </button>
          </form>
        </div>
      )}
    </LearningShell>
  );
}
