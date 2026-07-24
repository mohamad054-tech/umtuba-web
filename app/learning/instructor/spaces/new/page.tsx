import { redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import CreateSpaceForm from "../../../../components/learning/instructor/CreateSpaceForm";
import { getServerUser } from "../../../../../lib/supabase/server";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "New space | UM Learning Instructor",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorSpacePage({ searchParams }: Props) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.spaceNew)}`
    );
  }

  const query = await Promise.resolve(searchParams ?? {});
  const errorMessage = query.error?.trim() || null;

  return (
    <InstructorShell
      title="New space"
      subtitle="Instructor"
      backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      backLabel="Spaces"
    >
      <h1 className="mb-4 text-xl font-bold tracking-tight">Create space</h1>
      <CreateSpaceForm errorMessage={errorMessage} />
    </InstructorShell>
  );
}
