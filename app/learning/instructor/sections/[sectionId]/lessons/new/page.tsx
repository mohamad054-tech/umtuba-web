import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import CreateLessonForm from "../../../../../../components/learning/instructor/CreateLessonForm";
import {
  createClient,
  getServerUser,
} from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  LEARNING_LESSON_REQUIRES_ACTIVE_SPACE,
  LEARNING_LESSON_REQUIRES_VALID_COURSE,
  LEARNING_LESSON_REQUIRES_VALID_PROGRAM,
  LEARNING_LESSON_REQUIRES_VALID_SECTION,
  getInstructorCourse,
  getInstructorProgram,
  getInstructorSection,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New lesson | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ sectionId: string }> | { sectionId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorLessonPage({
  params,
  searchParams,
}: PageProps) {
  const { sectionId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.lessonNew(sectionId)
      )}`
    );
  }

  const supabase = await createClient();
  const section = await getInstructorSection(supabase, sectionId);
  if (!section.ok) {
    if (section.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        section.message
      )}`
    );
  }

  if (
    section.data.status !== "draft" &&
    section.data.status !== "published"
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.section(sectionId)}?error=${encodeURIComponent(
        LEARNING_LESSON_REQUIRES_VALID_SECTION
      )}`
    );
  }

  const course = await getInstructorCourse(
    supabase,
    section.data.course_id
  );
  if (
    !course.ok ||
    (course.data.status !== "draft" && course.data.status !== "published")
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.section(sectionId)}?error=${encodeURIComponent(
        LEARNING_LESSON_REQUIRES_VALID_COURSE
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
      `${LEARNING_INSTRUCTOR_ROUTES.section(sectionId)}?error=${encodeURIComponent(
        LEARNING_LESSON_REQUIRES_VALID_PROGRAM
      )}`
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok || space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.section(sectionId)}?error=${encodeURIComponent(
        LEARNING_LESSON_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New lesson"
      subtitle={section.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.section(sectionId)}
      backLabel="Section"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create lesson</h1>
      <CreateLessonForm
        sectionId={section.data.id}
        errorMessage={query.error?.trim() || null}
      />
    </InstructorShell>
  );
}
