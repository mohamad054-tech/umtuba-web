import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import ProgramLifecycleActions from "../../../../components/learning/instructor/ProgramLifecycleActions";
import ProgramStatusChip from "../../../../components/learning/instructor/ProgramStatusChip";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorProgram,
  getInstructorSpace,
} from "../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ programId: string }> | { programId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { programId } = await Promise.resolve(params);
  void programId;
  return { title: "Program · Instructor | UM Learning" };
}

export default async function InstructorProgramPage({
  params,
  searchParams,
}: PageProps) {
  const { programId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.program(programId)
      )}`
    );
  }

  const supabase = await createClient();
  const program = await getInstructorProgram(supabase, programId);
  if (!program.ok) {
    if (program.message.toLowerCase().includes("not found")) notFound();
    return (
      <InstructorShell
        title="Program"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {program.message}
        </p>
      </InstructorShell>
    );
  }

  const space = await getInstructorSpace(supabase, program.data.space_id);
  const backHref = space.ok
    ? LEARNING_INSTRUCTOR_ROUTES.space(space.data.id)
    : LEARNING_INSTRUCTOR_ROUTES.hub;
  const backLabel = space.ok ? space.data.name : "Spaces";

  return (
    <InstructorShell
      title={program.data.name}
      subtitle="Learning program"
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {program.data.name}
          </h1>
          <p className="mt-1 text-sm text-white/50">/{program.data.slug}</p>
        </div>
        <ProgramStatusChip status={program.data.status} />
      </div>

      {program.data.description ? (
        <p className="mt-4 text-sm text-white/65">{program.data.description}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Format
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {program.data.format.replaceAll("_", " ")}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {program.data.visibility}
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
        <ProgramLifecycleActions
          program={program.data}
          errorMessage={query.error?.trim() || null}
        />
      </div>
    </InstructorShell>
  );
}
