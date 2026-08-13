import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { LEARNING_LEARNER_ROUTES } from "../../../../../lib/learning/learnerDelivery";
import { loadMyLearningCourseProgressBundle } from "../../../../../lib/learning/lessonEngineFoundation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export default async function CourseProgressPage({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.progress(courseId))}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadMyLearningCourseProgressBundle(supabase, courseId);
  const courseProgress =
    loaded.ok &&
    loaded.data.course_progress &&
    typeof loaded.data.course_progress === "object"
      ? (loaded.data.course_progress as Record<string, unknown>)
      : null;
  const sections =
    loaded.ok && Array.isArray(loaded.data.section_progresses)
      ? (loaded.data.section_progresses as Array<Record<string, unknown>>)
      : [];
  const continueTarget =
    loaded.ok &&
    loaded.data.continue_target &&
    typeof loaded.data.continue_target === "object"
      ? (loaded.data.continue_target as Record<string, unknown>)
      : null;
  const resumeLessonId =
    typeof continueTarget?.lesson_id === "string"
      ? continueTarget.lesson_id
      : typeof courseProgress?.last_lesson_id === "string"
        ? courseProgress.last_lesson_id
        : null;

  return (
    <LearningShell
      title="Course progress"
      subtitle="Lesson, module, and resume state"
      layout="wide"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      {!loaded.ok ? (
        <p role="alert" className="mt-6 text-sm text-rose-100">
          {loaded.message}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            {courseProgress ? (
              <>
                <p className="text-sm text-white/70">
                  Status: {String(courseProgress.status ?? "—")}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Complete: {String(courseProgress.percent_complete ?? 0)}% (
                  {String(courseProgress.completed_lessons_count ?? 0)}/
                  {String(courseProgress.total_lessons_count ?? 0)} lessons)
                </p>
              </>
            ) : (
              <p className="text-sm text-white/50">No course progress yet.</p>
            )}
            {resumeLessonId ? (
              <p className="mt-3">
                <Link
                  href={LEARNING_LEARNER_ROUTES.lesson(resumeLessonId)}
                  className="watch-focus-ring inline-flex min-h-11 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
                >
                  {continueTarget?.last_media_position_seconds != null
                    ? "Continue watching"
                    : "Resume learning"}
                </Link>
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-white">Module progress</h2>
            {sections.length === 0 ? (
              <p className="text-sm text-white/45">No section progress yet.</p>
            ) : (
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li
                    key={String(section.section_id)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75"
                  >
                    Section {String(section.section_id).slice(0, 8)}… ·{" "}
                    {String(section.status ?? "—")} ·{" "}
                    {String(section.percent_complete ?? 0)}% (
                    {String(section.completed_lessons_count ?? 0)}/
                    {String(section.total_lessons_count ?? 0)})
                    {typeof section.last_lesson_id === "string" ? (
                      <>
                        {" · "}
                        <Link
                          href={LEARNING_LEARNER_ROUTES.lesson(
                            section.last_lesson_id
                          )}
                          className="underline underline-offset-2"
                        >
                          last lesson
                        </Link>
                      </>
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
