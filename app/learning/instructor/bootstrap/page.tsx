import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES,
  listMyInstructorSpaces,
} from "../../../../lib/learning/instructorBootstrap";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function InstructorBootstrapHubPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub)}`
    );
  }

  const query = await Promise.resolve(searchParams ?? {});
  const error = query.error?.trim() || null;
  const supabase = await createClient();
  const spaces = await listMyInstructorSpaces(supabase);

  return (
    <LearningShell
      title="Create catalog"
      subtitle="Space → Program → Course"
      backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      backLabel="Instructor workspace"
    >
      <p className="mt-4 max-w-2xl text-sm text-white/55">
        Bootstrap a learning catalog, then continue in course authoring
        (sections, lessons, activities, content). Existing RPCs only — no
        learner enrollment from this flow.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-white/70">
        <li>Create a Space (published to active automatically)</li>
        <li>Create a Program under that Space</li>
        <li>Create a Course — opens authoring</li>
      </ol>

      <div className="mt-8">
        <Link
          href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew}
          className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          Create Space
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-white">Your spaces</h2>
        {!spaces.ok ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100"
          >
            {spaces.message}
          </p>
        ) : spaces.data.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">
            No spaces yet. Create one to start a program and course.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {spaces.data.map((space) => (
              <li
                key={space.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-lg font-bold text-white">{space.name}</p>
                  <span className="text-xs uppercase tracking-wide text-white/45">
                    {space.status} · {space.mode}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">{space.slug}</p>
                {space.status === "active" ? (
                  <Link
                    href={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.programNew(
                      space.id
                    )}
                    className="mt-3 inline-block text-sm font-bold text-white underline underline-offset-2"
                  >
                    Add program
                  </Link>
                ) : (
                  <p className="mt-3 text-sm text-amber-100/80">
                    Space must be active before adding programs.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </LearningShell>
  );
}
