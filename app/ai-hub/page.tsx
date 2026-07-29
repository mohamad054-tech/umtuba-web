import { notFound, redirect } from "next/navigation";
import AiHubHome from "../components/ai-hub/AiHubHome";
import AiHubShell from "../components/ai-hub/AiHubShell";
import { loadAiHubExperienceAction } from "../actions/aiHub";
import {
  isAiHubExperienceAvailable,
  toAiHubHomeViewModel,
} from "../../lib/ai/hub/experience";

export const dynamic = "force-dynamic";

/**
 * AI Hub Home — foundation experience.
 * Unavailable when UMTUBA_AI_HUB is OFF (default).
 */
export default async function AiHubHomePage() {
  if (!isAiHubExperienceAvailable()) {
    notFound();
  }

  const result = await loadAiHubExperienceAction();
  if (!result.ok) {
    if (result.code === "hub_disabled") {
      notFound();
    }
    if (result.code === "unauthenticated") {
      redirect(`/login?next=${encodeURIComponent("/ai-hub")}`);
    }
    return (
      <AiHubShell title="AI Hub" subtitle="Could not load Hub snapshot.">
        <p role="alert" className="text-sm text-rose-200">
          {result.message}
        </p>
      </AiHubShell>
    );
  }

  const model = toAiHubHomeViewModel(result.snapshot);
  if (!model) {
    notFound();
  }

  return (
    <AiHubShell
      title="AI Hub"
      subtitle="Your gateway to every UMTUBA intelligence surface."
      active="home"
    >
      <AiHubHome model={model} />
    </AiHubShell>
  );
}
