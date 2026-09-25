"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import GameArt from "../../games/play/GameArt";
import { gamesPlayPath, type PlayableGameSlug } from "../../../lib/games/play/catalog";

type DiscoverGameBreakCardProps = {
  slug: PlayableGameSlug;
  title: string;
};

/** Full-screen feed stop. Swipe continues; this card does not play or mark a video. */
export default function DiscoverGameBreakCard({
  slug,
  title,
}: DiscoverGameBreakCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black px-8 text-center text-white">
      <p className="text-xs font-black tracking-[0.18em] text-[#f0a93b]">
        {t("feed.gameBreak.title")}
      </p>
      <div className="h-36 w-36 overflow-hidden rounded-3xl border border-[#f0a93b]/40 [&_img]:h-full [&_img]:w-full [&_img]:object-cover" dir="ltr">
        <GameArt slug={slug} alt={title} priority />
      </div>
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-1 text-sm text-white/75">{t("feed.gameBreak.round")}</p>
      </div>
      <Link
        href={gamesPlayPath(slug)}
        className="watch-focus-ring rounded-full bg-[#f0a93b] px-5 py-2.5 text-sm font-black text-[#0c1842]"
      >
        {t("feed.gameBreak.play")}
      </Link>
      <p className="text-xs text-white/55">{t("feed.gameBreak.swipe")}</p>
    </div>
  );
}
