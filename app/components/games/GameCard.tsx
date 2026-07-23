"use client";

import { useId, useState } from "react";
import {
  evaluateGamesHubPlayAction,
  type GamesHubCardViewModel,
} from "../../../lib/games/gamesHubExperience";

type GameCardProps = {
  game: GamesHubCardViewModel;
};

function statusLabel(game: GamesHubCardViewModel): string {
  if (game.maintenanceStatus === "active") return "Maintenance";
  if (game.availability === "coming_soon") return "Coming soon";
  if (game.availability === "unavailable") return "Unavailable";
  if (game.availability === "available" && game.canPlay) return "Available";
  return game.disabledReason ?? "Unavailable";
}

export default function GameCard({ game }: GameCardProps) {
  const titleId = useId();
  const descId = useId();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function onPlay() {
    const result = evaluateGamesHubPlayAction({ card: game });
    setActionMessage(result.message);
  }

  const playEnabled = game.canPlay;

  return (
    <article
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="flex flex-col rounded-2xl border border-white/10 bg-[#080816]/70 p-4 md:p-5"
    >
      <div className="flex gap-4">
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-xl font-black text-white/70"
        >
          {game.imagePlaceholderLabel}
        </div>
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-lg font-black tracking-tight">
            {game.title}
          </h3>
          <p id={descId} className="mt-1 text-sm text-white/55">
            {game.shortDescription}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/45 sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Category</dt>
          <dd className="mt-0.5 font-semibold text-white/70 capitalize">
            {game.category}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Status</dt>
          <dd className="mt-0.5 font-semibold text-white/70">{statusLabel(game)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Players</dt>
          <dd className="mt-0.5 font-semibold text-white/70">
            {game.playerCountLabel}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Mode</dt>
          <dd className="mt-0.5 font-semibold text-white/70 capitalize">
            {game.supportedMode}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">
            Maintenance
          </dt>
          <dd className="mt-0.5 font-semibold text-white/70 capitalize">
            {game.maintenanceStatus === "none" ? "None" : game.maintenanceStatus}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Channel</dt>
          <dd className="mt-0.5 font-semibold text-white/70 capitalize">
            {game.releaseChannel}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {playEnabled ? (
          <button
            type="button"
            onClick={onPlay}
            className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white px-4 text-sm font-bold text-black transition hover:bg-white/90"
          >
            Play
          </button>
        ) : (
          <p
            role="status"
            className="inline-flex min-h-11 items-center rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-white/50"
          >
            {game.disabledReason ?? "Unavailable"}
          </p>
        )}
      </div>

      {actionMessage ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60"
        >
          {actionMessage}
        </p>
      ) : null}
    </article>
  );
}
