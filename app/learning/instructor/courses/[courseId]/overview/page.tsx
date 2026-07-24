import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  loadInstructorCourseOverview,
} from "../../../../../../lib/learning/instructorExperience";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export default async function InstructorCourseOverviewPage({
  params,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorCourseOverview(supabase, courseId);

  return (
    <LearningShell
      title={loaded.ok ? loaded.data.course_name : "Course overview"}
      subtitle="Course operations overview"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.hub}
      backLabel="Dashboard"
    >
      <nav className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(courseId)}
          className="underline underline-offset-2"
        >
          Learners
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.completion(courseId)}
          className="underline underline-offset-2"
        >
          Completion
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.manualReview(courseId)}
          className="underline underline-offset-2"
        >
          Reviews
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
          className="underline underline-offset-2"
        >
          Authoring
        </Link>
      </nav>

      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["Enrollments", loaded.data.enrollment_count],
              ["Active learners", loaded.data.active_learners],
              ["Completions", loaded.data.completion_count],
              ["Pending reviews", loaded.data.pending_reviews],
              [
                "Average completion",
                loaded.data.avg_percent_complete != null
                  ? `${loaded.data.avg_percent_complete}%`
                  : "—",
              ],
              ["Certificates", loaded.data.certificate_count],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <dt className="text-xs uppercase tracking-wide text-white/40">
                {label}
              </dt>
              <dd className="mt-1 text-xl font-bold text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </LearningShell>
  );
}
