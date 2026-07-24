import { redirect } from "next/navigation";
import Link from "next/link";
import LearningShell from "../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  listInstructorAuthorableCourses,
  type InstructorAuthorableCourse,
} from "../../../lib/learning/instructorAuthoring";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";

export default async function InstructorAuthoringHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.hub)}`
    );
  }

  const supabase = await createClient();
  const listed = await listInstructorAuthorableCourses(supabase);

  return (
    <LearningShell
      title="Instructor workspace"
      subtitle="Author course structure with existing Learning RPCs"
      backHref={LEARNING_LEARNER_ROUTES.hub}
      backLabel="Learner hub"
    >
      <p className="mt-4 text-sm text-white/70">
        Minimal authoring for sections, lessons, activities, and content blocks.
        Questions and answer keys are out of scope. Database RPCs remain the
        final authority.
      </p>

      {!listed.ok ? (
        <p className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {listed.message}
        </p>
      ) : (listed.data as InstructorAuthorableCourse[]).length === 0 ? (
        <p className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          No manageable courses are visible for your account. You need course
          staff or space manage rights, and the parent space must be active.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {(listed.data as InstructorAuthorableCourse[]).map((course) => (
            <li
              key={course.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={LEARNING_INSTRUCTOR_ROUTES.course(course.id)}
                  className="watch-focus-ring text-lg font-bold text-white hover:underline"
                >
                  {course.name}
                </Link>
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {course.status}
                </span>
              </div>
              {course.description ? (
                <p className="mt-2 text-sm text-white/60">{course.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </LearningShell>
  );
}
