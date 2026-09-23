"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  formatPlayNumber,
  hanoiCanPlace,
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

const DISCS = 4;
const START: number[][] = [[3, 2, 1, 0], [], []];

export default function HanoiGame() {
  const { t, locale } = useI18n();
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [pegs, setPegs] = useState<number[][]>(START.map((peg) => [...peg]));
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [isBest, setIsBest] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; peg: number } | null>(null);
  const skipClick = useRef(false);

  const restart = () => {
    setPegs(START.map((peg) => [...peg]));
    setSelected(null);
    setMoves(0);
    setDone(false);
    setScore(0);
    setIsBest(false);
    keepReadyOnReplay();
  };

  const moveDisc = (fromIndex: number, pegIndex: number) => {
    if (!ready || done || fromIndex === pegIndex) return;
    const from = pegs[fromIndex] ?? [];
    const to = pegs[pegIndex] ?? [];
    const disc = from[from.length - 1];
    if (disc == null || !hanoiCanPlace(to[to.length - 1], disc)) {
      sfx.no();
      setSelected(null);
      return;
    }
    const next = pegs.map((peg) => [...peg]);
    next[fromIndex] = from.slice(0, -1);
    next[pegIndex] = [...to, disc];
    const nextMoves = moves + 1;
    setPegs(next);
    setMoves(nextMoves);
    setSelected(null);
    sfx.ok();
    if ((next[2] ?? []).length === DISCS) {
      const pts = Math.max(80, 500 - (nextMoves - 15) * 12);
      const previous = readBest("hanoi") ?? 0;
      setScore(pts);
      setIsBest(pts > previous);
      writeBestIfHigher("hanoi", pts);
      setDone(true);
      sfx.win();
    }
  };

  const tap = (pegIndex: number) => {
    if (!ready || done) return;
    if (selected == null) {
      if ((pegs[pegIndex] ?? []).length === 0) return;
      setSelected(pegIndex);
      sfx.flip();
      return;
    }
    if (selected === pegIndex) {
      setSelected(null);
      return;
    }
    moveDisc(selected, pegIndex);
  };

  const moveRef = useRef(moveDisc);
  useEffect(() => {
    moveRef.current = moveDisc;
  });

  useBoardScrollLock(boardRef, ready && !done);

  useEffect(() => {
    const element = boardRef.current;
    if (!element || !ready || done) return;
    const onDown = (event: PointerEvent) => {
      const peg = (event.target as HTMLElement | null)?.closest("[data-hanoi-peg]");
      if (!peg || !element.contains(peg)) return;
      const index = [...element.querySelectorAll("[data-hanoi-peg]")].indexOf(peg);
      if (index < 0) return;
      dragRef.current = { x: event.clientX, y: event.clientY, peg: index };
    };
    const onUp = (event: PointerEvent) => {
      const start = dragRef.current;
      dragRef.current = null;
      if (!start) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10) return;
      const hit = document.elementFromPoint(event.clientX, event.clientY);
      const peg = hit?.closest("[data-hanoi-peg]");
      if (!peg || !element.contains(peg)) return;
      const index = [...element.querySelectorAll("[data-hanoi-peg]")].indexOf(peg);
      if (index < 0 || index === start.peg) return;
      skipClick.current = true;
      moveRef.current(start.peg, index);
    };
    element.addEventListener("pointerdown", onDown);
    element.addEventListener("pointerup", onUp);
    return () => {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointerup", onUp);
    };
  }, [done, ready]);

  if (done) {
    return (
      <PlayPanel
        stats={<PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />}
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        <PlayHowTo
          open={helpOpen}
          lines={[t("games.hanoi.howTo1"), t("games.hanoi.howTo2"), t("games.hanoi.howTo3")]}
          cta="gotIt"
          onDismiss={dismissHelp}
        />
        <div className={isBest ? "um-play-best" : "um-play-celebrate"}>
          <PlayResult
            score={score}
            verdictKey={verdictFromScore("moves", moves)}
            detail={
              isBest
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : `${formatPlayNumber(locale, moves)} ${t("games.moves")}`
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
          <PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />
          <PlayStat label={t("games.discs")} value={formatPlayNumber(locale, DISCS)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={[t("games.hanoi.howTo1"), t("games.hanoi.howTo2"), t("games.hanoi.howTo3")]}
        cta={ready ? "gotIt" : "start"}
        onDismiss={dismissHelp}
      />
      <div ref={boardRef} className="um-play-hanoi um-play-board um-lit-board" dir="ltr">
        {pegs.map((stack, pegIndex) => (
          <button
            key={pegIndex}
            type="button"
            className={`um-play-peg${selected === pegIndex ? " sel" : ""}`}
            data-hanoi-peg="true"
            onClick={() => {
              if (skipClick.current) {
                skipClick.current = false;
                return;
              }
              tap(pegIndex);
            }}
            aria-label={t("games.peg", { values: { n: pegIndex + 1 } })}
          >
            {stack.map((disc) => (
              <span
                key={disc}
                className="um-play-disc"
                data-hanoi-disc="true"
                style={{ width: `${36 + (3 - disc) * 16}%` }}
              >
                {formatPlayNumber(locale, disc + 1)}
              </span>
            ))}
          </button>
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
