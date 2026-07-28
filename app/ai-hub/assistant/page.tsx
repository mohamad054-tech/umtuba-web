import { notFound, redirect } from "next/navigation";
import AiAssistantEntryPanel from "../../components/ai-hub/AiAssistantEntryPanel";
import AiHubShell from "../../components/ai-hub/AiHubShell";
import { loadAiHubExperienceAction } from "../../actions/aiHub";
import { isAiHubExperienceAvailable } from "../../../lib/ai/hub/experience";

export const dynamic = "force-dynamic";

/**
 * AI Assistant Entry — no conversation execution.
 */
export default async function AiHubAssistantEntryPage() {
  if (!isAiHubExperienceAvailable()) {
    notFound();
  }

  const result = await loadAiHubExperienceAction();
  if (!result.ok) {
    if (result.code === "hub_disabled") {
      notFound();
    }
    if (result.code === "unauthenticated") {
      redirect(`/login?next=${encodeURIComponent("/ai-hub/assistant")}`);
    }
    return (
      <AiHubShell
        title="AI Assistant"
        subtitle="Entry unavailable."
        active="assistant"
      >
        <p role="alert" className="text-sm text-rose-200">
          {result.message}
        </p>
      </AiHubShell>
    );
  }

  const entry = result.snapshot.assistantEntry;
  if (!entry) {
    notFound();
  }

  return (
    <AiHubShell
      title="AI Assistant"
      subtitle="Entry only — chat and conversations are not started here."
      active="assistant"
    >
      <AiAssistantEntryPanel entry={entry} asDestination />
    </AiHubShell>
  );
}
