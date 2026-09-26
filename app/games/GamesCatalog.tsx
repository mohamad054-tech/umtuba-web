"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useI18n } from "../components/i18n";
import {
  PLAYABLE_GAMES,
  gameArtworkSrc,
  gamesPlayPath,
  isPlayableGameSlug,
} from "../../lib/games/play/catalog";
import { formatPlayNumber } from "../../lib/games/play/engine";
import {
  GAMES_BEST_STORAGE_KEY,
  parseBestMap,
} from "../../lib/games/play/scores";
import GameArt from "./play/GameArt";
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
      <ul className="um-play-catalog" data-catalog-grid="true">
        {PLAYABLE_GAMES.filter((game) => isPlayableGameSlug(game.slug)).map((game, index) => {
          const best = bests[game.slug];
          const photo = Boolean(gameArtworkSrc(game.slug));
          return (
            <li key={game.slug}>
              <Link
                href={gamesPlayPath(game.slug)}
                className="um-play-card"
                data-game-card={game.slug}
              >
                <span
                  className="um-play-card-art"
                  aria-hidden={photo ? undefined : true}
                  dir="ltr"
                >
                  <GameArt
                    slug={game.slug}
                    alt={photo ? t(game.titleKey) : ""}
                    priority={index < 4}
                    loading={index < 8 ? "eager" : "lazy"}
                  />
                </span>
                <span className="um-play-card-copy">
                  <h2>{t(game.titleKey)}</h2>
                  <p>{t(game.blurbKey)}</p>
                  {game.arabicContent || game.demoData ? (
                    <span className="um-play-card-tags">
                      {game.arabicContent ? (
                        <span data-game-tag="arabic">{t("games.arabicContent")}</span>
                      ) : null}
                      {game.demoData ? (
                        <span data-game-tag="demo">{t("games.demoData")}</span>
                      ) : null}
                    </span>
                  ) : null}
                  <span className="um-play-card-best" data-game-best={game.slug}>
                    {typeof best === "number"
                      ? t("games.localBest", {
                          values: { score: formatPlayNumber(locale, best) },
                        })
                      : t("games.localBestEmpty")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
