"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  formatPlayNumber,
  hanoiCanPlace,
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

  const restart = () => {
    setPegs(START.map((peg) => [...peg]));
    setSelected(null);
    setMoves(0);
    setDone(false);
    setScore(0);
    keepReadyOnReplay();
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
    const from = pegs[selected] ?? [];
    const to = pegs[pegIndex] ?? [];
    const disc = from[from.length - 1];
    if (disc == null || !hanoiCanPlace(to[to.length - 1], disc)) {
      sfx.no();
      setSelected(null);
      return;
    }
    const next = pegs.map((peg) => [...peg]);
    next[selected] = from.slice(0, -1);
    next[pegIndex] = [...to, disc];
    const nextMoves = moves + 1;
    setPegs(next);
    setMoves(nextMoves);
    setSelected(null);
    sfx.ok();
    if ((next[2] ?? []).length === DISCS) {
      const pts = Math.max(80, 500 - (nextMoves - 15) * 12);
      setScore(pts);
      writeBestIfHigher("hanoi", pts);
      setDone(true);
      sfx.win();
    }
  };

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
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("moves", moves)}
          detail={`${formatPlayNumber(locale, moves)} ${t("games.moves")}`}
          onAgain={restart}
        />
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
      <div className="um-play-hanoi um-play-board" dir="ltr">
        {pegs.map((stack, pegIndex) => (
          <button
            key={pegIndex}
            type="button"
            className={`um-play-peg${selected === pegIndex ? " sel" : ""}`}
            data-hanoi-peg="true"
            onClick={() => tap(pegIndex)}
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
