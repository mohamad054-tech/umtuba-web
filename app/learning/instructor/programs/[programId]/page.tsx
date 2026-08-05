import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../components/learning/instructor/InstructorActionForm";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  canArchiveInstructorLifecycle,
  canManageLearningProgramUx,
  canPublishInstructorLifecycle,
  formatInstructorLifecycleStatus,
} from "../../../../../lib/learning/instructorAuthoring";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  getBootstrapProgram,
} from "../../../../../lib/learning/instructorBootstrap";
import {
  archiveProgramAction,
  publishProgramAction,
} from "../../actions";

type PageProps = {
  params: Promise<{ programId: string }> | { programId: string };
};

export const dynamic = "force-dynamic";

export default async function InstructorProgramPage({ params }: PageProps) {
  const { programId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.program(programId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await getBootstrapProgram(supabase, programId);
  if (!loaded.ok) {
    return (
      <LearningShell
        title="Program unavailable"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Instructor workspace"
      >
        <p className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {loaded.message}
        </p>
      </LearningShell>
    );
  }

  const program = loaded.data;
  const canManage = await canManageLearningProgramUx(supabase, programId);
  const statusLabel = formatInstructorLifecycleStatus(program.status);
  const showPublish = canPublishInstructorLifecycle(program.status);
  const showArchive = canArchiveInstructorLifecycle(program.status);

  return (
    <LearningShell
      title={program.name}
      subtitle={`Program · ${statusLabel}`}
      backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      backLabel="Instructor workspace"
    >
      <p className="mt-3 text-sm text-white/60">
        Publish makes the program eligible for course publishing and enrollment
        gates. Only draft programs can be published. Archive is fail-closed for
        suspended programs.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Status
          </dt>
          <dd className="mt-1 text-lg font-bold text-white">{statusLabel}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-1 text-lg font-bold capitalize text-white">
            {program.visibility}
          </dd>
        </div>
      </dl>

      <nav className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(programId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Create course
        </Link>
      </nav>

      {canManage ? (
        <div className="mt-6 space-y-3 rounded-xl border border-white/10 p-4">
          <h2 className="text-sm font-bold text-white/70">Lifecycle</h2>
          <InstructorActionForm
            action={publishProgramAction}
            submitLabel="Publish Program"
            successMessage="Program published."
            disabled={!showPublish}
            refreshOnSuccess
          >
            <input type="hidden" name="programId" value={programId} />
            {!showPublish ? (
              <p className="text-xs text-white/45">
                Publish is available only when status is Draft.
              </p>
            ) : null}
          </InstructorActionForm>
          <InstructorActionForm
            action={archiveProgramAction}
            submitLabel="Archive Program"
            successMessage="Program archived."
            disabled={!showArchive}
            refreshOnSuccess
          >
            <input type="hidden" name="programId" value={programId} />
            {!showArchive ? (
              <p className="text-xs text-white/45">
                Archive is unavailable for this status.
              </p>
            ) : null}
          </InstructorActionForm>
        </div>
      ) : (
        <p className="mt-6 text-sm text-white/50">
          You can view this program but cannot change its lifecycle.
        </p>
      )}
    </LearningShell>
  );
}
