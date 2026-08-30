import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES,
  loadInstructorCompletionOverview,
} from "../../../../../../lib/learning/instructorExperience";
import { LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES } from "../../../../../../lib/learning/assessmentManualReview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

function labelOf(row: Record<string, unknown>): string {
  const label = row.learner_label;
  const id = row.learner_user_id;
  if (typeof label === "string" && label.trim()) return label;
  if (typeof id === "string") return id.slice(0, 8);
  return "Learner";
}

export default async function InstructorCompletionOverviewPage({
  params,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.completion(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorCompletionOverview(supabase, courseId);

  return (
    <LearningShell
      title="Completion overview"
      subtitle="Who completed, failed, waits for grading, or is inactive"
      backHref={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(courseId)}
      backLabel="Course overview"
    >
      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-10">
          <dl className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["Completed", loaded.data.counts.completed],
                ["Failed", loaded.data.counts.failed],
                ["Waiting grading", loaded.data.counts.waiting_grading],
                ["Inactive", loaded.data.counts.inactive],
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

          {(
            [
              ["Completed", loaded.data.completed],
              ["Failed", loaded.data.failed],
              ["Waiting for grading", loaded.data.waiting_grading],
              ["Inactive (14+ days)", loaded.data.inactive],
            ] as const
          ).map(([title, rows]) => (
            <section key={title}>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-white/55">None.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {rows.map((row, index) => {
                    const learnerId =
                      typeof row.learner_user_id === "string"
                        ? row.learner_user_id
                        : null;
                    const attemptId =
                      typeof row.attempt_id === "string"
                        ? row.attempt_id
                        : null;
                    return (
                      <li
                        key={`${title}-${learnerId ?? index}-${attemptId ?? ""}`}
                        className="rounded-lg border border-white/10 px-4 py-3 text-sm text-white/70"
                      >
                        {learnerId ? (
                          <Link
                            href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learnerDetail(
                              courseId,
                              learnerId
                            )}
                            className="font-bold text-white underline underline-offset-2"
                          >
                            {labelOf(row)}
                          </Link>
                        ) : (
                          labelOf(row)
                        )}
                        {attemptId ? (
                          <>
                            {" · "}
                            <Link
                              href={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(
                                courseId,
                                attemptId
                              )}
                              className="underline underline-offset-2"
                            >
                              attempt
                            </Link>
                          </>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </LearningShell>
  );
}
