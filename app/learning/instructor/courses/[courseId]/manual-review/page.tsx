import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../lib/learning/instructorAuthoring";
import {
  LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES,
  loadManualReviewQueue,
} from "../../../../../../lib/learning/assessmentManualReview";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export default async function ManualReviewQueuePage({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadManualReviewQueue(supabase, courseId);

  return (
    <LearningShell
      title="Manual review queue"
      subtitle="Pending subjective answers"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Back to course"
    >
      {!loaded.ok ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          {loaded.message}
        </p>
      ) : loaded.data.items.length === 0 ? (
        <p className="mt-6 text-sm text-white/55">
          No attempts are waiting for manual review in this course.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {loaded.data.items.map((item) => (
            <li
              key={item.attempt_id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <p className="text-sm text-white/70">
                Attempt {item.attempt_id.slice(0, 8)}… · pending{" "}
                {item.pending_question_count} ·{" "}
                {item.pending_manual_points ?? 0} pts
              </p>
              <p className="mt-1 text-xs text-white/40">
                Submitted: {item.submitted_at ?? "—"} · status{" "}
                {item.grading_status}
              </p>
              <Link
                href={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.attempt(
                  courseId,
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
