import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../components/learning/LearningShell";
import AttemptPlayer from "../../../components/learning/AttemptPlayer";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  getMyLearningAttemptView,
} from "../../../../lib/learning/learnerDelivery";
import { getMyLearningAttemptResultView } from "../../../../lib/learning/learnerResultDelivery";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ attemptId: string }> | { attemptId: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { attemptId } = await Promise.resolve(params);
  void attemptId;
  return { title: `Attempt · Learning | UMTUBA` };
}

export default async function LearningAttemptPage({ params }: PageProps) {
  const { attemptId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_LEARNER_ROUTES.attempt(attemptId)
      )}`
    );
  }

  const supabase = await createClient();
  const attempt = await getMyLearningAttemptView(supabase, attemptId);
  if (!attempt.ok) {
    notFound();
  }

  const result =
    attempt.data.status === "submitted"
      ? await getMyLearningAttemptResultView(supabase, attemptId)
      : null;

  const { data: activity } = await supabase
    .from("learning_activities")
    .select("name")
    .eq("id", attempt.data.activity_id)
    .maybeSingle();

  return (
    <LearningShell
      title="Attempt"
      subtitle={activity?.name ?? "Activity"}
      backHref={LEARNING_LEARNER_ROUTES.activity(attempt.data.activity_id)}
      backLabel="Activity"
    >
      <AttemptPlayer
        initial={attempt.data}
        activityName={activity?.name ?? undefined}
        initialResult={result?.ok ? result.data : null}
      />
    </LearningShell>
  );
}
