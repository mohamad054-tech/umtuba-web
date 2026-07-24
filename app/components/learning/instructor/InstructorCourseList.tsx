import Link from "next/link";
import type { InstructorCourseSummary } from "../../../../lib/learning/instructorAuthoring";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../lib/learning/instructorAuthoring";
import CourseStatusChip from "./CourseStatusChip";

export default function InstructorCourseList({
  programId,
  canCreate,
  courses,
}: {
  programId: string;
  canCreate: boolean;
  courses: InstructorCourseSummary[];
}) {
  return (
    <section className="mt-6 border-t border-white/10 pt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/50">
          Courses
        </h2>
        {canCreate ? (
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)}
            className="watch-focus-ring rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-bold text-black"
          >
            New course
          </Link>
        ) : null}
      </div>

      {!canCreate ? (
        <p className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Program must be draft or published (and its space active) before
          creating courses.
        </p>
      ) : null}

      {courses.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5">
          <p className="text-sm text-white/65">No courses yet.</p>
          {canCreate ? (
            <Link
              href={LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)}
              className="watch-focus-ring mt-3 inline-flex text-sm font-bold text-white/80 hover:text-white"
            >
              Create the first course →
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={LEARNING_INSTRUCTOR_ROUTES.course(course.id)}
                className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{course.name}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      /{course.slug}
                    </p>
                  </div>
                  <CourseStatusChip status={course.status} />
                </div>
                <p className="mt-2 text-xs text-white/45">
                  #{course.position} · {course.visibility}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
