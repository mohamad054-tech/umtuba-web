import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerHub,
  type LearningLearnerHubCourse,
} from "../../../lib/learning/learnerDelivery";

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
    <div className="mt-6 space-y-6" data-testid="learning-hub">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          My Learning
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Continue learning</h1>
        <p className="mt-2 text-sm text-white/50">
          Programs and courses you can access through your enrollments.
        </p>
      </section>

      {continueCourse && continueCourse.continue_href ? (
        <section
          className="rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5 backdrop-blur-xl md:p-7"
          aria-label="Continue learning"
          data-testid="learning-hub-continue"
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
          <p className="mt-2 text-sm text-white/70">
            {continueCourse.progress
              ? `${Math.round(continueCourse.progress.percent_complete)}% · ${progressLabel(continueCourse.progress.status)}`
              : "Resume where you left off"}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={continueCourse.continue_href}
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              data-testid="learning-hub-resume"
            >
              Resume
            </Link>
            <Link
              href={LEARNING_LEARNER_ROUTES.course(continueCourse.id)}
              className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
            >
              Course outline
            </Link>
          </div>
        </section>
      ) : null}

      {empty ? (
        <p
          role="status"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55"
        >
          No accessible programs or courses yet. Once you are enrolled, they will
          appear here.
        </p>
      ) : null}

      {hub.programs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Programs
          </h2>
          <ul className="space-y-3">
            {hub.programs.map((program) => (
              <li
                key={program.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
              >
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
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Courses
          </h2>
          <ul className="space-y-3">
            {hub.courses.map((course) => (
              <li
                key={course.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
              >
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
                        <p className="mt-1 text-sm text-white/50">
                          {course.description}
                        </p>
                      ) : null}
                    </Link>
                    <p className="mt-2 text-xs text-white/45">
                      {course.progress
                        ? `${Math.round(course.progress.percent_complete)}% complete · ${progressLabel(course.progress.status)} · ${course.progress.completed_lessons_count}/${course.progress.total_lessons_count} lessons`
                        : "Progress unavailable"}
                    </p>
                  </div>
                  {course.continue_href ? (
                    <Link
                      href={course.continue_href}
                      className="watch-focus-ring shrink-0 rounded-full bg-white px-4 py-2 text-sm font-black text-black"
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
