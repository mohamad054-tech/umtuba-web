import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../../../components/learning/instructor/InstructorShell";
import CreateProgramForm from "../../../../../../components/learning/instructor/CreateProgramForm";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE,
  getInstructorSpace,
} from "../../../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New program | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ spaceId: string }> | { spaceId: string };
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorProgramPage({
  params,
  searchParams,
}: PageProps) {
  const { spaceId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.programNew(spaceId)
      )}`
    );
  }

  const supabase = await createClient();
  const space = await getInstructorSpace(supabase, spaceId);
  if (!space.ok) {
    if (space.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.hub}?error=${encodeURIComponent(
        space.message
      )}`
    );
  }

  if (space.data.status !== "active") {
    redirect(
      `${LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}?error=${encodeURIComponent(
        LEARNING_PROGRAM_REQUIRES_ACTIVE_SPACE
      )}`
    );
  }

  return (
    <InstructorShell
      title="New program"
      subtitle={space.data.name}
      backHref={LEARNING_INSTRUCTOR_ROUTES.space(spaceId)}
      backLabel="Space"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create program</h1>
      <CreateProgramForm
        spaceId={space.data.id}
        errorMessage={query.error?.trim() || null}
      />
    </InstructorShell>
  );
}
