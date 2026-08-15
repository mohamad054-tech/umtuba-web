import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import {
  LearningProgressBar,
  LearningStatePanel,
  LearningStatusBadge,
} from "../../../../components/learning/ds";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadCourseOutline,
} from "../../../../../lib/learning/learnerDelivery";
import { loadMyLearningCourseProgressBundle } from "../../../../../lib/learning/lessonEngineFoundation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

function statusTone(
  status: string
): "neutral" | "success" | "warning" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "neutral";
}

export default async function CourseProgressPage({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.progress(courseId))}`
    );
  }

  const supabase = await createClient();
  const [loaded, outline] = await Promise.all([
    loadMyLearningCourseProgressBundle(supabase, courseId),
    loadCourseOutline(supabase, courseId),
  ]);
  const sectionNames = new Map<string, string>();
  if (outline.ok) {
    for (const section of outline.data.sections) {
      sectionNames.set(section.id, section.name);
    }
  }
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
  const percent = Number(courseProgress?.percent_complete ?? 0);
  const status = String(courseProgress?.status ?? "not_started");

  return (
    <LearningShell
      title="Course progress"
      subtitle="Lesson, module, and resume state"
      backHref={LEARNING_LEARNER_ROUTES.course(courseId)}
      backLabel="Course"
    >
      {!loaded.ok ? (
        <div className="mt-6">
          <LearningStatePanel title="Progress unavailable" tone="danger">
            {loaded.message}
          </LearningStatePanel>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            {courseProgress ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                    Overall
                  </p>
                  <LearningStatusBadge tone={statusTone(status)}>
                    {status.replaceAll("_", " ")}
                  </LearningStatusBadge>
                </div>
                <div className="mt-4">
                  <LearningProgressBar percent={percent} />
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {String(courseProgress.completed_lessons_count ?? 0)}/
                  {String(courseProgress.total_lessons_count ?? 0)} lessons
                </p>
              </>
            ) : (
              <p className="text-sm text-white/50">No course progress yet.</p>
            )}
            {resumeLessonId ? (
              <p className="mt-4">
                <Link
                  href={LEARNING_LEARNER_ROUTES.lesson(resumeLessonId)}
                  className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {continueTarget?.last_media_position_seconds != null
                    ? "Continue watching"
                    : "Resume learning"}
                </Link>
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black tracking-tight text-white">
              Module progress
            </h2>
            {sections.length === 0 ? (
              <p className="text-sm text-white/45">No section progress yet.</p>
            ) : (
              <ul className="space-y-2">
                {sections.map((section) => {
                  const sectionPercent = Number(
                    section.percent_complete ?? 0
                  );
                  const sectionId = String(section.section_id ?? "");
                  const sectionName =
                    sectionNames.get(sectionId) ??
                    (typeof section.section_name === "string"
                      ? section.section_name
                      : "Module");
                  return (
                    <li
                      key={sectionId || String(section.section_id)}
                      className="rounded-2xl border border-white/10 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/75">
                        <span>{sectionName}</span>
                        <LearningStatusBadge
                          tone={statusTone(String(section.status ?? ""))}
                        >
                          {String(section.status ?? "—").replaceAll("_", " ")}
                        </LearningStatusBadge>
                      </div>
                      <div className="mt-3">
                        <LearningProgressBar percent={sectionPercent} />
                      </div>
                      {typeof section.last_lesson_id === "string" ? (
                        <p className="mt-2 text-sm">
                          <Link
                            href={LEARNING_LEARNER_ROUTES.lesson(
                              section.last_lesson_id
                            )}
                            className="underline underline-offset-2"
                          >
                            Last lesson
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </LearningShell>
  );
}
