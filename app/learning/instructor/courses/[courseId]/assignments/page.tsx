import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_ASSIGNMENT_QUEUE_STATUSES,
  LEARNING_ASSIGNMENT_ROUTES,
  loadAssignmentQueue,
} from "../../../../../../lib/learning/assignmentsCoursework";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?:
 Promise<{ status?: string; q?: string }>;
};

export default async function InstructorAssignmentQueuePage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const status = query.status?.trim() || "pending";
  const search = query.q?.trim() || null;

  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSIGNMENT_ROUTES.queue(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssignmentQueue(supabase, courseId, {
    status,
    search,
  });
  const items =
    loaded.ok && Array.isArray(loaded.data.items)
      ? (loaded.data.items as Array<Record<string, unknown>>)
      : [];

  return (
    <LearningShell
      title="Assignment submissions"
      subtitle="Pending, reviewed, overdue, and late work"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <form
        method="get"
        className="mt-6 grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2"
      >
        <label className="text-sm text-white/70">
          Status
          <select
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
          >
            {LEARNING_ASSIGNMENT_QUEUE_STATUSES.map((value) => (
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
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">No items match.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item, index) => {
            const submissionId =
              typeof item.submission_id === "string" ? item.submission_id : null;
            const key = submissionId ?? `row-${index}`;
            return (
              <li
                key={key}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"
              >
                <p>
                  <span className="font-bold text-white">
                    {String(item.learner_label ?? item.learner_user_id)}
                  </span>
                  {" · "}
                  {String(item.activity_name)}
                  {" · "}
                  {String(item.status)}
                  {item.is_late === true ? " · late" : ""}
                </p>
                {submissionId ? (
                  <Link
                    href={LEARNING_ASSIGNMENT_ROUTES.review(
                      courseId,
                      submissionId
                    )}
                    className="mt-2 inline-block font-bold text-white underline underline-offset-2"
                  >
                    Open review
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
