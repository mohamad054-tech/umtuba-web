import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import CreateSectionForm from "../../../../../../components/learning/instructor/CreateSectionForm";
import {
  createClient,
  getServerUser,
} from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  LEARNING_SECTION_REQUIRES_ACTIVE_SPACE,
  LEARNING_SECTION_REQUIRES_VALID_COURSE,
  LEARNING_SECTION_REQUIRES_VALID_PROGRAM,
  getInstructorCourse,
  getInstructorProgram,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New section | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorSectionPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.sectionNew(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const course = await getInstructorCourse(supabase, courseId);
  if (!course.ok) {
    if (course.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        course.message
      )}`
    );
  }

  if (
    course.data.status !== "draft" &&
    course.data.status !== "published"
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?error=${encodeURIComponent(
        LEARNING_SECTION_REQUIRES_VALID_COURSE
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
      `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?error=${encodeURIComponent(
        LEARNING_SECTION_REQUIRES_VALID_PROGRAM
      )}`
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok || space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.course(courseId)}?error=${encodeURIComponent(
        LEARNING_SECTION_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New section"
      subtitle={course.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      backLabel="Course"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create section</h1>
      <CreateSectionForm
        courseId={course.data.id}
        errorMessage={query.error?.trim() || null}
      />
    </InstructorShell>
  );
}
