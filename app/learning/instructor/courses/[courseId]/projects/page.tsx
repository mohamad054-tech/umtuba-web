import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_PROJECT_QUEUE_STATUSES,
  LEARNING_PROJECT_ROUTES,
  loadProjectQueue,
} from "../../../../../../lib/learning/projectsFoundation";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams?:
 Promise<{ status?: string; q?: string }>;
};

export default async function InstructorProjectQueuePage({
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
      `/login?next=${encodeURIComponent(LEARNING_PROJECT_ROUTES.queue(courseId))}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadProjectQueue(supabase, courseId, {
    status,
    search,
  });
  const items =
    loaded.ok && Array.isArray(loaded.data.items)
      ? (loaded.data.items as Array<Record<string, unknown>>)
      : [];

  return (
    <LearningShell
      title="Project submissions"
      subtitle="Pending and reviewed project work"
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
            {LEARNING_PROJECT_QUEUE_STATUSES.map((value) => (
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
            const submissionId = String(item.submission_id ?? "");
            return (
              <li
                key={submissionId || `item-${index}`}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-white">
                    {String(item.activity_name ?? "Project")}
                  </p>
                  <span className="text-xs uppercase text-white/45">
                    {String(item.status ?? "")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/60">
                  {String(item.learner_label ?? item.learner_user_id ?? "")}
                  {item.submitted_at
                    ? ` · ${String(item.submitted_at)}`
                    : ""}
                </p>
                {submissionId ? (
                  <Link
                    href={LEARNING_PROJECT_ROUTES.review(courseId, submissionId)}
                    className="mt-2 inline-block text-sm font-bold text-sky-300 underline underline-offset-2"
                  >
                    Review
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
