import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  LEARNING_INSTRUCTOR_PROGRESS_BUCKETS,
  loadInstructorLearnerProgress,
} from "../../../../../../lib/learning/instructorExperience";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?:
    | Promise<{ bucket?: string; q?: string }>
    | { bucket?: string; q?: string };
};

export default async function InstructorLearnersPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const bucket = query.bucket?.trim() || null;
  const search = query.q?.trim() || null;

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorLearnerProgress(supabase, courseId, {
    bucket,
    search,
  });

  return (
    <LearningShell
      title="Learner progress"
      subtitle="Monitor enrollment and assessment state"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(courseId)}
      backLabel="Course overview"
    >
      <form
        method="get"
        className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2"
      >
        <label className="text-sm text-white/70">
          Status
          <select
            name="bucket"
            defaultValue={bucket ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          >
            <option value="">All</option>
            {LEARNING_INSTRUCTOR_PROGRESS_BUCKETS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/70">
          Search
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Learner name or id"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            Apply filters
          </button>
        </div>
      </form>

      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : loaded.data.learners.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No learners match.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {loaded.data.learners.map((learner) => (
            <li
              key={learner.learner_user_id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learnerDetail(
                    courseId,
                    learner.learner_user_id
                  )}
                  className="text-base font-bold text-white underline underline-offset-2"
                >
                  {learner.learner_label ?? learner.learner_user_id.slice(0, 8)}
                </Link>
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {learner.monitor_bucket}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/55">
                Enrollment {learner.enrollment_status} · progress{" "}
                {learner.progress_status}
                {learner.percent_complete != null
                  ? ` · ${learner.percent_complete}%`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </LearningShell>
  );
}
