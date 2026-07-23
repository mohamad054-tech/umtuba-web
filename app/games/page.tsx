import { redirect } from "next/navigation";
import GamesHub from "../components/games/GamesHub";
import GamesHubShell from "../components/games/GamesHubShell";
import { getServerUser } from "../../lib/supabase/server";
import {
  adaptGamesCatalogToHubExperience,
  GAMES_HUB_EXPERIENCE_ROUTES,
  loadGamesHubExperienceCatalogFoundation,
} from "../../lib/games/gamesHubExperience";

export const metadata = {
  title: "Games Hub | UMTUBA",
};

export const dynamic = "force-dynamic";

export default async function GamesHubPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(GAMES_HUB_EXPERIENCE_ROUTES.hub)}`
    );
  }

  const loaded = loadGamesHubExperienceCatalogFoundation();
  const experience = adaptGamesCatalogToHubExperience(loaded.entries);

  return (
    <GamesHubShell title="Games" subtitle="UM Games">
      <GamesHub experience={experience} />
    </GamesHubShell>
  );
}
