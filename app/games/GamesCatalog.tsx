"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useI18n } from "../components/i18n";
import {
  PLAYABLE_GAMES,
  gamesPlayPath,
} from "../../lib/games/play/catalog";
import { formatPlayNumber } from "../../lib/games/play/engine";
import {
  GAMES_BEST_STORAGE_KEY,
  parseBestMap,
} from "../../lib/games/play/scores";
import "./play/games-play.css";

function subscribeBests(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GAMES_BEST_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function bestsRaw(): string {
  if (typeof window === "undefined") return "{}";
  return window.localStorage.getItem(GAMES_BEST_STORAGE_KEY) ?? "{}";
}

export default function GamesCatalog() {
  const { t, locale } = useI18n();
  const raw = useSyncExternalStore(subscribeBests, bestsRaw, () => "{}");
  const bests = parseBestMap(raw);

  return (
    <div className="um-play-root">
      <p className="um-play-card-kicker">{t("games.catalogEyebrow")}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{t("games.title")}</h1>
      <p className="mt-3 mb-6 text-sm leading-7 text-white/55">{t("games.subtitle")}</p>
      <ul className="um-play-catalog">
        {PLAYABLE_GAMES.map((game) => {
          const best = bests[game.slug];
          return (
            <li key={game.slug}>
              <Link href={gamesPlayPath(game.slug)} className="um-play-card" data-game-card={game.slug}>
                <h2>{t(game.titleKey)}</h2>
                <p>{t(game.blurbKey)}</p>
                <div className="um-play-card-meta">
                  <span className="um-play-card-best">
                    {typeof best === "number"
                      ? t("games.localBest", {
                          values: { score: formatPlayNumber(locale, best) },
                        })
                      : t("games.localBestEmpty")}
                  </span>
                  <span className="um-play-card-cta">{t("games.play")}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
