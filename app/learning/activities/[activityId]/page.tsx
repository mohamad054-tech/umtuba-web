import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import LearningShell from "../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadPublishedActivityGate,
} from "../../../../lib/learning/learnerDelivery";
import { LEARNING_ASSESSMENT_DELIVERY_ROUTES } from "../../../../lib/learning/assessmentDelivery";
import { startOrResumeAttemptAction } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ activityId: string }> | { activityId: string };
  searchParams?:
    | Promise<{ error?: string }>
    | { error?: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { activityId } = await Promise.resolve(params);
  void activityId;
  return { title: `Activity · Learning | UMTUBA` };
}

export default async function LearningActivityPage({
  params,
  searchParams,
}: PageProps) {
  const { activityId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LEARNER_ROUTES.activity(activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const gate = await loadPublishedActivityGate(supabase, activityId);
  if (!gate.ok) {
    notFound();
  }

  const { activity, lesson_id, active_attempt_id } = gate.data;

  return (
    <LearningShell
      title="Activity"
      subtitle={activity.name}
      backHref={LEARNING_LEARNER_ROUTES.lesson(lesson_id)}
      backLabel="Back to lesson"
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {activity.type}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{activity.name}</h1>
        {activity.description ? (
          <p className="mt-2 text-sm text-white/50">{activity.description}</p>
        ) : null}
        <p className="mt-3 text-xs text-white/40">
          {activity.hints.is_required ? "Required" : "Optional"}
          {activity.hints.max_attempts != null
            ? ` · max ${activity.hints.max_attempts} attempts`
            : ""}
          {activity.hints.time_limit_seconds != null
            ? ` · ${activity.hints.time_limit_seconds}s time limit`
            : ""}
        </p>

        {query.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {query.error}
          </p>
        ) : null}

        <form action={startOrResumeAttemptAction} className="mt-6">
          <input type="hidden" name="activityId" value={activity.id} />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {active_attempt_id ? "Resume attempt" : "Start attempt"}
          </button>
        </form>

        <p className="mt-4 text-sm text-white/50">
          <Link
            href={LEARNING_ASSESSMENT_DELIVERY_ROUTES.assessment(activity.id)}
            className="underline underline-offset-2 text-sky-300"
          >
            Preview published assessment
          </Link>
          <span className="text-white/35"> (read-only · no answering)</span>
        </p>
      </section>
    </LearningShell>
  );
}
