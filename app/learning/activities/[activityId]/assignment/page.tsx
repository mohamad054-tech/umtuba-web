import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_ASSIGNMENT_ROUTES,
  loadMyAssignment,
} from "../../../../../lib/learning/assignmentsCoursework";
import {
  saveAndSubmitAssignmentAction,
  startAssignmentSubmissionAction,
} from "../../../assignmentActions";
import AssignmentFileUploadField from "../../../../components/learning/AssignmentFileUploadField";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
  searchParams?:
    | Promise<{ error?: string; submitted?: string }>
    | { error?: string; submitted?: string };
};

export default async function LearnerAssignmentPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.learner(activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadMyAssignment(supabase, activityId);
  const resources =
    loaded.ok && Array.isArray(loaded.data.resources)
      ? (loaded.data.resources as Array<{ label: string; url: string }>)
      : [];
  const result =
    loaded.ok && loaded.data.result && typeof loaded.data.result === "object"
      ? (loaded.data.result as Record<string, unknown>)
      : null;

  return (
    <LearningShell
      title={
        loaded.ok
          ? String(loaded.data.activity_name ?? "Assignment")
          : "Assignment"
      }
      subtitle="Coursework submission"
      backHref="/learning"
      backLabel="Learning"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}
      {query.submitted === "1" ? (
        <p role="status" className="mt-4 text-sm text-emerald-100">
          Submission received.
        </p>
      ) : null}

      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm text-white/70">
            <div>
              <dt className="text-white/40">Status</dt>
              <dd className="font-bold text-white">
                {String(loaded.data.status)}
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Due</dt>
              <dd>{loaded.data.due_at ? String(loaded.data.due_at) : "—"}</dd>
            </div>
            <div>
              <dt className="text-white/40">Remaining submissions</dt>
              <dd>
                {loaded.data.remaining_submissions == null
                  ? "Unlimited"
                  : String(loaded.data.remaining_submissions)}
              </dd>
            </div>
          </dl>

          <section>
            <h2 className="text-lg font-bold text-white">Instructions</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
              {String(loaded.data.instructions || "No instructions yet.")}
            </p>
          </section>

          {resources.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-white">Resources</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {resources.map((r, i) => (
                  <li key={`${r.url}-${i}`}>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {r.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {result ? (
            <section className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <h2 className="text-lg font-bold text-white">Result</h2>
              <p className="mt-2 text-sm text-white/80">
                Points: {String(result.points_earned)}
                {result.points_possible != null
                  ? ` / ${String(result.points_possible)}`
                  : ""}
                {result.passed === true
                  ? " · passed"
                  : result.passed === false
                    ? " · failed"
                    : ""}
              </p>
              {result.learner_feedback ? (
                <p className="mt-2 text-sm text-white/70">
                  {String(result.learner_feedback)}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-white/40">
                Reviewed: {String(result.reviewed_at ?? "—")}
              </p>
            </section>
          ) : null}

          {loaded.data.status === "not_started" ||
          loaded.data.status === "draft" ||
          (loaded.data.remaining_submissions == null ||
            Number(loaded.data.remaining_submissions) > 0) ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-lg font-bold text-white">Submit work</h2>
              {!loaded.data.draft_submission_id &&
              loaded.data.status !== "draft" ? (
                <form action={startAssignmentSubmissionAction} className="mt-3">
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
                  action={saveAndSubmitAssignmentAction}
                  className="mt-3 space-y-3"
                >
                  <input type="hidden" name="activityId" value={activityId} />
                  <input
                    type="hidden"
                    name="submissionId"
                    value={String(loaded.data.draft_submission_id ?? "")}
                  />
                  <label className="block text-sm text-white/70">
                    Text
                    <textarea
                      name="textBody"
                      rows={6}
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    />
                  </label>
                  <label className="block text-sm text-white/70">
                    Link
                    <input
                      name="linkUrl"
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                    />
                  </label>
                  <AssignmentFileUploadField
                    activityId={activityId}
                    userId={user.id}
                  />
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
            <Link href="/learning" className="underline underline-offset-2">
              Back to learning
            </Link>
          </p>
        </div>
      )}
    </LearningShell>
  );
}
