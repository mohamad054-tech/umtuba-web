"use client";

import type { PlayableGameSlug } from "../../../lib/games/play/catalog";
import "./games-play.css";
import G2048Game from "./G2048Game";
import HanoiGame from "./HanoiGame";
import MemoryGame from "./MemoryGame";
import SnakeGame from "./SnakeGame";
import SudokuGame from "./SudokuGame";
import XoGame from "./XoGame";

export default function GamePlayClient({ slug }: { slug: PlayableGameSlug }) {
  return (
    <div className="um-play-root">
      {slug === "sudoku" ? <SudokuGame /> : null}
      {slug === "g2048" ? <G2048Game /> : null}
      {slug === "snake" ? <SnakeGame /> : null}
      {slug === "memory" ? <MemoryGame /> : null}
      {slug === "xo" ? <XoGame /> : null}
      {slug === "hanoi" ? <HanoiGame /> : null}
    </div>
  );
}
