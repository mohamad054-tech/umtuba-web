import { redirect } from "next/navigation";
import GamesHub from "../components/games/GamesHub";
import GamesHubShell from "../components/games/GamesHubShell";
import { listGamesCatalogTrusted } from "../../lib/games/gamesCatalog";
import {
  adaptGamesCatalogToHubExperience,
  GAMES_HUB_EXPERIENCE_ROUTES,
  loadGamesHubExperienceCatalogFoundation,
} from "../../lib/games/gamesHubExperience";
import { createClient, getServerUser } from "../../lib/supabase/server";

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

  const supabase = await createClient();
  const loaded = await loadGamesHubExperienceCatalogFoundation({
    listCatalog: () => listGamesCatalogTrusted(supabase),
  });

  const experience = loaded.ok
    ? adaptGamesCatalogToHubExperience(loaded.entries)
    : adaptGamesCatalogToHubExperience([], {
        errorMessage: loaded.reason,
      });

  return (
    <GamesHubShell title="Games" subtitle="UM Games">
      <GamesHub experience={experience} />
    </GamesHubShell>
  );
}
