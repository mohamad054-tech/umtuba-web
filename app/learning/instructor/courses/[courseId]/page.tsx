import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import CourseLifecycleActions from "../../../../components/learning/instructor/CourseLifecycleActions";
import CourseStatusChip from "../../../../components/learning/instructor/CourseStatusChip";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorCourse,
  getInstructorProgram,
} from "../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { courseId } = await Promise.resolve(params);
  void courseId;
  return { title: "Course · Instructor | UM Learning" };
}

export default async function InstructorCoursePage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.course(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const course = await getInstructorCourse(supabase, courseId);
  if (!course.ok) {
    if (course.message.toLowerCase().includes("not found")) notFound();
    return (
      <InstructorShell
        title="Course"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {course.message}
        </p>
      </InstructorShell>
    );
  }

  const program = await getInstructorProgram(
    supabase,
    course.data.program_id
  );
  const backHref = program.ok
    ? LEARNING_INSTRUCTOR_ROUTES.program(program.data.id)
    : LEARNING_INSTRUCTOR_ROUTES.hub;
  const backLabel = program.ok ? program.data.name : "Programs";

  return (
    <InstructorShell
      title={course.data.name}
      subtitle="Learning course"
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {course.data.name}
          </h1>
          <p className="mt-1 text-sm text-white/50">/{course.data.slug}</p>
        </div>
        <CourseStatusChip status={course.data.status} />
      </div>

      {course.data.description ? (
        <p className="mt-4 text-sm text-white/65">{course.data.description}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Position
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            #{course.data.position}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {course.data.visibility}
          </dd>
        </div>
      </dl>

      {query.notice?.trim() ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {query.notice.trim()}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Lifecycle
        </h2>
        <CourseLifecycleActions
          course={course.data}
          errorMessage={query.error?.trim() || null}
        />
      </div>
    </InstructorShell>
  );
}
