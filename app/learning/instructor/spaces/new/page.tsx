import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import BootstrapField, {
  bootstrapInputClass,
  bootstrapSelectClass,
} from "../../../../components/learning/instructor/BootstrapField";
import { getServerUser } from "../../../../../lib/supabase/server";
import { LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES } from "../../../../../lib/learning/instructorBootstrap";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../lib/learning/instructorAuthoring";
import { LEARNING_SPACE_MODES } from "../../../../../lib/learning/spacesFoundation";
import { createSpaceBootstrapAction } from "../../bootstrapActions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewInstructorSpacePage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.spaceNew)}`
    );
  }

  const query = await Promise.resolve(searchParams ?? {});
  const error = query.error?.trim() || null;

  return (
    <LearningShell
      title="Create Space"
      subtitle="Step 1 of 3"
      backHref={LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub}
      backLabel="Create catalog"
    >
      <p className="mt-3 text-sm text-white/55">
        Creates a draft space, then publishes it to active so you can add a
        program next.
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
        action={createSpaceBootstrapAction}
        className="mt-6 max-w-xl space-y-4"
      >
        <BootstrapField label="Name" required>
          <input
            name="name"
            required
            maxLength={120}
            className={bootstrapInputClass}
            placeholder="Acme Academy"
          />
        </BootstrapField>
        <BootstrapField
          label="Slug"
          hint="Optional — derived from name if empty (lowercase, hyphens)."
        >
          <input
            name="slug"
            maxLength={64}
            className={bootstrapInputClass}
            placeholder="acme-academy"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
        </BootstrapField>
        <BootstrapField label="Mode" required>
          <select
            name="mode"
            required
            defaultValue="general_academy"
            className={bootstrapSelectClass}
          >
            {LEARNING_SPACE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode.replaceAll("_", " ")}
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
            maxLength={4000}
            className={bootstrapInputClass}
          />
        </BootstrapField>
        <input type="hidden" name="default_language" value="en" />
        <button
          type="submit"
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          Create &amp; continue
        </button>
        <p className="text-xs text-white/40">
          Or{" "}
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.hub}
            className="underline underline-offset-2"
          >
            back to workspace
          </Link>
          .
        </p>
      </form>
    </LearningShell>
  );
}
