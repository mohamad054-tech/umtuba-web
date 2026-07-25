import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  loadInstructorDashboard,
} from "../../../lib/learning/instructorExperience";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../lib/learning/instructorAuthoring";
import { LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES } from "../../../lib/learning/instructorBootstrap";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.hub)}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorDashboard(supabase);

  return (
    <LearningShell
      title="Instructor workspace"
      subtitle="Dashboard"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learner hub"
    >
      <nav className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub}
          className="font-bold text-white underline underline-offset-2"
        >
          Create catalog
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.reviewQueue}
          className="font-bold text-white underline underline-offset-2"
        >
          Review queue
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
        <>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["Courses", loaded.data.totals.course_count],
                ["Enrollments", loaded.data.totals.enrollment_count],
                ["Pending reviews", loaded.data.totals.pending_reviews],
                ["Completions", loaded.data.totals.completion_count],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <dt className="text-xs uppercase tracking-wide text-white/40">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-bold text-white">{value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-white">Active courses</h2>
            {loaded.data.courses.length === 0 ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-white/55">
                  No manageable courses yet. Create a Space → Program → Course
                  to start authoring.
                </p>
                <Link
                  href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew}
                  className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  Create Space
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {loaded.data.courses.map((course) => (
                  <li
                    key={course.course_id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(
                          course.course_id
                        )}
                        className="text-lg font-bold text-white underline-offset-2 hover:underline"
                      >
                        {course.course_name}
                      </Link>
                      <span className="text-xs uppercase tracking-wide text-white/50">
                        {course.course_status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/55">
                      {course.enrollment_count} enrolled ·{" "}
                      {course.active_learners} active ·{" "}
                      {course.completion_count} completed ·{" "}
                      {course.pending_reviews} pending reviews
                      {course.avg_percent_complete != null
                        ? ` · avg ${course.avg_percent_complete}%`
                        : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <Link
                        href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(
                          course.course_id
                        )}
                        className="underline underline-offset-2"
                      >
                        Learners
                      </Link>
                      <Link
                        href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.completion(
                          course.course_id
                        )}
                        className="underline underline-offset-2"
                      >
                        Completion
                      </Link>
                      <Link
                        href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.manualReview(
                          course.course_id
                        )}
                        className="underline underline-offset-2"
                      >
                        Reviews
                      </Link>
                      <Link
                        href={LEARNING_INSTRUCTOR_ROUTES.course(course.course_id)}
                        className="underline underline-offset-2"
                      >
                        Authoring
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-white">Pending work</h2>
            {loaded.data.pending_work.length === 0 ? (
              <p className="mt-3 text-sm text-white/55">
                No attempts waiting for manual review.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {loaded.data.pending_work.map((item) => (
                  <li
                    key={item.attempt_id}
                    className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70"
                  >
                    <Link
                      href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.manualReviewAttempt(
                        item.course_id,
                        item.attempt_id
                      )}
                      className="font-bold text-white underline underline-offset-2"
                    >
                      {item.learner_label ?? item.learner_user_id.slice(0, 8)}
                    </Link>
                    {" · "}
                    {item.course_name}
                    {" · "}
                    {item.grading_status}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold text-white">
              Recent learner activity
            </h2>
            {loaded.data.recent_activity.length === 0 ? (
              <p className="mt-3 text-sm text-white/55">No recent events.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {loaded.data.recent_activity.map((event, index) => (
                  <li
                    key={`${event.course_id}-${event.created_at}-${index}`}
                    className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70"
                  >
                    <span className="font-bold text-white">
                      {event.learner_label ?? event.learner_user_id.slice(0, 8)}
                    </span>
                    {" · "}
                    {event.event_type}
                    {" · "}
                    {event.course_name}
                    {" · "}
                    <span className="text-white/40">{event.created_at}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </LearningShell>
  );
}
