"use client";

import type { JSX } from "react";
import { GameAnalyticsScope } from "../../../lib/analytics/gameScope";
import type { PlayableGameSlug } from "../../../lib/games/play/catalog";
import "./games-play.css";
import {
  BasketGame,
  CheaperGame,
  CollectorGame,
  FartherPairGame,
  HangwordGame,
  LargerCountryGame,
  MatchTermGame,
  OrderStepsGame,
  PriceGame,
  ShapesGame,
  SortPriceGame,
  TypeRaceGame,
  UnoGame,
  WheelGame,
} from "./ExtraGames";
import G2048Game from "./G2048Game";
import HanoiGame from "./HanoiGame";
import MemoryGame from "./MemoryGame";
import {
  FillBlankGame,
  FlagGuessGame,
  GuessCityGame,
  GuessDiscountGame,
  LandmarkGame,
  LessonQuizGame,
  QuickQGame,
  VocabGame,
} from "./QuizGames";
import SolitaireGame from "./SolitaireGame";
import SnakeGame from "./SnakeGame";
import SudokuGame from "./SudokuGame";
import XoGame from "./XoGame";

const PLAY: Record<PlayableGameSlug, () => JSX.Element> = {
  sudoku: SudokuGame,
  g2048: G2048Game,
  snake: SnakeGame,
  memory: MemoryGame,
  xo: XoGame,
  hanoi: HanoiGame,
  "lesson-quiz": LessonQuizGame,
  "guess-city": GuessCityGame,
  landmark: LandmarkGame,
  collector: CollectorGame,
  price: PriceGame,
  wheel: WheelGame,
  basket: BasketGame,
  hangword: HangwordGame,
  "flag-guess": FlagGuessGame,
  "farther-pair": FartherPairGame,
  "larger-country": LargerCountryGame,
  cheaper: CheaperGame,
  "sort-price": SortPriceGame,
  "guess-discount": GuessDiscountGame,
  "quick-q": QuickQGame,
  "order-steps": OrderStepsGame,
  "match-term": MatchTermGame,
  vocab: VocabGame,
  "fill-blank": FillBlankGame,
  solitaire: SolitaireGame,
  shapes: ShapesGame,
  typerace: TypeRaceGame,
  uno: UnoGame,
};

export default function GamePlayClient({ slug }: { slug: PlayableGameSlug }) {
  const Play = PLAY[slug];
  return (
    <GameAnalyticsScope slug={slug}>
      <div className="um-play-root">
        <Play />
      </div>
    </GameAnalyticsScope>
  );
}
