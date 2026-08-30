import { notFound, redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import BootstrapField, {
  bootstrapInputClass,
  bootstrapSelectClass,
} from "../../../../../../components/learning/instructor/BootstrapField";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  getBootstrapProgram,
} from "../../../../../../../lib/learning/instructorBootstrap";
import { createCourseBootstrapAction } from "../../../../bootstrapActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewInstructorCoursePage({
  params,
  searchParams,
}: PageProps) {
  const { programId } = await Promise.resolve(params);
  const query = (await searchParams) ?? {};
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(programId)
      )}`
    );
  }

  const supabase = await createClient();
  const program = await getBootstrapProgram(supabase, programId);
  if (!program.ok) {
    if (program.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub}?error=${encodeURIComponent(program.message)}`
    );
  }

  const error = query.error?.trim() || null;

  return (
    <LearningShell
      title="Create Course"
      subtitle={`Step 3 of 3 · ${program.data.name}`}
      backHref={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(
        program.data.space_id
      )}
      backLabel="Back to program"
    >
      <p className="mt-3 text-sm text-white/55">
        After create you will open course authoring (sections, lessons,
        activities, content blocks).
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      <form
        action={createCourseBootstrapAction}
        className="mt-6 max-w-xl space-y-4"
      >
        <input type="hidden" name="programId" value={programId} />
        <BootstrapField label="Name" required>
          <input
            name="name"
            required
            maxLength={160}
            className={bootstrapInputClass}
            placeholder="Foundations of UX"
          />
        </BootstrapField>
        <BootstrapField label="Visibility">
          <select
            name="visibility"
            defaultValue="private"
            className={bootstrapSelectClass}
          >
            <option value="private">private</option>
            <option value="unlisted">unlisted</option>
            <option value="public">public</option>
          </select>
        </BootstrapField>
        <BootstrapField label="Description">
          <textarea
            name="description"
            rows={3}
            maxLength={8000}
            className={bootstrapInputClass}
          />
        </BootstrapField>
        <input type="hidden" name="default_language" value="en" />
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          Create course &amp; open authoring
        </button>
      </form>
    </LearningShell>
  );
}
