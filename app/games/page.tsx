import AppTopNav from "../components/AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { buildLocalizedRouteMetadata } from "../../lib/site/localizedSeo";
import GamesCatalog from "./GamesCatalog";
import "./play/games-play.css";

export async function generateMetadata() {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "games",
    path: "/games",
    locale,
  });
}

export default async function GamesHubPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  return (
    <main
      className={`um-games-shell relative min-h-screen text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav title={t("games.title")} subtitle={t("games.subtitle")} sticky />
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <GamesCatalog />
      </div>
    </main>
  );
}
