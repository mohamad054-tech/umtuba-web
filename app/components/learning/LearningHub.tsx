import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerHub,
  type LearningLearnerHubCourse,
} from "../../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../../lib/learning/publicCatalog";
import { LEARNING_COMPLETION_ROUTES } from "../../../lib/learning/completionFoundation";
import LearningProgressBar from "./ui/LearningProgressBar";
import LearningEmptyState from "./ui/LearningEmptyState";
import {
  learningBtnPrimary,
  learningBtnSecondary,
  learningCard,
  learningCardQuiet,
  learningEyebrow,
} from "./ui/tokens";

type LearningHubProps = {
  hub: LearningLearnerHub;
};

function progressLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

function pickContinueCourse(
  courses: LearningLearnerHubCourse[]
): LearningLearnerHubCourse | null {
  const withTarget = courses.filter((c) => c.continue_href);
  if (withTarget.length === 0) return null;

  const inProgress = withTarget.filter(
    (c) => c.progress?.status === "in_progress"
  );
  if (inProgress.length > 0) {
    return [...inProgress].sort(
      (a, b) =>
        (b.progress?.percent_complete ?? 0) - (a.progress?.percent_complete ?? 0)
    )[0];
  }

  const notStarted = withTarget.filter(
    (c) => (c.progress?.status ?? "not_started") === "not_started"
  );
  if (notStarted.length > 0) return notStarted[0];

  return withTarget[0];
}

export default function LearningHub({ hub }: LearningHubProps) {
  const empty = hub.programs.length === 0 && hub.courses.length === 0;
  const continueCourse = pickContinueCourse(hub.courses);

  return (
    <div className="mt-4 space-y-6">
      <section className={`${learningCard} p-5 md:p-7`}>
        <p className={learningEyebrow}>My Learning</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Pick up where you left off
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
          Programs and courses you can access through your enrollments.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={LEARNING_PUBLIC_ROUTES.catalog} className={learningBtnSecondary}>
            Browse catalog
          </Link>
          <Link
            href={LEARNING_COMPLETION_ROUTES.transcript}
            className={learningBtnSecondary}
          >
            Transcript &amp; certificates
          </Link>
        </div>
      </section>

      {continueCourse && continueCourse.continue_href ? (
        <section
          className="rounded-[24px] border border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-indigo-500/10 p-5 backdrop-blur-xl md:p-7"
          aria-label="Continue learning"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100/70">
            Continue Learning
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {continueCourse.name}
          </h2>
          {continueCourse.program_name ? (
            <p className="mt-1 text-xs text-white/40">
              {continueCourse.program_name}
            </p>
          ) : null}
          {continueCourse.progress ? (
            <div className="mt-4 max-w-md">
              <LearningProgressBar
                percent={continueCourse.progress.percent_complete}
                label={`${progressLabel(continueCourse.progress.status)} · ${continueCourse.progress.completed_lessons_count}/${continueCourse.progress.total_lessons_count} lessons`}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/70">
              Resume where you left off
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={continueCourse.continue_href}
              className={learningBtnPrimary}
            >
              Resume
            </Link>
            <Link
              href={LEARNING_LEARNER_ROUTES.course(continueCourse.id)}
              className={learningBtnSecondary}
            >
              Course outline
            </Link>
          </div>
        </section>
      ) : null}

      {empty ? (
        <LearningEmptyState
          title="No courses yet"
          body="No accessible programs or courses yet. Once you are enrolled, they will appear here. Browse the catalog to find a course and start learning."
          actionHref={LEARNING_PUBLIC_ROUTES.catalog}
          actionLabel="Browse catalog"
        />
      ) : null}

      {hub.programs.length > 0 ? (
        <section className="space-y-3">
          <h2 className={learningEyebrow}>Programs</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {hub.programs.map((program) => (
              <li key={program.id} className={`${learningCardQuiet} px-4 py-4`}>
                <p className="text-lg font-black tracking-tight">{program.name}</p>
                {program.description ? (
                  <p className="mt-1 text-sm text-white/50">{program.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-white/35">
                  Open a course below to continue.
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hub.courses.length > 0 ? (
        <section className="space-y-3">
          <h2 className={learningEyebrow}>Courses</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {hub.courses.map((course) => (
              <li key={course.id} className={`${learningCardQuiet} px-4 py-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={LEARNING_LEARNER_ROUTES.course(course.id)}
                      className="watch-focus-ring block rounded-lg transition hover:opacity-90"
                    >
                      <p className="text-lg font-black tracking-tight">
                        {course.name}
                      </p>
                      {course.program_name ? (
                        <p className="mt-1 text-xs text-white/40">
                          {course.program_name}
                        </p>
                      ) : null}
                      {course.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-white/50">
                          {course.description}
                        </p>
                      ) : null}
                    </Link>
                    {course.progress ? (
                      <div className="mt-3">
                        <LearningProgressBar
                          percent={course.progress.percent_complete}
                          label={`${progressLabel(course.progress.status)} · ${course.progress.completed_lessons_count}/${course.progress.total_lessons_count} lessons`}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-white/45">
                        Progress unavailable
                      </p>
                    )}
                  </div>
                  {course.continue_href ? (
                    <Link
                      href={course.continue_href}
                      className={`${learningBtnPrimary} shrink-0`}
                    >
                      Resume
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
