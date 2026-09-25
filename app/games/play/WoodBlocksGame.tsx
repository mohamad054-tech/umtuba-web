"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import { createPlaySfx, formatPlayNumber, verdictFromScore } from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { PlayHowTo, PlayPanel, PlayResult, PlayStat, usePlayHelp } from "./PlayChrome";

const SIZE = 8;
const TONES = ["#e7c48a", "#c9844a", "#8d5a32", "#f0d7a8", "#a86b45"];
const SHAPES: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 1], [1, 0], [1, 1], [1, 2]],
];

type Board = number[][];
type Piece = { cells: ReadonlyArray<readonly [number, number]>; tone: number };

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0));
}

function randomPiece(): Piece {
  const cells = SHAPES[Math.floor(Math.random() * SHAPES.length)]!;
  return { cells, tone: Math.floor(Math.random() * TONES.length) };
}

function deal(): Array<Piece | null> {
  return [randomPiece(), randomPiece(), randomPiece()];
}

function fits(board: Board, piece: Piece, row: number, col: number) {
  return piece.cells.every(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;
    return r >= 0 && c >= 0 && r < SIZE && c < SIZE && board[r]![c] === 0;
  });
}

function anyFit(board: Board, piece: Piece) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (fits(board, piece, row, col)) return true;
    }
  }
  return false;
}

function place(board: Board, piece: Piece, row: number, col: number) {
  const next = board.map((line) => line.slice());
  for (const [dr, dc] of piece.cells) next[row + dr]![col + dc] = piece.tone + 1;
  const fullRows: number[] = [];
  const fullCols: number[] = [];
  for (let i = 0; i < SIZE; i += 1) {
    if (next[i]!.every((cell) => cell > 0)) fullRows.push(i);
    if (next.every((line) => line[i]! > 0)) fullCols.push(i);
  }
  for (const r of fullRows) next[r] = Array.from({ length: SIZE }, () => 0);
  for (const c of fullCols) {
    for (let r = 0; r < SIZE; r += 1) next[r]![c] = 0;
  }
  const lines = fullRows.length + fullCols.length;
  const points = piece.cells.length * 10 + lines * 80 * lines;
  return { board: next, points };
}

export default function WoodBlocksGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const boardEl = useRef<HTMLDivElement | null>(null);
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [pieces, setPieces] = useState<Array<Piece | null>>(deal);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const [ghost, setGhost] = useState<{ index: number; row: number; col: number } | null>(null);
  const drag = useRef<{ index: number; grabRow: number; grabCol: number } | null>(null);
  const scoreRef = useRef(0);

  const end = (finalScore: number) => {
    const previous = readBest("wood-blocks") ?? 0;
    setIsBest(finalScore > previous);
    writeBestIfHigher("wood-blocks", finalScore);
    setOver(true);
    sfx.no();
  };

  const restart = () => {
    setBoard(emptyBoard());
    setPieces(deal());
    scoreRef.current = 0;
    setScore(0);
    setOver(false);
    setIsBest(false);
    setGhost(null);
    drag.current = null;
    help.keepReadyOnReplay();
  };

  const cellFromPointer = (clientX: number, clientY: number, grabRow: number, grabCol: number) => {
    const rect = boardEl.current?.getBoundingClientRect();
    if (!rect) return null;
    const size = rect.width / SIZE;
    const col = Math.floor((clientX - rect.left) / size) - grabCol;
    const row = Math.floor((clientY - rect.top) / size) - grabRow;
    return { row, col };
  };

  const onPieceDown = (index: number, event: React.PointerEvent<HTMLButtonElement>, grabRow: number, grabCol: number) => {
    if (over || !pieces[index]) return;
    drag.current = { index, grabRow, grabCol };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPieceMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    const piece = pieces[current.index];
    const at = cellFromPointer(event.clientX, event.clientY, current.grabRow, current.grabCol);
    if (!piece || !at || !fits(board, piece, at.row, at.col)) {
      setGhost(null);
      return;
    }
    setGhost({ index: current.index, row: at.row, col: at.col });
  };

  const onPieceUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    drag.current = null;
    setGhost(null);
    if (!current) return;
    const piece = pieces[current.index];
    const at = cellFromPointer(event.clientX, event.clientY, current.grabRow, current.grabCol);
    if (!piece || !at || !fits(board, piece, at.row, at.col)) return;
    const placed = place(board, piece, at.row, at.col);
    const nextPieces = pieces.slice();
    nextPieces[current.index] = null;
    const refilled = nextPieces.some(Boolean) ? nextPieces : deal();
    scoreRef.current += placed.points;
    setBoard(placed.board);
    setPieces(refilled);
    setScore(scoreRef.current);
    if (placed.points > piece.cells.length * 10) sfx.ok();
    else sfx.flip();
    const stuck = refilled.every((item) => !item || !anyFit(placed.board, item));
    if (stuck) end(scoreRef.current);
  };

  if (over) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("high", score)}
          detail={isBest ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : t("games.wood-blocks.title")}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
      helpOpen={help.helpOpen}
      onToggleHelp={help.toggleHelp}
    >
      <PlayHowTo
        open={help.helpOpen}
        lines={[t("games.wood-blocks.howTo1"), t("games.wood-blocks.howTo2"), t("games.wood-blocks.howTo3")]}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={help.dismissHelp}
      />
      {help.ready ? (
        <div className="um-wood" dir="ltr">
          <div ref={boardEl} className="um-wood-board um-lit-board">
            {board.map((line, row) =>
              line.map((cell, col) => {
                const preview = ghost?.index != null && pieces[ghost.index]?.cells.some(([dr, dc]) => ghost.row + dr === row && ghost.col + dc === col);
                const tone = preview ? TONES[pieces[ghost!.index]!.tone] : cell > 0 ? TONES[cell - 1] : undefined;
                return <span key={`${row}-${col}`} className={`um-wood-cell${tone ? " on" : ""}`} style={tone ? { background: tone } : undefined} />;
              }),
            )}
          </div>
          <div className="um-wood-tray">
            {pieces.map((piece, index) => (
              <button
                key={index}
                type="button"
                className="um-wood-piece"
                disabled={!piece}
                onPointerDown={(event) => {
                  const cell = (event.target as HTMLElement).dataset;
                  onPieceDown(index, event, Number(cell.r ?? 0), Number(cell.c ?? 0));
                }}
                onPointerMove={onPieceMove}
                onPointerUp={onPieceUp}
                onPointerCancel={() => {
                  drag.current = null;
                  setGhost(null);
                }}
              >
                {piece
                  ? Array.from({ length: 5 }, (_, row) =>
                      Array.from({ length: 5 }, (_, col) => {
                        const on = piece.cells.some(([dr, dc]) => dr === row && dc === col);
                        return (
                          <span
                            key={`${row}-${col}`}
                            data-r={row}
                            data-c={col}
                            className={`um-wood-bit${on ? " on" : ""}`}
                            style={on ? { background: TONES[piece.tone] } : undefined}
                          />
                        );
                      }),
                    )
                  : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </PlayPanel>
  );
}
