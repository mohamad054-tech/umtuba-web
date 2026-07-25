import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import { CreateContentBlockForm } from "../../../../../../components/learning/instructor/ContentBlockFields";
import { createLearningContentBlockAction } from "../../../../actions";
import {
  createClient,
  getServerUser,
} from "../../../../../../../lib/supabase/server";
import {
  LEARNING_CONTENT_BLOCK_REQUIRES_ACTIVE_SPACE,
  LEARNING_CONTENT_BLOCK_REQUIRES_VALID_COURSE,
  LEARNING_CONTENT_BLOCK_REQUIRES_VALID_LESSON,
  LEARNING_CONTENT_BLOCK_REQUIRES_VALID_PROGRAM,
  LEARNING_CONTENT_BLOCK_REQUIRES_VALID_SECTION,
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorCourse,
  getInstructorLesson,
  getInstructorProgram,
  getInstructorSection,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New content block | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorContentBlockPage({
  params,
  searchParams,
}: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.contentBlockNew(lessonId)
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
        LEARNING_CONTENT_BLOCK_REQUIRES_VALID_LESSON
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
        LEARNING_CONTENT_BLOCK_REQUIRES_VALID_SECTION
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
        LEARNING_CONTENT_BLOCK_REQUIRES_VALID_COURSE
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
        LEARNING_CONTENT_BLOCK_REQUIRES_VALID_PROGRAM
      )}`
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok || space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(
        LEARNING_CONTENT_BLOCK_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New content block"
      subtitle={lesson.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.lesson(lessonId)}
      backLabel="Lesson"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">
        Create content block
      </h1>
      <CreateContentBlockForm
        lessonId={lesson.data.id}
        errorMessage={query.error?.trim() || null}
        action={createLearningContentBlockAction}
      />
    </InstructorShell>
  );
}
