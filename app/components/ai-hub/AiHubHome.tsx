import AiAssistantEntryPanel from "./AiAssistantEntryPanel";
import AiCapabilityCards from "./AiCapabilityCards";
import AiFavoritesSection from "./AiFavoritesSection";
import AiHubModuleGrid from "./AiHubModuleGrid";
import AiRecentActivitySection from "./AiRecentActivitySection";
import AiRecommendationsSection from "./AiRecommendationsSection";
import AiStatusCards from "./AiStatusCards";
import type { AiHubHomeViewModel } from "../../../lib/ai/hub/experience";

type Props = {
  model: AiHubHomeViewModel;
};

export default function AiHubHome({ model }: Props) {
  return (
    <div className="space-y-2">
      <AiHubModuleGrid items={model.navigation} />
      <div className="mt-8">
        <AiAssistantEntryPanel entry={model.assistantEntry} />
      </div>
      <AiStatusCards status={model.runtimeStatus} />
      <AiRecommendationsSection recommendations={model.recommendations} />
      <AiRecentActivitySection activity={model.recentActivity} />
      <AiFavoritesSection favorites={model.favorites} />
      <AiCapabilityCards capabilities={model.capabilities} />
    </div>
  );
}
