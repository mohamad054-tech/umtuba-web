import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  loadInstructorLearnerDetail,
} from "../../../../../../../lib/learning/instructorExperience";
import { LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES } from "../../../../../../../lib/learning/assessmentManualReview";

export const dynamic = "force-dynamic";

type PageProps = {
  params:
    | Promise<{ courseId: string; learnerUserId: string }>
    | { courseId: string; learnerUserId: string };
};

export default async function InstructorLearnerDetailPage({
  params,
}: PageProps) {
  const { courseId, learnerUserId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learnerDetail(
          courseId,
          learnerUserId
        )
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorLearnerDetail(
    supabase,
    courseId,
    learnerUserId
  );

  return (
    <LearningShell
      title={
        loaded.ok
          ? loaded.data.learner_label ?? "Learner detail"
          : "Learner detail"
      }
      subtitle="Read-only learner progress and assessment status"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(courseId)}
      backLabel="Learners"
    >
      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/40">
                Enrollment
              </dt>
              <dd className="text-sm text-white/80">
                {loaded.data.enrollment_status ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/40">
                Completion
              </dt>
              <dd className="text-sm text-white/80">
                {loaded.data.progress_status}
                {loaded.data.percent_complete != null
                  ? ` · ${loaded.data.percent_complete}%`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/40">
                Certificate
              </dt>
              <dd className="text-sm text-white/80">
                {loaded.data.certificate_status === "issued"
                  ? loaded.data.certificate_code ?? "issued"
                  : "none"}
              </dd>
            </div>
          </dl>

          <section>
            <h2 className="text-lg font-bold text-white">Completed lessons</h2>
            {loaded.data.lessons.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">No lesson progress.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {loaded.data.lessons.map((lesson) => (
                  <li key={lesson.lesson_id}>
                    {lesson.lesson_name} · {lesson.status}
                    {lesson.completed_at ? ` · ${lesson.completed_at}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">
              Completed activities
            </h2>
            {loaded.data.completed_activities.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">
                No scored activity applications.
              </p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {loaded.data.completed_activities.map((activity) => (
                  <li key={`${activity.activity_id}-${activity.attempt_id}`}>
                    {activity.activity_name} · {activity.applied_at}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">
              Assessment & grading
            </h2>
            {loaded.data.assessments.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">No attempts.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {loaded.data.assessments.map((attempt) => (
                  <li
                    key={attempt.attempt_id}
                    className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70"
                  >
                    <p>
                      {attempt.activity_name ?? attempt.activity_id} · attempt{" "}
                      {attempt.attempt_status} · grading{" "}
                      {attempt.grading_status ?? "—"}
                      {attempt.passed === true
                        ? " · passed"
                        : attempt.passed === false
                          ? " · failed"
                          : ""}
                      {attempt.final_percentage != null
                        ? ` · ${attempt.final_percentage}%`
                        : ""}
                    </p>
                    {attempt.has_pending_manual_review ? (
                      <Link
                        href={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(
                          courseId,
                          attempt.attempt_id
                        )}
                        className="mt-2 inline-block font-bold text-white underline underline-offset-2"
                      >
                        Open pending review
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </LearningShell>
  );
}
