"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  createPlaySfx,
  formatPlayNumber,
  xoCpuMove,
  xoWinner,
  type XoMark,
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

const EMPTY: XoMark[] = ["", "", "", "", "", "", "", "", ""];

function MarkX() {
  return (
    <svg viewBox="0 0 100 100" className="um-xo-mark x" aria-hidden="true">
      <path d="M24 24 L76 76 M76 24 L24 76" />
    </svg>
  );
}

function MarkO() {
  return (
    <svg viewBox="0 0 100 100" className="um-xo-mark o" aria-hidden="true">
      <circle cx="50" cy="50" r="26" />
    </svg>
  );
}

export default function XoGame() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const [board, setBoard] = useState<XoMark[]>(EMPTY);
  const [over, setOver] = useState(false);
  const [line, setLine] = useState<number[]>([]);
  const [wins, setWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [losses, setLosses] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [turnLabel, setTurnLabel] = useState<TranslationKey>("games.yourTurn");
  const busyRef = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const boardMarks = useRef<XoMark[]>(EMPTY);
  const [isBest, setIsBest] = useState(false);
  useBoardScrollLock(boardRef, ready && !sessionDone);

  const paintWin = (marks: XoMark[]) => {
    const result = xoWinner(marks);
    if (!result) {
      setTurnLabel("games.yourTurn");
      busyRef.current = false;
      return false;
    }
    setOver(true);
    busyRef.current = false;
    if (result.line) setLine([...result.line]);
    const played = wins + draws + losses + 1;
    if (played >= 5) {
      window.setTimeout(() => setSessionDone(true), 700);
    }
    if (result.mark === "X") {
      setWins((n) => n + 1);
      setScore((n) => {
        const next = n + 300;
        writeBestIfHigher("xo", next);
        return next;
      });
      setTurnLabel("games.youWin");
      sfx.win();
    } else if (result.mark === "O") {
      setLosses((n) => n + 1);
      setTurnLabel("games.youLose");
      sfx.no();
    } else {
      setDraws((n) => n + 1);
      setScore((n) => {
        const next = n + 100;
        writeBestIfHigher("xo", next);
        return next;
      });
      setTurnLabel("games.draw");
      sfx.ok();
    }
    return true;
  };

  const play = (index: number) => {
    if (over || sessionDone || busyRef.current || boardMarks.current[index]) {
      return;
    }
    if (!ready) dismissHelp();
    busyRef.current = true;
    const afterYou: XoMark[] = boardMarks.current.map((cell, i) =>
      i === index ? "X" : cell
    );
    boardMarks.current = afterYou;
    setBoard(afterYou);
    sfx.flip();
    if (paintWin(afterYou)) return;
    const cpu = xoCpuMove(afterYou);
    if (cpu < 0) {
      busyRef.current = false;
      return;
    }
    const afterCpu: XoMark[] = afterYou.map((cell, i) => (i === cpu ? "O" : cell));
    boardMarks.current = afterCpu;
    setBoard(afterCpu);
    paintWin(afterCpu);
  };

  const newRound = () => {
    const played = wins + draws + losses;
    if (played >= 5) {
      const previous = readBest("xo") ?? 0;
      writeBestIfHigher("xo", score);
      setIsBest(score > previous);
      setSessionDone(true);
      return;
    }
    boardMarks.current = EMPTY;
    busyRef.current = false;
    setBoard(EMPTY);
    setOver(false);
    setLine([]);
    setTurnLabel("games.yourTurn");
    keepReadyOnReplay();
  };

  const restart = () => {
    boardMarks.current = EMPTY;
    busyRef.current = false;
    setBoard(EMPTY);
    setOver(false);
    setLine([]);
    setWins(0);
    setDraws(0);
    setLosses(0);
    setScore(0);
    setSessionDone(false);
    setIsBest(false);
    setTurnLabel("games.yourTurn");
    keepReadyOnReplay();
  };

  const howTo = (
    <PlayHowTo
      open={helpOpen}
      lines={[t("games.xo.howTo1"), t("games.xo.howTo2"), t("games.xo.howTo3")]}
      cta={ready ? "gotIt" : "start"}
      onDismiss={dismissHelp}
    />
  );

  if (sessionDone) {
    return (
      <PlayPanel
        fill
        stats={
          <>
            <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
            <PlayStat
              label={t("games.record")}
              value={`${formatPlayNumber(locale, wins)} · ${formatPlayNumber(locale, draws)} · ${formatPlayNumber(locale, losses)}`}
            />
          </>
        }
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        {howTo}
        <div className={isBest ? "um-play-best" : "um-play-celebrate"}>
          <PlayResult
            score={score}
            verdictKey={verdictFromScore("high", score)}
            detail={
              isBest
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : `${formatPlayNumber(locale, wins)} ${t("games.wins")} · ${formatPlayNumber(locale, draws)} ${t("games.draws")} · ${formatPlayNumber(locale, losses)} ${t("games.losses")}`
            }
            onAgain={restart}
          />
        </div>
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      fill
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <PlayStat
            label={t("games.record")}
            value={`${formatPlayNumber(locale, wins)} · ${formatPlayNumber(locale, draws)} · ${formatPlayNumber(locale, losses)}`}
          />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      {howTo}
      <div className="um-play-turn">{t(turnLabel)}</div>
      <div className="um-fit-slot">
      <div ref={boardRef} className="um-play-xo um-play-board um-lit-board" dir="ltr" data-board-dir="ltr">
        {board.map((mark, index) => (
          <button
            key={index}
            type="button"
            data-xo-index={index}
            data-xo-cell="true"
            className={`${mark === "X" ? "x" : mark === "O" ? "o" : ""}${line.includes(index) ? " win" : ""}`}
            onClick={() => play(index)}
            disabled={over || Boolean(mark)}
            aria-label={mark ? mark : t("games.emptyCell")}
          >
            {mark === "X" ? <MarkX /> : mark === "O" ? <MarkO /> : null}
          </button>
        ))}
        {line.length === 3 ? (
          <svg className="um-xo-line" viewBox="0 0 3 3" aria-hidden="true">
            <line
              x1={(line[0]! % 3) + 0.5}
              y1={Math.floor(line[0]! / 3) + 0.5}
              x2={(line[2]! % 3) + 0.5}
              y2={Math.floor(line[2]! / 3) + 0.5}
            />
          </svg>
        ) : null}
      </div>
      </div>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={over ? newRound : restart}>
          {over ? t("games.xo.newRound") : t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
