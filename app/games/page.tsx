import GamesHub from "../components/games/GamesHub";
import GamesHubShell from "../components/games/GamesHubShell";
import { APP_ROUTES } from "../lib/nav";
import { adaptGamesCatalogToHubExperience } from "../../lib/games/gamesHubExperience";
import { gamesMetadata } from "../../lib/site/routeMetadata";

export const metadata = gamesMetadata;

/**
 * Public Games entry — Option A empty-foundation Shell→Hub.
 * Authority closed: grantsRewards=false; no runtime/playable activation.
 */
export default function GamesHubPage() {
  const experience = adaptGamesCatalogToHubExperience([]);

  return (
    <GamesHubShell
      title="Games"
      subtitle="UMTUBA Games hub"
      backHref={APP_ROUTES.home}
      backLabel="Back to Home"
    >
      <GamesHub experience={experience} />
    </GamesHubShell>
  );
}
