import type { GamesHubExperienceViewModel } from "../../../lib/games/gamesHubExperience";
import GameCard from "./GameCard";

type GamesHubProps = {
  experience: GamesHubExperienceViewModel;
};

export default function GamesHub({ experience }: GamesHubProps) {
  if (experience.uiState === "internal_error") {
    return (
      <p
        role="alert"
        className="mt-6 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
      >
        {experience.userMessage ??
          "Something went wrong loading Games. Please try again later."}
      </p>
    );
  }

  if (experience.uiState === "loading") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55"
      >
        Loading games…
      </p>
    );
  }

  if (experience.uiState === "empty_catalog") {
    return (
      <div className="mt-6 space-y-6">
        <HubIntro />
        <p
          role="status"
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55"
        >
          {experience.userMessage ?? "No games are available in the Hub yet."}
        </p>
      </div>
    );
  }

  const banner =
    experience.uiState === "maintenance" ||
    experience.uiState === "unavailable" ||
    experience.uiState === "eligibility_blocked"
      ? experience.userMessage
      : null;

  return (
    <div className="mt-6 space-y-6">
      <HubIntro />
      {banner ? (
        <p
          role="status"
          className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/90"
        >
          {banner}
        </p>
      ) : null}
      <section aria-label="Games catalog">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Catalog
        </h2>
        <ul className="mt-3 grid list-none gap-4 p-0 sm:grid-cols-1 md:grid-cols-2">
          {experience.games.map((game) => (
            <li key={game.gameId}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function HubIntro() {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
        UM Games
      </p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">Games Hub</h1>
      <p className="mt-2 max-w-xl text-sm text-white/50">
        Browse available games. Play uses Runtime eligibility only — no live
        game server or rewards in this foundation.
      </p>
    </section>
  );
}
