import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  LEARNING_INSTRUCTOR_REVIEW_STATUSES,
  loadInstructorDashboard,
  loadInstructorReviewQueue,
} from "../../../../lib/learning/instructorExperience";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ course?: string; status?: string; q?: string }>
    | { course?: string; status?: string; q?: string };
};

export default async function InstructorReviewQueuePage({
  searchParams,
}: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.reviewQueue
      )}`
    );
  }

  const courseId = query.course?.trim() || null;
  const status = query.status?.trim() || "pending";
  const search = query.q?.trim() || null;

  const supabase = await createClient();
  const [queue, dashboard] = await Promise.all([
    loadInstructorReviewQueue(supabase, { courseId, status, search }),
    loadInstructorDashboard(supabase),
  ]);

  const courses = dashboard.ok ? dashboard.data.courses : [];

  return (
    <LearningShell
      title="Manual review queue"
      subtitle="Pending and filtered review work"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.hub}
      backLabel="Dashboard"
    >
      <form
        method="get"
        className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3"
      >
        <label className="text-sm text-white/70">
          Course
          <select
            name="course"
            defaultValue={courseId ?? ""}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-white/70">
          Status
          <select
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          >
            {LEARNING_INSTRUCTOR_REVIEW_STATUSES.map((value) => (
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
            placeholder="Learner or attempt"
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            Apply filters
          </button>
        </div>
      </form>

      {!queue.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {queue.message}
        </p>
      ) : queue.data.items.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">
          No review items match these filters.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {queue.data.items.map((item) => (
            <li
              key={item.attempt_id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-sm text-white/70">
                <span className="font-bold text-white">
                  {item.learner_label ?? item.learner_user_id.slice(0, 8)}
                </span>
                {" · "}
                {item.course_name}
                {" · "}
                {item.grading_status}
                {" · pending "}
                {item.pending_question_count}
              </p>
              <p className="mt-1 text-xs text-white/40">
                Submitted: {item.submitted_at ?? "—"}
              </p>
              <Link
                href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.manualReviewAttempt(
                  item.course_id,
                  item.attempt_id
                )}
                className="mt-3 inline-block text-sm font-bold text-white underline underline-offset-2"
              >
                Open review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </LearningShell>
  );
}
