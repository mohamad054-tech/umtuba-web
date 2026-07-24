import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import LessonLifecycleActions from "../../../../components/learning/instructor/LessonLifecycleActions";
import LessonStatusChip from "../../../../components/learning/instructor/LessonStatusChip";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorLesson,
  getInstructorSection,
} from "../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  void lessonId;
  return { title: "Lesson · Instructor | UM Learning" };
}

export default async function InstructorLessonPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)
      )}`
    );
  }

  const supabase = await createClient();
  const lesson = await getInstructorLesson(supabase, lessonId);
  if (!lesson.ok) {
    if (lesson.message.toLowerCase().includes("not found")) notFound();
    return (
      <InstructorShell
        title="Lesson"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {lesson.message}
        </p>
      </InstructorShell>
    );
  }

  const section = await getInstructorSection(
    supabase,
    lesson.data.section_id
  );
  const backHref = section.ok
    ? LEARNING_INSTRUCTOR_ROUTES.section(section.data.id)
    : LEARNING_INSTRUCTOR_ROUTES.hub;
  const backLabel = section.ok ? section.data.name : "Sections";

  return (
    <InstructorShell
      title={lesson.data.name}
      subtitle="Learning lesson"
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {lesson.data.name}
          </h1>
          <p className="mt-1 text-sm text-white/50">/{lesson.data.slug}</p>
        </div>
        <LessonStatusChip status={lesson.data.status} />
      </div>

      {lesson.data.description ? (
        <p className="mt-4 text-sm text-white/65">
          {lesson.data.description}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Position
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            #{lesson.data.position}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {lesson.data.visibility}
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
        <LessonLifecycleActions
          lesson={lesson.data}
          errorMessage={query.error?.trim() || null}
        />
      </div>
    </InstructorShell>
  );
}
