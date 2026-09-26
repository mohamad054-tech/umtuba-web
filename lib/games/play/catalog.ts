import type { TranslationKey } from "../../i18n/messages/types";

export const PLAYABLE_GAME_SLUGS = [
  "sudoku",
  "g2048",
  "snake",
  "memory",
  "xo",
  "hanoi",
  "lesson-quiz",
  "guess-city",
  "landmark",
  "collector",
  "price",
  "wheel",
  "basket",
  "hangword",
  "flag-guess",
  "farther-pair",
  "larger-country",
  "cheaper",
  "sort-price",
  "guess-discount",
  "quick-q",
  "order-steps",
  "match-term",
  "vocab",
  "fill-blank",
  "solitaire",
  "shapes",
  "typerace",
  "uno",
  "marble-chain",
  "wood-blocks",
  "untangle-ropes",
  "falling-blocks",
] as const;

export type PlayableGameSlug = (typeof PLAYABLE_GAME_SLUGS)[number];

/**
 * سلسلة الكرات stays in the repo but is hidden from the catalogue and its page.
 * Flip this to true to show the tile and open /games/marble-chain again.
 * Later rebuild, not started: if the balls meeting at a gap are the same color,
 * the front rolls back and joins. If they differ, the gap stays, the front stops,
 * and the rear keeps moving until it catches up so the player can shoot into the gap.
 */
export const MARBLE_CHAIN_VISIBLE = false;

function isListedGame(slug: string): boolean {
  if (slug === "marble-chain") return MARBLE_CHAIN_VISIBLE;
  return true;
}

export type PlayableGame = {
  slug: PlayableGameSlug;
  titleKey: TranslationKey;
  blurbKey: TranslationKey;
  arabicContent?: boolean;
  demoData?: boolean;
};

export const PLAYABLE_GAMES: readonly PlayableGame[] = [
  { slug: "sudoku", titleKey: "games.sudoku.title", blurbKey: "games.sudoku.blurb" },
  { slug: "g2048", titleKey: "games.g2048.title", blurbKey: "games.g2048.blurb" },
  { slug: "snake", titleKey: "games.snake.title", blurbKey: "games.snake.blurb" },
  { slug: "memory", titleKey: "games.memory.title", blurbKey: "games.memory.blurb" },
  { slug: "xo", titleKey: "games.xo.title", blurbKey: "games.xo.blurb" },
  { slug: "hanoi", titleKey: "games.hanoi.title", blurbKey: "games.hanoi.blurb" },
  { slug: "lesson-quiz", titleKey: "games.lesson-quiz.title", blurbKey: "games.lesson-quiz.blurb", arabicContent: true },
  { slug: "guess-city", titleKey: "games.guess-city.title", blurbKey: "games.guess-city.blurb" },
  { slug: "landmark", titleKey: "games.landmark.title", blurbKey: "games.landmark.blurb", arabicContent: true },
  { slug: "collector", titleKey: "games.collector.title", blurbKey: "games.collector.blurb" },
  { slug: "price", titleKey: "games.price.title", blurbKey: "games.price.blurb", demoData: true },
  { slug: "wheel", titleKey: "games.wheel.title", blurbKey: "games.wheel.blurb", demoData: true },
  { slug: "basket", titleKey: "games.basket.title", blurbKey: "games.basket.blurb", demoData: true },
  { slug: "hangword", titleKey: "games.hangword.title", blurbKey: "games.hangword.blurb", arabicContent: true },
  { slug: "flag-guess", titleKey: "games.flag-guess.title", blurbKey: "games.flag-guess.blurb" },
  { slug: "farther-pair", titleKey: "games.farther-pair.title", blurbKey: "games.farther-pair.blurb" },
  { slug: "larger-country", titleKey: "games.larger-country.title", blurbKey: "games.larger-country.blurb" },
  { slug: "cheaper", titleKey: "games.cheaper.title", blurbKey: "games.cheaper.blurb", demoData: true },
  { slug: "sort-price", titleKey: "games.sort-price.title", blurbKey: "games.sort-price.blurb", demoData: true },
  { slug: "guess-discount", titleKey: "games.guess-discount.title", blurbKey: "games.guess-discount.blurb", demoData: true },
  { slug: "quick-q", titleKey: "games.quick-q.title", blurbKey: "games.quick-q.blurb", arabicContent: true },
  { slug: "order-steps", titleKey: "games.order-steps.title", blurbKey: "games.order-steps.blurb", arabicContent: true },
  { slug: "match-term", titleKey: "games.match-term.title", blurbKey: "games.match-term.blurb", arabicContent: true },
  { slug: "vocab", titleKey: "games.vocab.title", blurbKey: "games.vocab.blurb", arabicContent: true },
  { slug: "fill-blank", titleKey: "games.fill-blank.title", blurbKey: "games.fill-blank.blurb", arabicContent: true },
  { slug: "solitaire", titleKey: "games.solitaire.title", blurbKey: "games.solitaire.blurb" },
  { slug: "shapes", titleKey: "games.shapes.title", blurbKey: "games.shapes.blurb" },
  { slug: "typerace", titleKey: "games.typerace.title", blurbKey: "games.typerace.blurb", arabicContent: true },
  { slug: "uno", titleKey: "games.uno.title", blurbKey: "games.uno.blurb" },
  { slug: "marble-chain", titleKey: "games.marble-chain.title", blurbKey: "games.marble-chain.blurb" },
  { slug: "wood-blocks", titleKey: "games.wood-blocks.title", blurbKey: "games.wood-blocks.blurb" },
  { slug: "untangle-ropes", titleKey: "games.untangle-ropes.title", blurbKey: "games.untangle-ropes.blurb" },
  { slug: "falling-blocks", titleKey: "games.falling-blocks.title", blurbKey: "games.falling-blocks.blurb" },
] as const;

export function isPlayableGameSlug(value: string): value is PlayableGameSlug {
  return (PLAYABLE_GAME_SLUGS as readonly string[]).includes(value) && isListedGame(value);
}

export function getPlayableGame(slug: string): PlayableGame | null {
  if (!isPlayableGameSlug(slug)) return null;
  return PLAYABLE_GAMES.find((game) => game.slug === slug) ?? null;
}

export function gamesPlayPath(slug: PlayableGameSlug): string {
  return `/games/${slug}`;
}

/** Owner artwork tiles under /public/games/art/{slug}.webp */
export const GAME_ARTWORK_SLUGS = [
  "sudoku",
  "snake",
  "g2048",
  "memory",
  "xo",
  "hanoi",
  "solitaire",
  "uno",
  "wheel",
  "shapes",
  "typerace",
  "hangword",
  "guess-city",
  "marble-chain",
] as const satisfies readonly PlayableGameSlug[];

export type GameArtworkSlug = (typeof GAME_ARTWORK_SLUGS)[number];

export function hasGameArtwork(slug: PlayableGameSlug): slug is GameArtworkSlug {
  return (GAME_ARTWORK_SLUGS as readonly string[]).includes(slug);
}

export function gameArtworkSrc(slug: PlayableGameSlug): `/games/art/${GameArtworkSlug}.webp` | null {
  if (!hasGameArtwork(slug)) return null;
  return `/games/art/${slug}.webp`;
}
