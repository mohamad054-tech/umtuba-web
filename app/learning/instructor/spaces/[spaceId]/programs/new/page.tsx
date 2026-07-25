import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import BootstrapField, {
  bootstrapInputClass,
  bootstrapSelectClass,
} from "../../../../../../components/learning/instructor/BootstrapField";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  getBootstrapSpace,
  listProgramsForSpace,
} from "../../../../../../../lib/learning/instructorBootstrap";
import { LEARNING_PROGRAM_FORMATS } from "../../../../../../../lib/learning/programsFoundation";
import { createProgramBootstrapAction } from "../../../../bootstrapActions";

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
        LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(spaceId)
      )}`
    );
  }

  const supabase = await createClient();
  const space = await getBootstrapSpace(supabase, spaceId);
  if (!space.ok) {
    if (space.message.toLowerCase().includes("not found")) notFound();
    redirect(
      `${LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub}?error=${encodeURIComponent(space.message)}`
    );
  }

  const programs = await listProgramsForSpace(supabase, spaceId);
  const error = query.error?.trim() || null;

  return (
    <LearningShell
      title="Create Program"
      subtitle={`Step 2 of 3 · ${space.data.name}`}
      backHref={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub}
      backLabel="Create catalog"
    >
      {space.data.status !== "active" ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-100"
        >
          This space is {space.data.status}. Programs require an active space.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {programs.ok && programs.data.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">
            Existing programs
          </h2>
          <ul className="mt-2 space-y-2">
            {programs.data.map((program) => (
              <li key={program.id} className="text-sm text-white/70">
                <Link
                  href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.courseNew(
                    program.id
                  )}
                  className="font-bold text-white underline underline-offset-2"
                >
                  {program.name}
                </Link>
                <span className="text-white/40">
                  {" "}
                  · {program.status} · add course
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form
        action={createProgramBootstrapAction}
        className="mt-6 max-w-xl space-y-4"
      >
        <input type="hidden" name="spaceId" value={spaceId} />
        <BootstrapField label="Name" required>
          <input
            name="name"
            required
            maxLength={160}
            className={bootstrapInputClass}
            placeholder="Product Design Track"
          />
        </BootstrapField>
        <BootstrapField label="Format" required>
          <select
            name="format"
            required
            defaultValue="self_paced"
            className={bootstrapSelectClass}
          >
            {LEARNING_PROGRAM_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format.replaceAll("_", " ")}
              </option>
            ))}
          </select>
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
          disabled={space.data.status !== "active"}
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-40"
        >
          Create &amp; continue
        </button>
      </form>
    </LearningShell>
  );
}
