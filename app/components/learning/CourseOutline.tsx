import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerCourseOutline,
} from "../../../lib/learning/learnerDelivery";
import { LEARNING_COMMUNITY_ROUTES } from "../../../lib/learning/communityFoundation";
import { LEARNING_LIVE_ROUTES } from "../../../lib/learning/liveCalendarFoundation";
import ProgressSummary from "./ProgressSummary";
import {
  learningBtnPrimary,
  learningBtnSecondary,
  learningCard,
  learningCardQuiet,
  learningChip,
  learningEyebrow,
} from "./ui/tokens";

type CourseOutlineProps = {
  outline: LearningLearnerCourseOutline;
};

function progressLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function resolveOutlineContinueHref(
  outline: LearningLearnerCourseOutline
): string | null {
  const lessons = outline.sections.flatMap((section) => section.lessons);
  const lastId = outline.progress?.last_lesson_id;
  if (lastId && lessons.some((lesson) => lesson.id === lastId)) {
    return LEARNING_LEARNER_ROUTES.lesson(lastId);
  }
  const nextIncomplete = lessons.find(
    (lesson) => lesson.progress_status !== "completed"
  );
  if (nextIncomplete) {
    return LEARNING_LEARNER_ROUTES.lesson(nextIncomplete.id);
  }
  if (lessons[0]) {
    return LEARNING_LEARNER_ROUTES.lesson(lessons[0].id);
  }
  return null;
}

export default function CourseOutline({ outline }: CourseOutlineProps) {
  const continueHref = resolveOutlineContinueHref(outline);
  const allLessons = outline.sections.flatMap((section) => section.lessons);
  const currentLessonId =
    outline.progress?.last_lesson_id &&
    allLessons.some((lesson) => lesson.id === outline.progress?.last_lesson_id)
      ? outline.progress.last_lesson_id
      : allLessons.find((lesson) => lesson.progress_status !== "completed")?.id ??
        null;

  const tools = [
    {
      href: LEARNING_COMMUNITY_ROUTES.hub(outline.course.id),
      label: "Community",
    },
    {
      href: LEARNING_LIVE_ROUTES.learnerSchedule(outline.course.id),
      label: "Live classes",
    },
    {
      href: LEARNING_LIVE_ROUTES.learnerCalendar(outline.course.id),
      label: "Calendar",
    },
    {
      href: LEARNING_LEARNER_ROUTES.resources(outline.course.id),
      label: "Resources",
    },
    {
      href: LEARNING_LEARNER_ROUTES.progress(outline.course.id),
      label: "Progress",
    },
  ];

  return (
    <div className="mt-4 space-y-6">
      <section className={`${learningCard} p-5 md:p-7`}>
        <p className={learningEyebrow}>Course</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {outline.course.name}
        </h1>
        {outline.course.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
            {outline.course.description}
          </p>
        ) : null}
        <div className="mt-5">
          <ProgressSummary progress={outline.progress} />
        </div>
        {continueHref ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={continueHref} className={learningBtnPrimary}>
              {outline.progress?.status === "completed"
                ? "Review course"
                : outline.progress?.status === "in_progress"
                  ? "Continue learning"
                  : "Start learning"}
            </Link>
            <Link
              href={LEARNING_LEARNER_ROUTES.progress(outline.course.id)}
              className={learningBtnSecondary}
            >
              View progress
            </Link>
          </div>
        ) : null}
        <nav
          aria-label="Course tools"
          className="mt-5 flex flex-wrap gap-2"
        >
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className={learningChip}>
              {tool.label}
            </Link>
          ))}
        </nav>
      </section>

      {outline.sections.length === 0 ? (
        <p
          role="status"
          className={`${learningCardQuiet} px-4 py-6 text-sm text-white/55`}
        >
          No published sections yet.
        </p>
      ) : (
        outline.sections.map((section) => {
          const done = section.lessons.filter(
            (lesson) => lesson.progress_status === "completed"
          ).length;
          return (
            <section key={section.id} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  {section.name}
                </h2>
                {section.lessons.length > 0 ? (
                  <p className="text-xs text-white/40">
                    {done}/{section.lessons.length} lessons
                  </p>
                ) : null}
              </div>
              {section.lessons.length === 0 ? (
                <p className="text-sm text-white/40">No published lessons.</p>
              ) : (
                <ul className="space-y-2">
                  {section.lessons.map((lesson, index) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const doneLesson = lesson.progress_status === "completed";
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={LEARNING_LEARNER_ROUTES.lesson(lesson.id)}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`watch-focus-ring flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                            isCurrent
                              ? "border-sky-400/35 bg-sky-500/10"
                              : "border-white/10 bg-[#080816]/60 hover:border-white/25"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                doneLesson
                                  ? "bg-emerald-400/20 text-emerald-200"
                                  : isCurrent
                                    ? "bg-sky-400/20 text-sky-100"
                                    : "bg-white/10 text-white/50"
                              }`}
                            >
                              {doneLesson ? "✓" : index + 1}
                            </span>
                            <span className="font-bold text-white/90">
                              {lesson.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-white/40">
                            {isCurrent && !doneLesson
                              ? "Up next"
                              : progressLabel(lesson.progress_status)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
