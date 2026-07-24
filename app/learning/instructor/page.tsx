import { redirect } from "next/navigation";
import InstructorShell from "../../components/learning/instructor/InstructorShell";
import InstructorSpaceList from "../../components/learning/instructor/InstructorSpaceList";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  listInstructorSpaces,
} from "../../../lib/learning/instructorAuthoring";

export const metadata = {
  title: "Instructor | UM Learning",
};

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function InstructorDashboardPage({
  searchParams,
}: Props) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.hub)}`
    );
  }

  const query = await Promise.resolve(searchParams ?? {});
  const errorMessage = query.error?.trim() || null;

  const supabase = await createClient();
  const spaces = await listInstructorSpaces(supabase);

  return (
    <InstructorShell title="Instructor" subtitle="Learning spaces">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Your spaces</h1>
          <p className="mt-1 text-sm text-white/50">
            Create and publish spaces. Programs require an active space.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      {spaces.ok ? (
        <InstructorSpaceList spaces={spaces.data} />
      ) : (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {spaces.message}
        </p>
      )}
    </InstructorShell>
  );
}
