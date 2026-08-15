import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";
import { LEARNING_COMMUNITY_ROUTES } from "../../../lib/learning/communityFoundation";
import { LEARNING_LIVE_ROUTES } from "../../../lib/learning/liveCalendarFoundation";
import ProgressSummary from "./ProgressSummary";

type CourseOutlineProps = {
  outline: LearningLearnerCourseOutline;
};

function progressLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function pickOutlineContinueLesson(
  outline: LearningLearnerCourseOutline
): LearningLearnerCourseOutline["sections"][number]["lessons"][number] | null {
  const lessons = outline.sections.flatMap((section) => section.lessons);
  const lastId = outline.progress?.last_lesson_id;
  if (lastId) {
    const last = lessons.find((lesson) => lesson.id === lastId);
    if (last && last.progress_status !== "completed") return last;
    const idx = lessons.findIndex((lesson) => lesson.id === lastId);
    const following = lessons
      .slice(idx + 1)
      .find((lesson) => lesson.progress_status !== "completed");
    if (following) return following;
  }
  return (
    lessons.find((lesson) => lesson.progress_status !== "completed") ?? null
  );
}

export default function CourseOutline({ outline }: CourseOutlineProps) {
  const continueLesson = pickOutlineContinueLesson(outline);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Course
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {outline.course.name}
        </h1>
        {outline.course.description ? (
          <p className="mt-2 text-sm text-white/50">{outline.course.description}</p>
        ) : null}
        <div className="mt-4">
          <ProgressSummary progress={outline.progress} />
        </div>
        {continueLesson ? (
          <p className="mt-4">
            <Link
              href={LEARNING_LEARNER_ROUTES.lesson(continueLesson.id)}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {continueLesson.progress_status === "not_started"
                ? "Start lesson"
                : "Continue"}
            </Link>
          </p>
        ) : null}
        <p className="mt-4 flex flex-wrap gap-4">
          <Link
            href={LEARNING_COMMUNITY_ROUTES.hub(outline.course.id)}
            className="text-sm font-bold text-white underline underline-offset-2"
          >
            Course community
          </Link>
          <Link
            href={LEARNING_LIVE_ROUTES.learnerSchedule(outline.course.id)}
            className="text-sm font-bold text-white underline underline-offset-2"
          >
            Live classes
          </Link>
          <Link
            href={LEARNING_LIVE_ROUTES.learnerCalendar(outline.course.id)}
            className="text-sm font-bold text-white underline underline-offset-2"
          >
            Calendar
          </Link>
          <Link
            href={LEARNING_LEARNER_ROUTES.resources(outline.course.id)}
            className="text-sm font-bold text-white underline underline-offset-2"
          >
            Resources
          </Link>
          <Link
            href={LEARNING_LEARNER_ROUTES.progress(outline.course.id)}
            className="text-sm font-bold text-white underline underline-offset-2"
          >
            Progress
          </Link>
        </p>
      </section>

      {outline.sections.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55"
        >
          No published sections yet.
        </p>
      ) : (
        outline.sections.map((section) => (
          <section key={section.id} className="space-y-3">
            <h2 className="text-lg font-black tracking-tight">{section.name}</h2>
            {section.lessons.length === 0 ? (
              <p className="text-sm text-white/40">No published lessons.</p>
            ) : (
              <ul className="space-y-2">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link
                      href={LEARNING_LEARNER_ROUTES.lesson(lesson.id)}
                      aria-current={
                        continueLesson?.id === lesson.id ? "page" : undefined
                      }
                      className={
                        continueLesson?.id === lesson.id
                          ? "watch-focus-ring flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 transition hover:border-sky-300/40"
                          : "watch-focus-ring flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-3 transition hover:border-white/25"
                      }
                    >
                      <span className="font-bold text-white/90">{lesson.name}</span>
                      <span className="text-xs text-white/40">
                        {progressLabel(lesson.progress_status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </div>
  );
}
