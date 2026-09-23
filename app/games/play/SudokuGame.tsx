"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  createPlayStopwatch,
  formatPlayClock,
  formatPlayNumber,
  pickSudokuPuzzle,
  sudokuCell,
  sudokuIsSolved,
  SUDOKU_PUZZLES,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { writeBestIfHigher, readBest } from "../../../lib/games/play/scores";
import { useBoardScrollLock } from "./boardPointer";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

function firstEmpty(puzzle: string) {
  for (let index = 0; index < 81; index += 1) {
    if (sudokuCell(puzzle, index) === 0) return index;
  }
  return 0;
}

function digitFromKey(key: string): number | null {
  if (key >= "0" && key <= "9") return Number(key);
  const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(key);
  if (arabic >= 0) return arabic;
  const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(key);
  if (persian >= 0) return persian;
  return null;
}

function emptyNotes(): number[][] {
  return Array.from({ length: 81 }, () => []);
}

export default function SudokuGame() {
  const { t, locale } = useI18n();
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [pack, setPack] = useState<(typeof SUDOKU_PUZZLES)[number]>(SUDOKU_PUZZLES[0]);
  const [board, setBoard] = useState(() =>
    Array.from({ length: 81 }, (_, i) => sudokuCell(pack.puzzle, i))
  );
  const [notes, setNotes] = useState(emptyNotes);
  const [selected, setSelected] = useState(() => firstEmpty(pack.puzzle));
  const [noteMode, setNoteMode] = useState(false);
  const [errors, setErrors] = useState<number[]>([]);
  const [hints, setHints] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const watchRef = useRef(createPlayStopwatch(setElapsed));
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [isBest, setIsBest] = useState(false);

  const given = useMemo(
    () => Array.from({ length: 81 }, (_, i) => sudokuCell(pack.puzzle, i) !== 0),
    [pack]
  );

  const startFresh = useCallback(() => {
    const next = pickSudokuPuzzle(pack.puzzle);
    setPack(next);
    setBoard(Array.from({ length: 81 }, (_, i) => sudokuCell(next.puzzle, i)));
    setNotes(emptyNotes());
    setSelected(firstEmpty(next.puzzle));
    setNoteMode(false);
    setErrors([]);
    setHints(0);
    setDone(false);
    setScore(0);
    setIsBest(false);
    watchRef.current.stop();
    watchRef.current = createPlayStopwatch(setElapsed);
    if (ready) watchRef.current.start();
    else dismissHelp();
    keepReadyOnReplay();
  }, [dismissHelp, keepReadyOnReplay, pack.puzzle, ready]);

  useEffect(() => {
    if (!ready) return;
    watchRef.current.start();
    return () => {
      watchRef.current.stop();
    };
  }, [ready]);

  useBoardScrollLock(boardRef, ready && !done);

  const finish = useCallback(
    (nextBoard: number[]) => {
      if (!sudokuIsSolved(nextBoard, pack.solution)) return;
      const seconds = watchRef.current.stop();
      const previous = readBest("sudoku") ?? 0;
      const pts = Math.max(120, 900 - seconds * 4 - hints * 80);
      setScore(pts);
      setIsBest(pts > previous);
      writeBestIfHigher("sudoku", pts);
      setDone(true);
      sfx.win();
    },
    [hints, pack.solution, sfx]
  );

  const place = useCallback(
    (value: number, asValue = false) => {
      if (done) return;
      if (!ready) dismissHelp();
      if (given[selected]) return;
      if (noteMode && !asValue) {
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
    [board, dismissHelp, done, finish, given, noteMode, ready, selected, sfx]
  );

  const hint = () => {
    if (done || given[selected]) return;
    if (!ready) dismissHelp();
    const value = sudokuCell(pack.solution, selected);
    setHints((n) => n + 1);
    place(value, true);
  };

  const check = () => {
    if (!ready) dismissHelp();
    const bad = board
      .map((value, i) => (value && value !== sudokuCell(pack.solution, i) ? i : -1))
      .filter((i) => i >= 0);
    setErrors(bad);
    if (bad.length) sfx.no();
    else sfx.ok();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (done) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      const digit = digitFromKey(event.key);
      const erase = event.key === "Backspace" || event.key === "Delete" || digit === 0;
      const note = event.key === "n" || event.key === "N";
      const arrow = event.key.startsWith("Arrow");
      if ((digit == null || digit === 0) && !erase && !note && !arrow) return;
      if (!ready) dismissHelp();
      if (digit != null && digit >= 1) {
        place(digit);
        return;
      }
      if (erase) {
        place(0);
        return;
      }
      if (note) {
        setNoteMode((v) => !v);
        return;
      }
      event.preventDefault();
      const row = Math.floor(selected / 9);
      const col = selected % 9;
      if (event.key === "ArrowLeft") setSelected(row * 9 + Math.max(0, col - 1));
      if (event.key === "ArrowRight") setSelected(row * 9 + Math.min(8, col + 1));
      if (event.key === "ArrowUp") setSelected(Math.max(0, row - 1) * 9 + col);
      if (event.key === "ArrowDown") setSelected(Math.min(8, row + 1) * 9 + col);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissHelp, done, place, ready, selected]);

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
        <div className={isBest ? "um-play-best" : "um-play-celebrate"}>
          <PlayResult
            score={score}
            verdictKey={verdictFromScore("high", score)}
            detail={
              isBest
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : `${t("games.solved")} · ${formatPlayClock(elapsed)}`
            }
            onAgain={startFresh}
          />
        </div>
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
      <div
        ref={boardRef}
        className="um-play-sudoku um-play-board um-lit-board"
        dir="ltr"
        role="grid"
        aria-label={t("games.sudoku.title")}
      >
        {board.map((value, index) => (
          <button
            key={index}
            type="button"
            data-sudoku-cell="true"
            className={`${given[index] ? "given" : ""} ${selected === index ? "sel" : ""} ${errors.includes(index) ? "err" : ""}`}
            onClick={() => {
              if (!ready) dismissHelp();
              setSelected(index);
            }}
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
          onClick={() => {
            if (!ready) dismissHelp();
            setNoteMode((v) => !v);
          }}
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
