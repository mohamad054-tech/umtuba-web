"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  createPlayStopwatch,
  formatPlayClock,
  formatPlayNumber,
  sudokuCell,
  sudokuIsSolved,
  SUDOKU_PUZZLES,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { writeBestIfHigher } from "../../../lib/games/play/scores";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

function pickPuzzle() {
  return SUDOKU_PUZZLES[Math.floor(Math.random() * SUDOKU_PUZZLES.length)] ?? SUDOKU_PUZZLES[0];
}

function emptyNotes(): number[][] {
  return Array.from({ length: 81 }, () => []);
}

export default function SudokuGame() {
  const { t, locale } = useI18n();
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [pack, setPack] = useState(pickPuzzle);
  const [board, setBoard] = useState(() =>
    Array.from({ length: 81 }, (_, i) => sudokuCell(pack.puzzle, i))
  );
  const [notes, setNotes] = useState(emptyNotes);
  const [selected, setSelected] = useState(0);
  const [noteMode, setNoteMode] = useState(false);
  const [errors, setErrors] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const watchRef = useRef(createPlayStopwatch(setElapsed));

  const given = useMemo(
    () => Array.from({ length: 81 }, (_, i) => sudokuCell(pack.puzzle, i) !== 0),
    [pack]
  );

  const startFresh = useCallback(() => {
    const next = pickPuzzle();
    setPack(next);
    setBoard(Array.from({ length: 81 }, (_, i) => sudokuCell(next.puzzle, i)));
    setNotes(emptyNotes());
    setSelected(0);
    setNoteMode(false);
    setErrors([]);
    setHints(0);
    setDone(false);
    setScore(0);
    watchRef.current.stop();
    watchRef.current = createPlayStopwatch(setElapsed);
    if (ready) watchRef.current.start();
    keepReadyOnReplay();
  }, [keepReadyOnReplay, ready]);

  useEffect(() => {
    if (!ready) return;
    watchRef.current.start();
    return () => {
      watchRef.current.stop();
    };
  }, [ready]);

  const finish = useCallback(
    (nextBoard: number[]) => {
      if (!sudokuIsSolved(nextBoard, pack.solution)) return;
      const seconds = watchRef.current.stop();
      const pts = Math.max(120, 900 - seconds * 4 - hints * 80);
      setScore(pts);
      writeBestIfHigher("sudoku", pts);
      setDone(true);
      sfx.win();
    },
    [hints, pack.solution, sfx]
  );

  const place = useCallback(
    (value: number) => {
      if (!ready || done || given[selected]) return;
      if (noteMode) {
        if (value === 0) {
          setNotes((prev) => {
            const next = prev.map((row) => [...row]);
            next[selected] = [];
            return next;
          });
          return;
        }
        setNotes((prev) => {
          const next = prev.map((row) => [...row]);
          const current = new Set(next[selected]);
          if (current.has(value)) current.delete(value);
          else current.add(value);
          next[selected] = [...current].sort((a, b) => a - b);
          return next;
        });
        sfx.flip();
        return;
      }
      setBoard((prev) => {
        const next = [...prev];
        next[selected] = value;
        return next;
      });
      setNotes((prev) => {
        const next = prev.map((row) => [...row]);
        next[selected] = [];
        return next;
      });
      setErrors((prev) => prev.filter((i) => i !== selected));
      if (value) sfx.ok();
      const nextBoard = board.map((cell, i) => (i === selected ? value : cell));
      finish(nextBoard);
    },
    [board, done, finish, given, noteMode, ready, selected, sfx]
  );

  const hint = () => {
    if (done || given[selected]) return;
    const value = sudokuCell(pack.solution, selected);
    setHints((n) => n + 1);
    place(value);
  };

  const check = () => {
    const bad = board
      .map((value, i) => (value && value !== sudokuCell(pack.solution, i) ? i : -1))
      .filter((i) => i >= 0);
    setErrors(bad);
    if (bad.length) sfx.no();
    else sfx.ok();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (done || !ready) return;
      if (event.key >= "1" && event.key <= "9") {
        place(Number(event.key));
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        place(0);
        return;
      }
      if (event.key === "n" || event.key === "N") {
        setNoteMode((v) => !v);
        return;
      }
      const row = Math.floor(selected / 9);
      const col = selected % 9;
      if (event.key === "ArrowLeft") setSelected(row * 9 + Math.max(0, col - 1));
      if (event.key === "ArrowRight") setSelected(row * 9 + Math.min(8, col + 1));
      if (event.key === "ArrowUp") setSelected(Math.max(0, row - 1) * 9 + col);
      if (event.key === "ArrowDown") setSelected(Math.min(8, row + 1) * 9 + col);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, place, ready, selected]);

  if (done) {
    return (
      <PlayPanel
        stats={
          <>
            <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
            <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
          </>
        }
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        <PlayHowTo
          open={helpOpen}
          lines={[t("games.sudoku.howTo1"), t("games.sudoku.howTo2"), t("games.sudoku.howTo3")]}
          cta="gotIt"
          onDismiss={dismissHelp}
        />
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("high", score)}
          detail={`${t("games.solved")} · ${formatPlayClock(elapsed)}`}
          onAgain={startFresh}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
          <PlayStat label={t("games.hint")} value={formatPlayNumber(locale, hints)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={[t("games.sudoku.howTo1"), t("games.sudoku.howTo2"), t("games.sudoku.howTo3")]}
        cta={ready ? "gotIt" : "start"}
        onDismiss={dismissHelp}
      />
      <div className="um-play-sudoku um-play-board" dir="ltr" role="grid" aria-label={t("games.sudoku.title")}>
        {board.map((value, index) => (
          <button
            key={index}
            type="button"
            className={`${given[index] ? "given" : ""} ${selected === index ? "sel" : ""} ${errors.includes(index) ? "err" : ""}`}
            onClick={() => setSelected(index)}
            aria-label={value ? String(value) : t("games.emptyCell")}
          >
            {value ? (
              String(value)
            ) : notes[index]?.length ? (
              <span className="note">{notes[index].join(" ")}</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="um-play-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} type="button" className="um-play-btn" onClick={() => place(n)}>
            {String(n)}
          </button>
        ))}
        <button type="button" className="um-play-btn" onClick={() => place(0)}>
          {t("games.erase")}
        </button>
      </div>
      <div className="um-play-row">
        <button
          type="button"
          className={`um-play-btn${noteMode ? " on" : ""}`}
          onClick={() => setNoteMode((v) => !v)}
        >
          {t("games.notes")}
        </button>
        <button type="button" className="um-play-btn" onClick={hint}>
          {t("games.hint")}
        </button>
        <button type="button" className="um-play-btn" onClick={check}>
          {t("games.check")}
        </button>
        <button type="button" className="um-play-btn" onClick={startFresh}>
          {t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
