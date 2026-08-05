import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../../components/learning/instructor/InstructorActionForm";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES,
  enrollmentLifecycleActionsForStatus,
  loadCourseEnrollmentsForManage,
} from "../../../../../../lib/learning/enrollmentsFoundation";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  LEARNING_INSTRUCTOR_PROGRESS_BUCKETS,
  loadInstructorLearnerProgress,
} from "../../../../../../lib/learning/instructorExperience";
import {
  createCourseEnrollmentAction,
  enrollmentLifecycleAction,
} from "../../../enrollmentActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?:
    | Promise<{ bucket?: string; q?: string }>
    | { bucket?: string; q?: string };
};

const LIFECYCLE_LABELS = {
  activate: "Activate",
  suspend: "Suspend",
  reinstate: "Reinstate",
  cancel: "Cancel",
} as const;

const LIFECYCLE_SUCCESS = {
  activate: "Enrollment activated.",
  suspend: "Enrollment suspended.",
  reinstate: "Enrollment reinstated.",
  cancel: "Enrollment cancelled.",
} as const;

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
  const [loaded, enrollmentsResult] = await Promise.all([
    loadInstructorLearnerProgress(supabase, courseId, {
      bucket,
      search,
    }),
    loadCourseEnrollmentsForManage(supabase, courseId),
  ]);

  const enrollmentByUser = new Map(
    (enrollmentsResult.ok ? enrollmentsResult.data : []).map((row) => [
      row.user_id,
      row,
    ])
  );

  return (
    <LearningShell
      title="Learner progress"
      subtitle="Monitor enrollment and assessment state"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(courseId)}
      backLabel="Course overview"
    >
      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Enroll learner</h2>
        <p className="mt-1 text-sm text-white/55">
          Assign a learner by profile user id. Manager sources only — not
          self-enrollment.
        </p>
        <InstructorActionForm
          action={createCourseEnrollmentAction}
          className="mt-3 space-y-2"
          successMessage="Learner enrolled."
          submitLabel="Enroll learner"
          refreshOnSuccess
        >
          <input type="hidden" name="courseId" value={courseId} />
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">
            Learner user id
            <input
              type="text"
              name="learnerUserId"
              required
              placeholder="UUID"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">
            Source
            <select
              name="source"
              defaultValue="admin_assignment"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            >
              {LEARNING_ENROLLMENT_ASSIGNABLE_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/45">
            Initial status
            <select
              name="status"
              defaultValue="active"
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            >
              <option value="active">active</option>
              <option value="pending">pending</option>
            </select>
          </label>
        </InstructorActionForm>
      </section>

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

      {!enrollmentsResult.ok ? (
        <p className="mt-4 text-sm text-amber-200" role="status">
          Enrollment controls could not be loaded. Progress list may still be
          available.
        </p>
      ) : null}

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
          {loaded.data.learners.map((learner) => {
            const enrollment = enrollmentByUser.get(learner.learner_user_id);
            const status = enrollment?.status ?? learner.enrollment_status;
            const actions = enrollment
              ? enrollmentLifecycleActionsForStatus(enrollment.status)
              : [];
            return (
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
                    {learner.learner_label ??
                      learner.learner_user_id.slice(0, 8)}
                  </Link>
                  <span className="text-xs uppercase tracking-wide text-white/50">
                    {learner.monitor_bucket}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  Enrollment {status} · progress {learner.progress_status}
                  {learner.percent_complete != null
                    ? ` · ${learner.percent_complete}%`
                    : ""}
                </p>
                {actions.length > 0 && enrollment ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <InstructorActionForm
                        key={`${enrollment.enrollment_id}-${action}`}
                        action={enrollmentLifecycleAction}
                        successMessage={LIFECYCLE_SUCCESS[action]}
                        submitLabel={LIFECYCLE_LABELS[action]}
                        refreshOnSuccess
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="enrollmentId"
                          value={enrollment.enrollment_id}
                        />
                        <input type="hidden" name="action" value={action} />
                      </InstructorActionForm>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </LearningShell>
  );
}
