"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  createPlaySfx,
  formatPlayNumber,
  xoBestMove,
  xoWinner,
  type XoMark,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { writeBestIfHigher } from "../../../lib/games/play/scores";
import { PlayPanel, PlayResult, PlayStat } from "./PlayChrome";

const EMPTY: XoMark[] = ["", "", "", "", "", "", "", "", ""];

export default function XoGame() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [board, setBoard] = useState<XoMark[]>(EMPTY);
  const [over, setOver] = useState(false);
  const [line, setLine] = useState<number[]>([]);
  const [wins, setWins] = useState(0);
  const [draws, setDraws] = useState(0);
  const [losses, setLosses] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [turnLabel, setTurnLabel] = useState<TranslationKey>("games.yourTurn");

  const paintWin = (marks: XoMark[]) => {
    const result = xoWinner(marks);
    if (!result) {
      setTurnLabel("games.yourTurn");
      return false;
    }
    setOver(true);
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
    if (over || sessionDone || board[index]) return;
    const afterYou: XoMark[] = board.map((cell, i) => (i === index ? "X" : cell));
    setBoard(afterYou);
    sfx.flip();
    if (paintWin(afterYou)) return;
    const cpu = xoBestMove(afterYou, "O");
    if (cpu < 0) return;
    const afterCpu: XoMark[] = afterYou.map((cell, i) => (i === cpu ? "O" : cell));
    setBoard(afterCpu);
    paintWin(afterCpu);
  };

  const newRound = () => {
    const played = wins + draws + losses;
    if (played >= 5) {
      writeBestIfHigher("xo", score);
      setSessionDone(true);
      return;
    }
    setBoard(EMPTY);
    setOver(false);
    setLine([]);
    setTurnLabel("games.yourTurn");
  };

  const restart = () => {
    setBoard(EMPTY);
    setOver(false);
    setLine([]);
    setWins(0);
    setDraws(0);
    setLosses(0);
    setScore(0);
    setSessionDone(false);
    setTurnLabel("games.yourTurn");
  };

  if (sessionDone) {
    return (
      <PlayPanel
        stats={
          <>
            <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
            <PlayStat
              label={t("games.record")}
              value={`${formatPlayNumber(locale, wins)} · ${formatPlayNumber(locale, draws)} · ${formatPlayNumber(locale, losses)}`}
            />
          </>
        }
      >
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("high", score)}
          detail={`${formatPlayNumber(locale, wins)} ${t("games.wins")} · ${formatPlayNumber(locale, draws)} ${t("games.draws")} · ${formatPlayNumber(locale, losses)} ${t("games.losses")}`}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <PlayStat
            label={t("games.record")}
            value={`${formatPlayNumber(locale, wins)} · ${formatPlayNumber(locale, draws)} · ${formatPlayNumber(locale, losses)}`}
          />
        </>
      }
    >
      <div className="um-play-turn">{t(turnLabel)}</div>
      <div className="um-play-xo">
        {board.map((mark, index) => (
          <button
            key={index}
            type="button"
            className={`${mark === "X" ? "x" : mark === "O" ? "o" : ""}${line.includes(index) ? " win" : ""}`}
            onClick={() => play(index)}
            disabled={over || Boolean(mark)}
            aria-label={mark ? mark : t("games.emptyCell")}
          >
            {mark === "X" ? "✕" : mark === "O" ? "◯" : ""}
          </button>
        ))}
      </div>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={over ? newRound : restart}>
          {over ? t("games.xo.newRound") : t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
