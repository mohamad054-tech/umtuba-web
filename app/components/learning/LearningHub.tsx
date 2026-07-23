import Link from "next/link";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerHub,
} from "../../../lib/learning/learnerDelivery";

type LearningHubProps = {
  hub: LearningLearnerHub;
};

export default function LearningHub({ hub }: LearningHubProps) {
  const empty = hub.programs.length === 0 && hub.courses.length === 0;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          My Learning
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Continue learning</h1>
        <p className="mt-2 text-sm text-white/50">
          Programs and courses you can access through your enrollments.
        </p>
      </section>

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
              <li key={course.id}>
                <Link
                  href={LEARNING_LEARNER_ROUTES.course(course.id)}
                  className="watch-focus-ring block rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4 transition hover:border-white/25"
                >
                  <p className="text-lg font-black tracking-tight">{course.name}</p>
                  {course.program_name ? (
                    <p className="mt-1 text-xs text-white/40">{course.program_name}</p>
                  ) : null}
                  {course.description ? (
                    <p className="mt-1 text-sm text-white/50">{course.description}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
