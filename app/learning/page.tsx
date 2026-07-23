import { redirect } from "next/navigation";
import LearningShell from "../components/learning/LearningShell";
import LearningHub from "../components/learning/LearningHub";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  LEARNING_LEARNER_ROUTES,
  loadMyLearningHub,
} from "../../lib/learning/learnerDelivery";

export const metadata = {
  title: "My Learning | UMTUBA",
};

export const dynamic = "force-dynamic";

export default async function LearningHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_LEARNER_ROUTES.hub)}`
    );
  }

  const supabase = await createClient();
  const hub = await loadMyLearningHub(supabase, user.id);

  return (
    <LearningShell title="Learning" subtitle="My Learning">
      {hub.ok ? (
        <LearningHub hub={hub.data} />
      ) : (
        <p
          role="alert"
          className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {hub.message}
        </p>
      )}
    </LearningShell>
  );
}
