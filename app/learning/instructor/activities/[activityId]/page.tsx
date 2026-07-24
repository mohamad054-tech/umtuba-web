import { notFound, redirect } from "next/navigation";
import InstructorShell from "../../../../components/learning/instructor/InstructorShell";
import ActivityLifecycleActions from "../../../../components/learning/instructor/ActivityLifecycleActions";
import ActivityStatusChip from "../../../../components/learning/instructor/ActivityStatusChip";
import UpdateActivityForm from "../../../../components/learning/instructor/UpdateActivityForm";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  getInstructorActivity,
  getInstructorLesson,
} from "../../../../../lib/learning/instructorAuthoring";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
  searchParams?:
    | Promise<{ error?: string; notice?: string }>
    | { error?: string; notice?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { activityId } = await Promise.resolve(params);
  void activityId;
  return { title: "Activity · Instructor | UM Learning" };
}

export default async function InstructorActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_INSTRUCTOR_ROUTES.activity(activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const activity = await getInstructorActivity(supabase, activityId);
  if (!activity.ok) {
    if (activity.message.toLowerCase().includes("not found")) notFound();
    return (
      <InstructorShell
        title="Activity"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Spaces"
      >
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {activity.message}
        </p>
      </InstructorShell>
    );
  }

  const lesson = await getInstructorLesson(
    supabase,
    activity.data.lesson_id
  );
  const backHref = lesson.ok
    ? LEARNING_INSTRUCTOR_ROUTES.lesson(lesson.data.id)
    : LEARNING_INSTRUCTOR_ROUTES.hub;
  const backLabel = lesson.ok ? lesson.data.name : "Lessons";

  return (
    <InstructorShell
      title={activity.data.name}
      subtitle="Learning activity"
      backHref={backHref}
      backLabel={backLabel}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {activity.data.name}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            /{activity.data.slug} · {activity.data.type}
          </p>
        </div>
        <ActivityStatusChip status={activity.data.status} />
      </div>

      {activity.data.description ? (
        <p className="mt-4 text-sm text-white/65">
          {activity.data.description}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Completion mode
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {activity.data.completion_mode}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Visibility
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {activity.data.visibility}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Position
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            #{activity.data.position}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <dt className="text-xs uppercase tracking-wide text-white/40">
            Type
          </dt>
          <dd className="mt-0.5 font-medium text-white/85">
            {activity.data.type}
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

      {query.error?.trim() ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error.trim()}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Lifecycle
        </h2>
        <ActivityLifecycleActions activity={activity.data} />
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-white/50">
          Edit
        </h2>
        <UpdateActivityForm activity={activity.data} />
      </div>
    </InstructorShell>
  );
}
