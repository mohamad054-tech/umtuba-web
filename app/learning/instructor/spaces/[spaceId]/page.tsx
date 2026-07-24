import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import SpaceLifecycleActions from "../../../../components/learning/instructor/SpaceLifecycleActions";
import SpaceStatusChip from "../../../../components/learning/instructor/SpaceStatusChip";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorSpace,
} from "../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ spaceId: string }> | { spaceId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { spaceId } = await Promise.resolve(params);
  void spaceId;
  return { title: "Space · Instructor | UM Learning" };
}

export default async function InstructorSpacePage({
  params,
  searchParams,
}: PageProps) {
  const { spaceId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.space(spaceId)
      )}`
    );
  }

  const supabase = await createClient();
  const space = await getInstructorSpace(supabase, spaceId);
  if (!space.ok) {
    if (space.message.toLowerCase().includes("not found")) {
      notFound();
    }
    return (
      <InstructorShell
        title="Space"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {space.message}
        </p>
      </InstructorShell>
    );
  }

  const errorMessage = query.error?.trim() || null;
  const notice = query.notice?.trim() || null;

  return (
    <InstructorShell
      title={space.data.name}
      subtitle="Learning space"
      backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      backLabel="Spaces"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{space.data.name}</h1>
          <p className="mt-1 text-sm text-white/50">/{space.data.slug}</p>
        </div>
        <SpaceStatusChip status={space.data.status} />
      </div>

      {space.data.description ? (
        <p className="mt-4 text-sm text-white/65">{space.data.description}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">Mode</dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {space.data.mode.replaceAll("_", " ")}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {space.data.visibility}
          </dd>
        </div>
      </dl>

      {notice ? (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Lifecycle
        </h2>
        <SpaceLifecycleActions
          space={space.data}
          errorMessage={errorMessage}
        />
      </div>
    </InstructorShell>
  );
}
