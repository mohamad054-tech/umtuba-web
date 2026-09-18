import Link from "next/link";
import { notFound } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import {
  PLAYABLE_GAME_SLUGS,
  getPlayableGame,
  isPlayableGameSlug,
} from "../../../lib/games/play/catalog";
import { buildPageMetadata } from "../../../lib/site/metadata";
import GamePlayClient from "../play/GamePlayClient";
import "../play/games-play.css";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return PLAYABLE_GAME_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const { locale } = await resolveRequestLocale();
  const game = getPlayableGame(slug);
  if (!game) {
    return { robots: { index: false, follow: false } };
  }
  const t = createTranslator(locale);
  return buildPageMetadata({
    title: `${t(game.titleKey)} — ${t("games.title")}`,
    description: t(game.blurbKey),
    path: `/games/${slug}`,
    index: "noindex",
    locale,
  });
}

export default async function GamePlayPage({ params }: Props) {
  const { slug } = await params;
  if (!isPlayableGameSlug(slug)) notFound();

  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const game = getPlayableGame(slug);
  if (!game) notFound();

  return (
    <main
      className={`um-games-shell relative min-h-screen text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <AppTopNav
        title={t(game.titleKey)}
        subtitle={t("games.subtitle")}
        sticky
        actions={
          <Link
            href={APP_ROUTES.games}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80"
          >
            {t("games.backToCatalog")}
          </Link>
        }
      />
      <div className="mx-auto max-w-5xl min-w-0 px-4 py-8 sm:px-5 md:px-8">
        <h2 className="mb-4 text-2xl font-black tracking-tight">{t(game.titleKey)}</h2>
        <GamePlayClient slug={slug} />
      </div>
    </main>
  );
}
