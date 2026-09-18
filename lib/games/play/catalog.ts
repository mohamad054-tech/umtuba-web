import type { TranslationKey } from "../../i18n/messages/types";

export const PLAYABLE_GAME_SLUGS = [
  "sudoku",
  "g2048",
  "snake",
  "memory",
  "xo",
  "hanoi",
] as const;

export type PlayableGameSlug = (typeof PLAYABLE_GAME_SLUGS)[number];

export type PlayableGame = {
  slug: PlayableGameSlug;
  titleKey: TranslationKey;
  blurbKey: TranslationKey;
};

export const PLAYABLE_GAMES: readonly PlayableGame[] = [
  {
    slug: "sudoku",
    titleKey: "games.sudoku.title",
    blurbKey: "games.sudoku.blurb",
  },
  {
    slug: "g2048",
    titleKey: "games.g2048.title",
    blurbKey: "games.g2048.blurb",
  },
  {
    slug: "snake",
    titleKey: "games.snake.title",
    blurbKey: "games.snake.blurb",
  },
  {
    slug: "memory",
    titleKey: "games.memory.title",
    blurbKey: "games.memory.blurb",
  },
  {
    slug: "xo",
    titleKey: "games.xo.title",
    blurbKey: "games.xo.blurb",
  },
  {
    slug: "hanoi",
    titleKey: "games.hanoi.title",
    blurbKey: "games.hanoi.blurb",
  },
] as const;

export function isPlayableGameSlug(value: string): value is PlayableGameSlug {
  return (PLAYABLE_GAME_SLUGS as readonly string[]).includes(value);
}

export function getPlayableGame(slug: string): PlayableGame | null {
  return PLAYABLE_GAMES.find((game) => game.slug === slug) ?? null;
}

export function gamesPlayPath(slug: PlayableGameSlug): string {
  return `/games/${slug}`;
}
