"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import { createPlaySfx, formatPlayNumber, verdictFromScore } from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { PlayHowTo, PlayPanel, PlayResult, PlayStat, usePlayHelp } from "./PlayChrome";

const COLS = 10;
const ROWS = 18;
const COLORS = ["#f0a93b", "#7ed9b8", "#6ea8ff", "#e07a6a", "#f3d7a1", "#c9844a", "#d7c4ff"];
const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];

type Board = number[][];
type Piece = { shape: number[][]; row: number; col: number; color: number };

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
}

function rotate(shape: number[][]) {
  const height = shape.length;
  const width = shape[0]!.length;
  return Array.from({ length: width }, (_, col) =>
    Array.from({ length: height }, (_, row) => shape[height - 1 - row]![col]!),
  );
}

function spawn(): Piece {
  const color = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[color]!.map((row) => row.slice()), row: 0, col: 3, color };
}

function fits(board: Board, shape: number[][], row: number, col: number) {
  return shape.every((line, dr) =>
    line.every((cell, dc) => {
      if (!cell) return true;
      const r = row + dr;
      const c = col + dc;
      return r >= 0 && c >= 0 && r < ROWS && c < COLS && board[r]![c] === 0;
    }),
  );
}

function lock(board: Board, piece: Piece) {
  const next = board.map((line) => line.slice());
  piece.shape.forEach((line, dr) => {
    line.forEach((cell, dc) => {
      if (cell) next[piece.row + dr]![piece.col + dc] = piece.color + 1;
    });
  });
  const kept = next.filter((line) => line.some((cell) => cell === 0));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array.from({ length: COLS }, () => 0));
  return { board: kept, cleared };
}

export default function FallingBlocksGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const boardRef = useRef<Board>(emptyBoard());
  const pieceRef = useRef<Piece>(spawn());
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const overRef = useRef(false);
  const [board, setBoard] = useState<Board>(boardRef.current);
  const [piece, setPiece] = useState<Piece>(pieceRef.current);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const pointer = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const paint = (nextBoard: Board, nextPiece: Piece) => {
    boardRef.current = nextBoard;
    pieceRef.current = nextPiece;
    setBoard(nextBoard);
    setPiece(nextPiece);
  };

  const finish = () => {
    if (overRef.current) return;
    overRef.current = true;
    const previous = readBest("falling-blocks") ?? 0;
    setIsBest(scoreRef.current > previous);
    writeBestIfHigher("falling-blocks", scoreRef.current);
    setScore(scoreRef.current);
    setOver(true);
    sfx.no();
  };

  const tryMove = (dRow: number, dCol: number) => {
    const current = pieceRef.current;
    if (!fits(boardRef.current, current.shape, current.row + dRow, current.col + dCol)) return false;
    paint(boardRef.current, { ...current, row: current.row + dRow, col: current.col + dCol });
    return true;
  };

  const turn = () => {
    const current = pieceRef.current;
    const shape = rotate(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (fits(boardRef.current, shape, current.row, current.col + kick)) {
        paint(boardRef.current, { ...current, shape, col: current.col + kick });
        sfx.flip();
        return;
      }
    }
  };

  const settle = () => {
    const locked = lock(boardRef.current, pieceRef.current);
    linesRef.current += locked.cleared;
    if (locked.cleared) {
      scoreRef.current += locked.cleared * 100 * locked.cleared;
      setScore(scoreRef.current);
      sfx.ok();
    }
    const next = spawn();
    if (!fits(locked.board, next.shape, next.row, next.col)) {
      paint(locked.board, next);
      finish();
      return;
    }
    paint(locked.board, next);
  };

  const hardDrop = () => {
    if (overRef.current) return;
    let steps = 0;
    while (tryMove(1, 0)) steps += 1;
    scoreRef.current += steps * 2;
    setScore(scoreRef.current);
    settle();
  };

  const restart = () => {
    const fresh = emptyBoard();
    const next = spawn();
    scoreRef.current = 0;
    linesRef.current = 0;
    overRef.current = false;
    paint(fresh, next);
    setScore(0);
    setOver(false);
    setIsBest(false);
    help.keepReadyOnReplay();
  };

  useEffect(() => {
    if (!help.ready || over) return;
    let timer = 0;
    const tick = () => {
      if (overRef.current || document.hidden) return;
      if (!tryMove(1, 0)) settle();
    };
    const delay = Math.max(180, 860 - linesRef.current * 35);
    timer = window.setInterval(tick, delay);
    return () => window.clearInterval(timer);
  }, [help.ready, over, score]);

  useEffect(() => {
    if (!help.ready || over) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        tryMove(0, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        tryMove(0, 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        turn();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        hardDrop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [help.ready, over]);

  const cells = board.map((line) => line.slice());
  piece.shape.forEach((line, dr) => {
    line.forEach((cell, dc) => {
      if (!cell) return;
      const row = piece.row + dr;
      const col = piece.col + dc;
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) cells[row]![col] = piece.color + 1;
    });
  });

  if (over) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("high", score)}
          detail={isBest ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : t("games.falling-blocks.title")}
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
        lines={[t("games.falling-blocks.howTo1"), t("games.falling-blocks.howTo2"), t("games.falling-blocks.howTo3")]}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={help.dismissHelp}
      />
      {help.ready ? (
        <div
          className="um-fall um-lit-board"
          dir="ltr"
          onPointerDown={(event) => {
            pointer.current = { x: event.clientX, y: event.clientY, moved: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = pointer.current;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
            start.moved = true;
            start.x = event.clientX;
            tryMove(0, dx > 0 ? 1 : -1);
          }}
          onPointerUp={(event) => {
            const start = pointer.current;
            pointer.current = null;
            if (!start) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (!start.moved && Math.hypot(dx, dy) < 18) {
              turn();
              return;
            }
            if (dy > 36 && dy > Math.abs(dx)) hardDrop();
          }}
        >
          {cells.map((line, row) =>
            line.map((cell, col) => (
              <span key={`${row}-${col}`} className={`um-fall-cell${cell ? " on" : ""}`} style={cell ? { background: COLORS[cell - 1] } : undefined} />
            )),
          )}
        </div>
      ) : null}
    </PlayPanel>
  );
}
