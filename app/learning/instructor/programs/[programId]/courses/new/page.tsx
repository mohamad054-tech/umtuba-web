import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import CreateCourseForm from "../../../../../../components/learning/instructor/CreateCourseForm";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_COURSE_REQUIRES_ACTIVE_SPACE,
  LEARNING_COURSE_REQUIRES_VALID_PROGRAM,
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorProgram,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New course | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ programId: string }> | { programId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorCoursePage({
  params,
  searchParams,
}: PageProps) {
  const { programId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.courseNew(programId)
      )}`
    );
  }

  const supabase = await createClient();
  const program = await getInstructorProgram(supabase, programId);
  if (!program.ok) {
    if (program.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        program.message
      )}`
    );
  }

  if (
    program.data.status !== "draft" &&
    program.data.status !== "published"
  ) {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?error=${encodeURIComponent(
        LEARNING_COURSE_REQUIRES_VALID_PROGRAM
      )}`
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  if (!space.ok || space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.program(programId)}?error=${encodeURIComponent(
        LEARNING_COURSE_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New course"
      subtitle={program.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.program(programId)}
      backLabel="Program"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create course</h1>
      <CreateCourseForm
        programId={program.data.id}
        errorMessage={query.error?.trim() || null}
      />
    </InstructorShell>
  );
}
