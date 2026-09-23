"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  canMove2048,
  create2048Board,
  createPlaySfx,
  empty2048Cells,
  formatPlayNumber,
  type Dir4,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";
import { useBoardPointer } from "./boardPointer";

type Tile = {
  id: number;
  value: number;
  row: number;
  col: number;
  born: boolean;
};

function keyToDir(key: string): Dir4 | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

function lineIndexes(direction: Dir4, band: number): number[] {
  if (direction === "left") return [0, 1, 2, 3].map((col) => band * 4 + col);
  if (direction === "right") return [3, 2, 1, 0].map((col) => band * 4 + col);
  if (direction === "up") return [0, 1, 2, 3].map((row) => row * 4 + band);
  return [3, 2, 1, 0].map((row) => row * 4 + band);
}

function indexOf(row: number, col: number): number {
  return row * 4 + col;
}

function tilesFromBoard(board: readonly number[], nextId: { n: number }): Tile[] {
  const tiles: Tile[] = [];
  board.forEach((value, index) => {
    if (!value) return;
    tiles.push({
      id: nextId.n,
      value,
      row: Math.floor(index / 4),
      col: index % 4,
      born: true,
    });
    nextId.n += 1;
  });
  return tiles;
}

function valuesOf(tiles: readonly Tile[]): number[] {
  const board = Array.from({ length: 16 }, () => 0);
  for (const tile of tiles) board[indexOf(tile.row, tile.col)] = tile.value;
  return board;
}

/** Slide tiles the same way the numbered board merges, so the motion matches the score. */
function slideTiles(tiles: readonly Tile[], direction: Dir4): { tiles: Tile[]; gained: number; moved: boolean } {
  const byIndex = new Map(tiles.map((tile) => [indexOf(tile.row, tile.col), tile]));
  const next: Tile[] = [];
  let gained = 0;
  for (let band = 0; band < 4; band += 1) {
    const indexes = lineIndexes(direction, band);
    const compact = indexes
      .map((index) => byIndex.get(index))
      .filter((tile): tile is Tile => Boolean(tile));
    const placed: Tile[] = [];
    for (let cursor = 0; cursor < compact.length; cursor += 1) {
      const current = compact[cursor]!;
      const upcoming = compact[cursor + 1];
      if (upcoming && current.value === upcoming.value) {
        placed.push({ ...current, value: current.value * 2, born: false });
        gained += current.value * 2;
        cursor += 1;
      } else {
        placed.push({ ...current, born: false });
      }
    }
    placed.forEach((tile, slot) => {
      const index = indexes[slot]!;
      next.push({
        ...tile,
        row: Math.floor(index / 4),
        col: index % 4,
      });
    });
  }
  const before = valuesOf(tiles).join(",");
  const after = valuesOf(next).join(",");
  return { tiles: next, gained, moved: before !== after };
}

function spawnTile(tiles: readonly Tile[], nextId: { n: number }): Tile[] {
  const board = valuesOf(tiles);
  const empty = empty2048Cells(board);
  if (empty.length === 0) return [...tiles];
  const slot = empty[Math.floor(Math.random() * empty.length)] ?? 0;
  return [
    ...tiles,
    {
      id: nextId.n++,
      value: Math.random() < 0.9 ? 2 : 4,
      row: Math.floor(slot / 4),
      col: slot % 4,
      born: true,
    },
  ];
}

export default function G2048Game() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const idRef = useRef({ n: 1 });
  const bestAtStart = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const [pop, setPop] = useState<number | null>(null);
  const scoreRef = useRef(0);
  const tilesRef = useRef(tiles);

  const deal = useCallback(() => {
    const board = create2048Board();
    const next = tilesFromBoard(board, idRef.current);
    tilesRef.current = next;
    setTiles(next);
    return next;
  }, []);

  const apply = useCallback(
    (direction: Dir4) => {
      if (over || !ready) return;
      const current = tilesRef.current;
      const slid = slideTiles(current, direction);
      if (!slid.moved) return;
      const spawned = spawnTile(slid.tiles, idRef.current);
      const board = valuesOf(spawned);
      tilesRef.current = spawned;
      const nextScore = scoreRef.current + slid.gained;
      scoreRef.current = nextScore;
      setTiles(spawned);
      setScore(nextScore);
      if (slid.gained) setPop(slid.gained);
      writeBestIfHigher("g2048", nextScore);
      if (board.some((value) => value >= 2048)) setWon(true);
      if (!canMove2048(board)) {
        setIsBest(nextScore > bestAtStart.current);
        setOver(true);
        sfx.no();
      } else if (slid.gained) {
        sfx.ok();
      } else {
        sfx.flip();
      }
    },
    [over, ready, sfx]
  );

  const begin = () => {
    if (!ready) {
      bestAtStart.current = readBest("g2048") ?? 0;
      scoreRef.current = 0;
      setScore(0);
      setOver(false);
      setWon(false);
      setIsBest(false);
      deal();
    }
    dismissHelp();
  };

  const restart = () => {
    bestAtStart.current = readBest("g2048") ?? 0;
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    setWon(false);
    setIsBest(false);
    setPop(null);
    deal();
    keepReadyOnReplay();
  };

  useEffect(() => {
    if (pop == null) return;
    const timer = window.setTimeout(() => setPop(null), 500);
    return () => window.clearTimeout(timer);
  }, [pop]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = keyToDir(event.key);
      if (!dir) return;
      event.preventDefault();
      apply(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply]);

  useBoardPointer(boardRef, { onSwipe: apply, swipeOnce: true }, ready && !over);

  const board = valuesOf(tiles);
  const highest = board.reduce((max, value) => Math.max(max, value), 0);
  const target = highest >= 2048 ? 2048 : Math.max(4, highest * 2);

  const howTo = (
    <PlayHowTo
      open={helpOpen}
      lines={[t("games.g2048.howTo1"), t("games.g2048.howTo2"), t("games.g2048.howTo3")]}
      cta={ready ? "gotIt" : "start"}
      onDismiss={begin}
    />
  );

  if (over) {
    return (
      <PlayPanel
        stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        {howTo}
        <div className={isBest ? "um-play-best" : "um-play-celebrate"}>
          <PlayResult
            score={score}
            verdictKey={won ? "games.youWin" : verdictFromScore("high", score)}
            detail={
              isBest
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : won
                  ? t("games.youWin")
                  : t("games.youLose")
            }
            onAgain={restart}
          />
        </div>
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <PlayStat label={t("games.target")} value={formatPlayNumber(locale, target)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      {howTo}
      {ready ? (
        <div
          ref={boardRef}
          className="um-g2048 um-play-board um-lit-board"
          dir="ltr"
          data-board-dir="ltr"
          data-highest={highest}
          data-target={target}
          role="grid"
          aria-label={t("games.g2048.title")}
        >
          <div className="um-g2048-pits" aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className={`um-g2048-tile v${tile.value}${tile.born ? " born" : ""}`}
              data-g2048-tile="true"
              data-row={tile.row}
              data-col={tile.col}
              data-val={tile.value}
              style={{ ["--c" as string]: tile.col, ["--r" as string]: tile.row }}
            >
              {formatPlayNumber(locale, tile.value)}
            </div>
          ))}
          {pop ? <span className="um-g2048-pop">+{formatPlayNumber(locale, pop)}</span> : null}
        </div>
      ) : null}
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={restart}>
          {t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
