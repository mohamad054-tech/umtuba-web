"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";
import { useI18n } from "../../components/i18n";
import {
  canMove2048,
  create2048Board,
  createPlaySfx,
  formatPlayNumber,
  move2048,
  spawn2048Tile,
  type Dir4,
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

function keyToDir(key: string): Dir4 | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

export default function G2048Game() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const [board, setBoard] = useState(() => Array.from({ length: 16 }, () => 0));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const apply = useCallback(
    (direction: Dir4) => {
      if (over || !ready) return;
      setBoard((current) => {
        const moved = move2048(current, direction);
        if (!moved.moved) return current;
        const next = spawn2048Tile(moved.board);
        const nextScore = scoreRef.current + moved.gained;
        scoreRef.current = nextScore;
        setScore(nextScore);
        setBest(writeBestIfHigher("g2048", nextScore));
        if (next.some((n) => n >= 2048)) setWon(true);
        if (!canMove2048(next)) {
          setOver(true);
          sfx.no();
        } else if (moved.gained) {
          sfx.ok();
        } else {
          sfx.flip();
        }
        return next;
      });
    },
    [over, ready, sfx]
  );

  const begin = () => {
    if (!ready) setBoard(create2048Board());
    dismissHelp();
  };

  const restart = () => {
    setBoard(create2048Board());
    setScore(0);
    setOver(false);
    setWon(false);
    keepReadyOnReplay();
  };

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

  const onTouchStart = (event: TouchEvent) => {
    const point = event.changedTouches[0];
    if (!point) return;
    touch.current = { x: point.clientX, y: point.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const point = event.changedTouches[0];
    touch.current = null;
    if (!start || !point) return;
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) apply(dx > 0 ? "right" : "left");
    else apply(dy > 0 ? "down" : "up");
  };

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
        stats={
          <>
            <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
            <PlayStat
              label={t("games.localBest").split(":")[0] ?? t("games.score")}
              value={formatPlayNumber(locale, best)}
            />
          </>
        }
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        {howTo}
        <PlayResult
          score={score}
          verdictKey={won ? "games.youWin" : verdictFromScore("high", score)}
          detail={won ? t("games.youWin") : t("games.youLose")}
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
          <PlayStat label={t("games.target")} value={formatPlayNumber(locale, target)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      {howTo}
      <div
        className="um-play-g2048 um-play-board"
        dir="ltr"
        data-board-dir="ltr"
        data-highest={highest}
        data-target={target}
        role="grid"
        aria-label={t("games.g2048.title")}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {board.map((value, index) => (
          <div
            key={index}
            className={`um-play-t2048${value ? ` v${value}` : ""}`}
            data-row={Math.floor(index / 4)}
            data-col={index % 4}
            data-val={value}
          >
            {value ? formatPlayNumber(locale, value) : ""}
          </div>
        ))}
      </div>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={restart}>
          {t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
