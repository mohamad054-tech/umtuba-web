import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import CreateActivityForm from "../../../../../../components/learning/instructor/CreateActivityForm";
import {
  createClient,
  getServerUser,
} from "../../../../../../../lib/supabase/server";
import {
  LEARNING_ACTIVITY_REQUIRES_ACTIVE_SPACE,
  LEARNING_ACTIVITY_REQUIRES_VALID_COURSE,
  LEARNING_ACTIVITY_REQUIRES_VALID_LESSON,
  LEARNING_ACTIVITY_REQUIRES_VALID_PROGRAM,
  LEARNING_ACTIVITY_REQUIRES_VALID_SECTION,
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorCourse,
  getInstructorLesson,
  getInstructorProgram,
  getInstructorSection,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New activity | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.activityNew(lessonId)
      )}`
    );
  }

  const supabase = await createClient();
  const lesson = await getInstructorLesson(supabase, lessonId);
  if (!lesson.ok) {
    if (lesson.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        lesson.message
      )}`
    );
  }

  if (
    lesson.data.status !== "draft" &&
    lesson.data.status !== "published"
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_ACTIVITY_REQUIRES_VALID_LESSON
      )}`
    );
  }

  const section = await getInstructorSection(
    supabase,
    lesson.data.section_id
  );
  if (
    !section.ok ||
    (section.data.status !== "draft" && section.data.status !== "published")
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_ACTIVITY_REQUIRES_VALID_SECTION
      )}`
    );
  }

  const course = await getInstructorCourse(supabase, section.data.course_id);
  if (
    !course.ok ||
    (course.data.status !== "draft" && course.data.status !== "published")
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_ACTIVITY_REQUIRES_VALID_COURSE
      )}`
    );
  }

  const program = await getInstructorProgram(
    supabase,
    course.data.program_id
  );
  if (
    !program.ok ||
    (program.data.status !== "draft" && program.data.status !== "published")
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_ACTIVITY_REQUIRES_VALID_PROGRAM
      )}`
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok || space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_ACTIVITY_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New activity"
      subtitle={lesson.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}
      backLabel="Lesson"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create activity</h1>
      <CreateActivityForm
        lessonId={lesson.data.id}
        errorMessage={query.error?.trim() || null}
      />
    </InstructorShell>
  );
}
